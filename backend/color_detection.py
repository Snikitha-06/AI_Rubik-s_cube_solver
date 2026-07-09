"""
Robust multi-strategy color detection for Rubik's Cube face scanning.

Uses a voting system combining HSV, LAB distance, and RGB heuristics
for reliable classification across different lighting conditions
(indoor fluorescent, outdoor daylight, warm incandescent, phone cameras).

Pipeline:
  1. Light bilateral filtering (preserve edges, reduce noise)
  2. Adaptive white-balance (only when frame isn't dominated by one color)
  3. Center-weighted 3×3 grid sampling with generous ROI
  4. Multi-strategy voting: HSV ranges + LAB distance + RGB ratios
  5. Post-processing: sanity checks and tie-breaking
"""

# Import OpenCV library for all image processing routines
import cv2
# Import NumPy for fast matrix calculations
import numpy as np
# Import base64 to decode base64-encoded image strings
import base64

# ── LAB reference colors (from a standard Rubik's cube under neutral light) ──
# These are used as distance-matching targets.
REFERENCE_LAB = {}

# Standard BGR sample values for target colors under varying normal lighting
_REF_BGR = {
    'white':  [(235, 235, 235), (220, 220, 225), (200, 200, 205)],
    'yellow': [(30, 220, 240), (20, 200, 230), (50, 230, 250)],
    'red':    [(40, 40, 200), (30, 30, 180), (20, 20, 160)],
    'orange': [(30, 120, 240), (20, 100, 220), (40, 140, 255)],
    'green':  [(80, 180, 50), (60, 160, 40), (90, 200, 60)],
    'blue':   [(200, 120, 30), (180, 100, 20), (170, 110, 40)],
}

# Helper to pre-compute LAB references on startup
def _init_lab_refs():
    """Pre-compute LAB reference values for distance matching."""
    # Loop over standard colors and BGR samples
    for color_name, bgr_samples in _REF_BGR.items():
        labs = []
        # Convert each BGR sample into LAB color space using OpenCV
        for bgr in bgr_samples:
            # Create a 1x1 image array holding the single BGR pixel
            pixel = np.uint8([[bgr]])
            # Convert BGR color space to LAB color space
            lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
            # Store the converted coordinates as float values
            labs.append(lab[0][0].astype(np.float64))
        # Save LAB reference array for the corresponding color name
        REFERENCE_LAB[color_name] = labs

# Execute the LAB pre-computation function
_init_lab_refs()


# ── Strategy 1: HSV-based classification ──────────────────────────────────

