"""
Flask API server for the Rubik's Cube Solver.
Endpoints: scramble, solve, detect colors, validate state, health.
"""

import os
# Import Flask framework and request/response utility classes
from flask import Flask, request, jsonify
# Import CORS extension to allow cross-origin resource sharing
from flask_cors import CORS
# Import cube manipulation and solving helper functions
from cube_solver import generate_scramble, solve, validate_state, create_solved_state, apply_move
# Import OpenCV-based face color detection utility
from color_detection import detect_face_colors

# Import OpenCV for computer vision processes
import cv2
# Import NumPy for array/matrix manipulations
import numpy as np
# Import base64 for decoding image payloads
import base64

# Initialize Flask application with static assets folder pointing to the frontend production build
app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '../frontend/dist'),
    static_url_path='/'
)
# Enable Cross-Origin Resource Sharing (CORS) for all routes to support API requests from dev servers
CORS(app)

# Default route: serve the main index.html file from the compiled frontend
@app.route('/')
def index():
    # Send the main HTML file to bootstrap the React frontend application
    return app.send_static_file('index.html')


# Route to generate a random scramble sequence for a given cube size
@app.route('/api/scramble', methods=['GET'])
def api_scramble():
    """Generate a random scramble and return the resulting state."""
    # Retrieve 'size' query parameter (defaults to 3 for standard 3x3x3 cube)
    size = request.args.get('size', 3, type=int)
    # Retrieve 'length' query parameter (defaults based on cube size formula)
    length = request.args.get('length', 20 + (size-3)*10, type=int)
    # Generate the random sequence of face rotations using solver utility
    scramble = generate_scramble(size, length)
    
    # Initialize a solved cube state representation of the specified size
    state = create_solved_state(size)
    # Sequentially apply each scramble move to compute the final scrambled color layout
    for move in scramble:
        state = apply_move(state, move, size)
        
    # Return the scramble sequence and the final state in JSON format
    return jsonify({'scramble': scramble, 'state': state})


# Route to solve the cube given a specific colors layout configuration
@app.route('/api/solve', methods=['POST'])
def api_solve():
    """
    Solve the cube from a colour state.
    
    Body JSON:
    {
      "state": {
        "U": ["white","white",...],  // 9 colours per face
        "R": [...], "F": [...], "D": [...], "L": [...], "B": [...]
      }
    }
    """
    # Parse the request body as JSON
    data = request.get_json(silent=True)
    # Return bad request error if no payload or missing 'state' dictionary
    if not data or 'state' not in data:
        return jsonify({'error': 'Missing "state" in request body'}), 400

    # Extract the dictionary representing colors on all six faces of the cube
    color_state = data['state']
    # Calculate the cube size (N) from the square root of the number of stickers on one face (e.g., sqrt(9) = 3)
    size = int(len(color_state.get('U', [])) ** 0.5)
    # Extract the history of moves applied so far (can be used for inverting a scramble)
    history = data.get('history', [])

    # Validate the cube state to ensure color counts match a physical cube
    valid, msg, details = validate_state(color_state)
    # Return error message and sticker count statistics if validation fails
    if not valid:
        return jsonify({'error': msg, 'counts': details.get('counts', {})}), 400

    try:
        # Run the Rubik's cube solver algorithm to find a solution sequence of moves
        solution = solve(color_state, size, history)
        # Return the solution sequence and total move count
        return jsonify({'solution': solution, 'length': len(solution)})
    except ValueError as e:
        # Return error if the solver runs into an unsolvable cube configuration state
        return jsonify({'error': str(e)}), 400


# Route to detect colors on a scanned face from a base64-encoded snapshot image
@app.route('/api/detect', methods=['POST'])
def api_detect():
    """
    Detect sticker colours from a camera snapshot.
    
    Body JSON:
    {
      "image": "<base64-encoded JPEG>"
    }
    """
    # Parse incoming request body as JSON
    data = request.get_json(silent=True)
    # Return error if no payload or image payload is missing
    if not data or 'image' not in data:
        return jsonify({'error': 'Missing "image" in request body'}), 400

    # Retrieve cube size (defaults to 3)
    size = data.get('size', 3)

    try:
        # Convert base64 string back into binary byte stream
        img_bytes = base64.b64decode(data['image'])
        # Convert the byte stream into a NumPy uint8 array
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        # Decode the image data into a BGR image matrix using OpenCV
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        # Return error if decoding failed or image format is invalid
        if frame is None:
            return jsonify({'error': 'Could not decode image'}), 400

        # Retrieve image height and width for logging purposes
        h, w = frame.shape[:2]
        print(f"[DETECT] Image size: {w}x{h}, size: {size}")

        # Run the robust multi-strategy color detection algorithm to classify grid stickers
        colors = detect_face_colors(data['image'], size)
        print(f"[DETECT] Colors: {colors}")

        # Compute median colors and diagnostics to assist user UI alignment debugging
        debug_info = _get_debug_info(frame, size)

        # Return detected colors array and the debug diagnostics
        return jsonify({
            'colors': colors,
            'debug': debug_info,
        })
    except Exception as e:
        # Log stack trace of any unexpected exceptions
        import traceback
        traceback.print_exc()
        # Return error message to client
        return jsonify({'error': str(e)}), 400


