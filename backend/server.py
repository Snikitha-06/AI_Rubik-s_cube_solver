"""
Flask API server for the Rubik's Cube Solver.
Endpoints: scramble, solve, detect colors, validate state, health.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from cube_solver import generate_scramble, solve, validate_state, create_solved_state, apply_move
from color_detection import detect_face_colors

import cv2
import numpy as np
import base64

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), '../frontend/dist'),
    static_url_path='/'
)
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')


@app.route('/api/scramble', methods=['GET'])
def api_scramble():
    """Generate a random scramble and return the resulting state."""
    size = request.args.get('size', 3, type=int)
    length = request.args.get('length', 20 + (size-3)*10, type=int)
    scramble = generate_scramble(size, length)
    
    # Compute resulting state
    state = create_solved_state(size)
    for move in scramble:
        state = apply_move(state, move, size)
        
    return jsonify({'scramble': scramble, 'state': state})


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
    data = request.get_json(silent=True)
    if not data or 'state' not in data:
        return jsonify({'error': 'Missing "state" in request body'}), 400

    color_state = data['state']
    size = int(len(color_state.get('U', [])) ** 0.5)
    history = data.get('history', [])

    # Validate first
    valid, msg, details = validate_state(color_state)
    if not valid:
        return jsonify({'error': msg, 'counts': details.get('counts', {})}), 400

    try:
        solution = solve(color_state, size, history)
        return jsonify({'solution': solution, 'length': len(solution)})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/detect', methods=['POST'])
def api_detect():
    """
    Detect sticker colours from a camera snapshot.
    
    Body JSON:
    {
      "image": "<base64-encoded JPEG>"
    }
    
    Returns:
    {
      "colors": ["red", "white", ...],  // 9 colors in reading order
      "debug": {                         // diagnostic info
        "hsv_medians": [[h,s,v], ...],   // median HSV per cell
        "rgb_medians": [[r,g,b], ...]    // median RGB per cell
      }
    }
    """
    data = request.get_json(silent=True)
    if not data or 'image' not in data:
        return jsonify({'error': 'Missing "image" in request body'}), 400

    size = data.get('size', 3)

    try:
        # Decode image
        img_bytes = base64.b64decode(data['image'])
        img_array = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Could not decode image'}), 400

        h, w = frame.shape[:2]
        print(f"[DETECT] Image size: {w}x{h}, size: {size}")

        # Run detection
        colors = detect_face_colors(data['image'], size)
        print(f"[DETECT] Colors: {colors}")

        # Also collect debug info for diagnostics
        debug_info = _get_debug_info(frame, size)

        return jsonify({
            'colors': colors,
            'debug': debug_info,
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400


def _get_debug_info(frame, N=3):
    """Extract diagnostic information from the frame for debugging."""
    h, w = frame.shape[:2]
    denoised = cv2.bilateralFilter(frame, 9, 75, 75)
    smoothed = cv2.GaussianBlur(denoised, (5, 5), 0)
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV)

    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)
    cell_w = (w - 2 * pad_x) / N
    cell_h = (h - 2 * pad_y) / N

    hsv_medians = []
    rgb_medians = []

    for row in range(N):
        for col in range(N):
            cx = int(pad_x + (col + 0.5) * cell_w)
            cy = int(pad_y + (row + 0.5) * cell_h)
            radius = int(min(cell_w, cell_h) * 0.25)

            y1, y2 = max(0, cy - radius), min(h, cy + radius)
            x1, x2 = max(0, cx - radius), min(w, cx + radius)

            hsv_roi = hsv[y1:y2, x1:x2]
            bgr_roi = smoothed[y1:y2, x1:x2]

            h_med = float(np.median(hsv_roi[:, :, 0]))
            s_med = float(np.median(hsv_roi[:, :, 1]))
            v_med = float(np.median(hsv_roi[:, :, 2]))

            b_med = float(np.median(bgr_roi[:, :, 0]))
            g_med = float(np.median(bgr_roi[:, :, 1]))
            r_med = float(np.median(bgr_roi[:, :, 2]))

            hsv_medians.append([round(h_med), round(s_med), round(v_med)])
            rgb_medians.append([round(r_med), round(g_med), round(b_med)])

    return {
        'hsv_medians': hsv_medians,
        'rgb_medians': rgb_medians,
        'image_size': [w, h],
    }


@app.route('/api/validate', methods=['POST'])
def api_validate():
    """Validate a cube colour state."""
    data = request.get_json(silent=True)
    if not data or 'state' not in data:
        return jsonify({'error': 'Missing "state" in request body'}), 400

    valid, msg, details = validate_state(data['state'])
    return jsonify({'valid': valid, 'message': msg, 'counts': details.get('counts', {})})


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    print("=" * 60)
    print("  Rubik's Cube Solver API Server")
    print("  Detection: Multi-strategy voting (HSV + LAB + RGB)")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