# Classify color by examining HSV boundaries
def _classify_hsv(h, s, v):
    """
    Classify color using OpenCV HSV ranges.
    H: 0-179, S: 0-255, V: 0-255
    
    Returns (color_name, confidence) where confidence is 0.0-1.0.
    """
    # Very dark values indicate shadow, fall back with low confidence
    if v < 40:
        return 'blue', 0.2  # dark patches are often blue in shadow

    # ── WHITE detection ──
    # White has low saturation (less color tone) AND high brightness (Value)
    if s < 50 and v > 130:
        return 'white', 0.9
    if s < 70 and v > 160:
        return 'white', 0.8
    # Slightly tinted white (warm/cool camera casts)
    if s < 85 and v > 180:
        return 'white', 0.65

    # ── YELLOW detection ──
    # Yellow is typically between Hue 20 and 42 with high saturation and value
    if 20 <= h <= 42 and s > 80 and v > 120:
        conf = 0.9 if s > 120 else 0.7
        return 'yellow', conf
    # Pale yellow under warm lighting conditions
    if 18 <= h <= 42 and s > 50 and v > 160:
        return 'yellow', 0.55

    # ── RED detection ──
    # Red wraps around the Hue cylinder (near 0 and near 180)
    if (h < 10 or h > 160) and s > 80 and v > 60:
        # Distinguish deep red from orange-ish red
        if h < 8 or h > 170:
            return 'red', 0.9
        elif h < 12:
            return 'red', 0.6  # close to orange
        else:  # Hue 160-170
            return 'red', 0.75

    # ── ORANGE detection ──
    # Orange is situated between Hue 8 and 24 with high saturation
    if 8 <= h <= 24 and s > 80 and v > 100:
        if 10 <= h <= 20:
            return 'orange', 0.9
        return 'orange', 0.65

    # ── GREEN detection ──
    # Green is situated between Hue 35 and 90
    if 35 <= h <= 90 and s > 60 and v > 50:
        if 45 <= h <= 80:
            return 'green', 0.9
        return 'green', 0.65

    # ── BLUE detection ──
    # Blue is situated between Hue 90 and 135
    if 90 <= h <= 135 and s > 50 and v > 40:
        if 100 <= h <= 125:
            return 'blue', 0.9
        return 'blue', 0.7

    # Fallback classifications based strictly on Hue if boundaries missed (reduced confidence)
    if h < 10 or h > 165:
        return 'red', 0.3
    if 10 <= h < 25:
        return 'orange', 0.3
    if 25 <= h < 45:
        return 'yellow', 0.3
    if 45 <= h < 90:
        return 'green', 0.3
    if 90 <= h <= 165:
        return 'blue', 0.3

    # Default to white as a general fallback
    return 'white', 0.2


# ── Strategy 2: LAB distance matching ──────────────────────────────────────

# Classify color by computing Euclidean distance in LAB color space
def _classify_lab(lab_pixel):
    """
    Match a LAB pixel against reference colors using Euclidean distance.
    Returns (color_name, confidence).
    """
    # Convert input pixel coordinates to float64
    lab_f = lab_pixel.astype(np.float64)
    best_color = 'white'
    # Initialize distances to infinity
    best_dist = float('inf')
    second_best_dist = float('inf')

    # Compare input pixel with each sample of all target colors
    for color_name, ref_labs in REFERENCE_LAB.items():
        for ref in ref_labs:
            # Calculate standard Euclidean distance
            dist = np.sqrt(np.sum((lab_f - ref) ** 2))
            # Update best and second best distance tracking
            if dist < best_dist:
                second_best_dist = best_dist
                best_dist = dist
                best_color = color_name
            elif dist < second_best_dist:
                second_best_dist = dist

    # Determine confidence levels based on proximity to target samples
    margin = second_best_dist - best_dist
    if best_dist < 15:
        confidence = 0.95
    elif best_dist < 25:
        confidence = 0.8
    elif best_dist < 40:
        confidence = 0.6
    elif best_dist < 60:
        confidence = 0.4
    else:
        confidence = 0.2

    # Boost confidence if the best match is significantly closer than the second best
    if margin > 20:
        confidence = min(confidence + 0.15, 1.0)

    # Return winning color and its confidence value
    return best_color, confidence


# ── Strategy 3: RGB ratio heuristics ──────────────────────────────────────

# Classify color using BGR channel ratios
def _classify_rgb(b, g, r):
    """
    Use RGB channel ratios for color classification.
    Good at distinguishing red/orange/yellow and white.
    
    Input is in BGR order (OpenCV convention).
    Returns (color_name, confidence).
    """
    # Calculate sum of all channels (add epsilon to prevent division-by-zero)
    total = float(b + g + r) + 1e-6
    # Compute channel ratios
    r_ratio = r / total
    g_ratio = g / total
    b_ratio = b / total

    # Retrieve maximum, minimum channels and the spread difference
    max_ch = max(r, g, b)
    min_ch = min(r, g, b)
    spread = max_ch - min_ch

    # White: Channels are all high (bright) and very close to each other
    if spread < 45 and min_ch > 130:
        return 'white', 0.85
    if spread < 60 and min_ch > 150:
        return 'white', 0.7

    # Yellow: High Red and Green, low Blue
    if r > 150 and g > 150 and b < 100 and r_ratio > 0.33 and g_ratio > 0.33:
        return 'yellow', 0.85

    # Orange: High Red, moderate Green, low Blue, Red is significantly larger than Green
    if r > 160 and g > 70 and g < 180 and b < 80 and r > g * 1.3:
        return 'orange', 0.85

    # Red: High Red, low Green, low Blue
    if r > 130 and g < 100 and b < 100 and r_ratio > 0.5:
        return 'red', 0.85

    # Green: High Green, lower Red and Blue
    if g > 120 and r < 130 and b < 120 and g_ratio > 0.4:
        return 'green', 0.85

    # Blue: High Blue, low Red and Green
    if b > 120 and r < 100 and g < 150 and b_ratio > 0.4:
        return 'blue', 0.85

    # Fallback to white with low confidence
    return 'white', 0.2