# Internal helper function to collect color median statistics for debugging
def _get_debug_info(frame, N=3):
    """Extract diagnostic information from the frame for debugging."""
    # Retrieve frame height and width
    h, w = frame.shape[:2]
    # Apply bilateral filter to smooth textures while keeping the edges of stickers crisp
    denoised = cv2.bilateralFilter(frame, 9, 75, 75)
    # Apply standard Gaussian blur to remove high-frequency camera sensor noise
    smoothed = cv2.GaussianBlur(denoised, (5, 5), 0)
    # Convert BGR image color space to HSV (Hue, Saturation, Value) for range analysis
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV)

    # Calculate padding from image edges to avoid outside background (15% padding)
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)
    # Calculate cell dimensions for the N x N grid
    cell_w = (w - 2 * pad_x) / N
    cell_h = (h - 2 * pad_y) / N

    # Lists to store the median values for HSV and RGB color channels per cell
    hsv_medians = []
    rgb_medians = []

    # Iterate row-by-row and column-by-column through each grid cell
    for row in range(N):
        for col in range(N):
            # Locate the coordinates of the center point of the current cell
            cx = int(pad_x + (col + 0.5) * cell_w)
            cy = int(pad_y + (row + 0.5) * cell_h)
            # Define region of interest (ROI) radius (25% of cell size)
            radius = int(min(cell_w, cell_h) * 0.25)

            # Define horizontal and vertical boundary slices of the ROI
            y1, y2 = max(0, cy - radius), min(h, cy + radius)
            x1, x2 = max(0, cx - radius), min(w, cx + radius)

            # Crop the HSV and BGR representations of the ROI
            hsv_roi = hsv[y1:y2, x1:x2]
            bgr_roi = smoothed[y1:y2, x1:x2]

            # Compute median value of Hue, Saturation, and Value components inside the ROI
            h_med = float(np.median(hsv_roi[:, :, 0]))
            s_med = float(np.median(hsv_roi[:, :, 1]))
            v_med = float(np.median(hsv_roi[:, :, 2]))

            # Compute median value of Blue, Green, and Red channels (reversing BGR to RGB)
            b_med = float(np.median(bgr_roi[:, :, 0]))
            g_med = float(np.median(bgr_roi[:, :, 1]))
            r_med = float(np.median(bgr_roi[:, :, 2]))

            # Append the medians rounded to nearest integer to the respective lists
            hsv_medians.append([round(h_med), round(s_med), round(v_med)])
            rgb_medians.append([round(r_med), round(g_med), round(b_med)])

    # Return structured dict containing color analysis metrics
    return {
        'hsv_medians': hsv_medians,
        'rgb_medians': rgb_medians,
        'image_size': [w, h],
    }


# Route to validate the current user-entered color layout
@app.route('/api/validate', methods=['POST'])
def api_validate():
    """Validate a cube colour state."""
    # Parse the input JSON request body
    data = request.get_json(silent=True)
    # Return bad request error if no state field is present
    if not data or 'state' not in data:
        return jsonify({'error': 'Missing "state" in request body'}), 400

    # Call validation checks (checks if there are exactly N*N stickers of each of the 6 colors)
    valid, msg, details = validate_state(data['state'])
    # Return response indicating whether the cube config is valid or details of error
    return jsonify({'valid': valid, 'message': msg, 'counts': details.get('counts', {})})


# Basic system healthcheck route
@app.route('/api/health', methods=['GET'])
def health():
    # Return simple status confirmation
    return jsonify({'status': 'ok'})


# Main entry point of the script: run the Flask server when executed directly
if __name__ == '__main__':
    # Print welcome banners and API operational details to terminal
    print("=" * 60)
    print("  Rubik's Cube Solver API Server")
    print("  Detection: Multi-strategy voting (HSV + LAB + RGB)")
    print("=" * 60)
    # Start server listening on all local network interfaces on port 5000 in debug mode
    app.run(debug=True, host='0.0.0.0', port=5000)