# ── Multi-strategy voting ──────────────────────────────────────────────────

# Main voting function that integrates the predictions of the three strategies
def _classify_sticker(bgr_roi, hsv_roi, lab_roi):
    """
    Classify a sticker ROI using voting across three strategies.
    Returns the winning color name.
    """
    # Return default white if empty regions of interest are passed
    if bgr_roi.size == 0 or hsv_roi.size == 0:
        return 'white'

    # Compute median values to resist pixel outliers, dust, or glare reflections
    h_med = float(np.median(hsv_roi[:, :, 0]))
    s_med = float(np.median(hsv_roi[:, :, 1]))
    v_med = float(np.median(hsv_roi[:, :, 2]))

    b_med = float(np.median(bgr_roi[:, :, 0]))
    g_med = float(np.median(bgr_roi[:, :, 1]))
    r_med = float(np.median(bgr_roi[:, :, 2]))

    lab_med = np.array([
        float(np.median(lab_roi[:, :, 0])),
        float(np.median(lab_roi[:, :, 1])),
        float(np.median(lab_roi[:, :, 2])),
    ])

    # Run predictions and gather confidence values from each strategy
    hsv_color, hsv_conf = _classify_hsv(h_med, s_med, v_med)
    lab_color, lab_conf = _classify_lab(lab_med)
    rgb_color, rgb_conf = _classify_rgb(b_med, g_med, r_med)

    # Initialize weighted votes dictionary
    votes = {}
    # Accumulate confidence weights (giving HSV a slight preference boost)
    for color, weight in [(hsv_color, hsv_conf * 1.2),
                          (lab_color, lab_conf * 1.0),
                          (rgb_color, rgb_conf * 0.9)]:
        votes[color] = votes.get(color, 0) + weight

    # If all three strategies agree, output the color immediately
    if hsv_color == lab_color == rgb_color:
        return hsv_color

    # Add agreement bonuses to reward consistency between strategies
    if hsv_color == lab_color:
        votes[hsv_color] = votes.get(hsv_color, 0) + 0.5
    if hsv_color == rgb_color:
        votes[hsv_color] = votes.get(hsv_color, 0) + 0.5
    if lab_color == rgb_color:
        votes[lab_color] = votes.get(lab_color, 0) + 0.5

    # ── Special disambiguation rules ──

    # Disambiguation Rule 1: White vs Yellow
    # If the top votes are white/yellow and scores are close, decide using saturation
    if set(votes.keys()) <= {'white', 'yellow'} or \
       (votes.get('white', 0) > 0 and votes.get('yellow', 0) > 0):
        w_score = votes.get('white', 0)
        y_score = votes.get('yellow', 0)
        if abs(w_score - y_score) < 0.5:
            # Higher saturation values clearly indicate yellow
            if s_med > 70:
                return 'yellow'
            else:
                return 'white'

    # Disambiguation Rule 2: Red vs Orange
    # If the top votes are red/orange and scores are close, decide using Hue boundaries
    if votes.get('red', 0) > 0 and votes.get('orange', 0) > 0:
        r_score = votes.get('red', 0)
        o_score = votes.get('orange', 0)
        if abs(r_score - o_score) < 0.5:
            # Hue between 8 and 20 indicates orange
            if 8 <= h_med <= 20:
                return 'orange'
            else:
                return 'red'

    # Return the color that received the highest vote score
    return max(votes, key=votes.get)


# ── Grid extraction ────────────────────────────────────────────────────────

# Loop through each coordinate of the N x N grid layout and classify the cell regions
def _extract_sticker_colors(bgr, hsv, lab, h, w, N=3):
    """
    Divide the frame into an N×N grid and classify each cell.
    Uses 15% padding on each side to avoid background.
    Samples 25% of each cell for robustness.
    """
    # Calculate margins to discard background noise
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)
    # Calculate dimensions of each grid cell
    cell_w = (w - 2 * pad_x) / N
    cell_h = (h - 2 * pad_y) / N

    colors = []
    # Loop row-by-row and column-by-column
    for row in range(N):
        for col in range(N):
            # Locate cell center coordinate
            cx = int(pad_x + (col + 0.5) * cell_w)
            cy = int(pad_y + (row + 0.5) * cell_h)
            # Sample a region (radius) around the center (25% of cell size)
            radius = max(1, int(min(cell_w, cell_h) * 0.25))

            # Define pixel bounds
            y1 = max(0, cy - radius)
            y2 = min(h, cy + radius)
            x1 = max(0, cx - radius)
            x2 = min(w, cx + radius)

            # Crop the color space matrices to the calculated boundaries
            bgr_roi = bgr[y1:y2, x1:x2]
            hsv_roi = hsv[y1:y2, x1:x2]
            lab_roi = lab[y1:y2, x1:x2]

            # Determine color using multi-strategy voting
            color = _classify_sticker(bgr_roi, hsv_roi, lab_roi)
            # Append color string to results array
            colors.append(color)

    return colors


# ── Public API ─────────────────────────────────────────────────────────────

# Public API function: classify colors from a base64-encoded snapshot image
def detect_face_colors(image_b64: str, N: int = 3) -> list[str]:
    """
    Detect NxN sticker colors from a base64-encoded JPEG image.
    Returns a list of N*N color names in reading order (top-left to bottom-right).
    """
    # Decode base64 bytes representation
    img_bytes = base64.b64decode(image_b64)
    # Load into a NumPy binary array
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    # Decode to image matrix using OpenCV
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    # Raise error if decoding process failed
    if frame is None:
        raise ValueError("Could not decode image")

    # Pass frame to pipeline processing
    return _process_frame(frame, N)


# Public API function: classify colors from a raw NumPy BGR frame array
def detect_face_colors_from_frame(frame: np.ndarray, N: int = 3) -> list[str]:
    """Same as detect_face_colors but accepts a raw numpy frame (BGR)."""
    return _process_frame(frame, N)


# Internal pipeline processing: apply filters and convert color spaces
def _process_frame(frame: np.ndarray, N: int = 3) -> list[str]:
    """
    Full processing pipeline:
    1. Bilateral filter for denoising (preserve edges)
    2. Convert to HSV + LAB
    3. Extract and classify N×N grid
    """
    # Retrieve frame height and width
    h, w = frame.shape[:2]

    # Denoise frame with bilateral filter to preserve edges while smoothing flat surfaces
    denoised = cv2.bilateralFilter(frame, 9, 75, 75)

    # Apply Gaussian blur to smooth out pixel noise
    smoothed = cv2.GaussianBlur(denoised, (5, 5), 0)

    # Convert the processed BGR frame to HSV and LAB color spaces
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(smoothed, cv2.COLOR_BGR2LAB)

    # Divide grid and run voting classification
    return _extract_sticker_colors(smoothed, hsv, lab, h, w, N)
