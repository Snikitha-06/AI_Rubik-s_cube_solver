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

import cv2
import numpy as np
import base64

# ── LAB reference colors (from a standard Rubik's cube under neutral light) ──
# These are used as distance-matching targets.
REFERENCE_LAB = {}

_REF_BGR = {
    'white':  [(235, 235, 235), (220, 220, 225), (200, 200, 205)],
    'yellow': [(30, 220, 240), (20, 200, 230), (50, 230, 250)],
    'red':    [(40, 40, 200), (30, 30, 180), (20, 20, 160)],
    'orange': [(30, 120, 240), (20, 100, 220), (40, 140, 255)],
    'green':  [(80, 180, 50), (60, 160, 40), (90, 200, 60)],
    'blue':   [(200, 120, 30), (180, 100, 20), (170, 110, 40)],
}

def _init_lab_refs():
    """Pre-compute LAB reference values for distance matching."""
    for color_name, bgr_samples in _REF_BGR.items():
        labs = []
        for bgr in bgr_samples:
            pixel = np.uint8([[bgr]])
            lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
            labs.append(lab[0][0].astype(np.float64))
        REFERENCE_LAB[color_name] = labs

_init_lab_refs()


# ── Strategy 1: HSV-based classification ──────────────────────────────────

def _classify_hsv(h, s, v):
    """
    Classify color using OpenCV HSV ranges.
    H: 0-179, S: 0-255, V: 0-255
    
    Returns (color_name, confidence) where confidence is 0.0-1.0.
    """
    # Very dark → could be shadow, low confidence
    if v < 40:
        return 'blue', 0.2  # dark patches are often blue in shadow

    # ── WHITE detection ──
    # White has low saturation AND high value
    if s < 50 and v > 130:
        return 'white', 0.9
    if s < 70 and v > 160:
        return 'white', 0.8
    # Slightly tinted white (warm/cool cast)
    if s < 85 and v > 180:
        return 'white', 0.65

    # ── YELLOW detection ──
    # Yellow: hue 20-40, high saturation, high value
    if 20 <= h <= 42 and s > 80 and v > 120:
        conf = 0.9 if s > 120 else 0.7
        return 'yellow', conf
    # Pale yellow (could be white under warm light)
    if 18 <= h <= 42 and s > 50 and v > 160:
        return 'yellow', 0.55

    # ── RED detection ──
    # Red wraps around 0: either < 10 or > 160
    if (h < 10 or h > 160) and s > 80 and v > 60:
        # Distinguish deep red from orange-ish red
        if h < 8 or h > 170:
            return 'red', 0.9
        elif h < 12:
            return 'red', 0.6  # could be orange
        else:  # 160-170
            return 'red', 0.75

    # ── ORANGE detection ──
    # Orange: hue 8-22, high saturation, high value
    if 8 <= h <= 24 and s > 80 and v > 100:
        if 10 <= h <= 20:
            return 'orange', 0.9
        return 'orange', 0.65

    # ── GREEN detection ──
    if 35 <= h <= 90 and s > 60 and v > 50:
        if 45 <= h <= 80:
            return 'green', 0.9
        return 'green', 0.65

    # ── BLUE detection ──
    if 90 <= h <= 135 and s > 50 and v > 40:
        if 100 <= h <= 125:
            return 'blue', 0.9
        return 'blue', 0.7

    # Fallback based on hue alone (lower confidence)
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

    return 'white', 0.2


# ── Strategy 2: LAB distance matching ──────────────────────────────────────

def _classify_lab(lab_pixel):
    """
    Match a LAB pixel against reference colors using Euclidean distance.
    Returns (color_name, confidence).
    """
    lab_f = lab_pixel.astype(np.float64)
    best_color = 'white'
    best_dist = float('inf')
    second_best_dist = float('inf')

    for color_name, ref_labs in REFERENCE_LAB.items():
        for ref in ref_labs:
            dist = np.sqrt(np.sum((lab_f - ref) ** 2))
            if dist < best_dist:
                second_best_dist = best_dist
                best_dist = dist
                best_color = color_name
            elif dist < second_best_dist:
                second_best_dist = dist

    # Confidence based on how much better the best match is vs second best
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

    # Boost confidence if there's a clear margin
    if margin > 20:
        confidence = min(confidence + 0.15, 1.0)

    return best_color, confidence


# ── Strategy 3: RGB ratio heuristics ──────────────────────────────────────

def _classify_rgb(b, g, r):
    """
    Use RGB channel ratios for color classification.
    Good at distinguishing red/orange/yellow and white.
    
    Input is in BGR order (OpenCV convention).
    Returns (color_name, confidence).
    """
    total = float(b + g + r) + 1e-6
    r_ratio = r / total
    g_ratio = g / total
    b_ratio = b / total

    max_ch = max(r, g, b)
    min_ch = min(r, g, b)
    spread = max_ch - min_ch

    # White: all channels roughly equal and bright
    if spread < 45 and min_ch > 130:
        return 'white', 0.85
    if spread < 60 and min_ch > 150:
        return 'white', 0.7

    # Yellow: high R and G, low B
    if r > 150 and g > 150 and b < 100 and r_ratio > 0.33 and g_ratio > 0.33:
        return 'yellow', 0.85

    # Orange: high R, medium G, low B, R > G significantly
    if r > 160 and g > 70 and g < 180 and b < 80 and r > g * 1.3:
        return 'orange', 0.85

    # Red: high R, low G and B
    if r > 130 and g < 100 and b < 100 and r_ratio > 0.5:
        return 'red', 0.85

    # Green: high G, lower R and B
    if g > 120 and r < 130 and b < 120 and g_ratio > 0.4:
        return 'green', 0.85

    # Blue: high B, low R and G
    if b > 120 and r < 100 and g < 150 and b_ratio > 0.4:
        return 'blue', 0.85

    return 'white', 0.2


# ── Multi-strategy voting ──────────────────────────────────────────────────

def _classify_sticker(bgr_roi, hsv_roi, lab_roi):
    """
    Classify a sticker ROI using voting across three strategies.
    Returns the winning color name.
    """
    if bgr_roi.size == 0 or hsv_roi.size == 0:
        return 'white'

    # Get median values for each color space (robust to outliers)
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

    # Get votes from each strategy
    hsv_color, hsv_conf = _classify_hsv(h_med, s_med, v_med)
    lab_color, lab_conf = _classify_lab(lab_med)
    rgb_color, rgb_conf = _classify_rgb(b_med, g_med, r_med)

    # Weighted voting
    votes = {}
    for color, weight in [(hsv_color, hsv_conf * 1.2),
                          (lab_color, lab_conf * 1.0),
                          (rgb_color, rgb_conf * 0.9)]:
        votes[color] = votes.get(color, 0) + weight

    # If all three agree → that's the answer
    if hsv_color == lab_color == rgb_color:
        return hsv_color

    # If two agree, give bonus weight
    if hsv_color == lab_color:
        votes[hsv_color] = votes.get(hsv_color, 0) + 0.5
    if hsv_color == rgb_color:
        votes[hsv_color] = votes.get(hsv_color, 0) + 0.5
    if lab_color == rgb_color:
        votes[lab_color] = votes.get(lab_color, 0) + 0.5

    # ── Special disambiguation rules ──

    # White vs Yellow: use saturation as tiebreaker
    if set(votes.keys()) <= {'white', 'yellow'} or \
       (votes.get('white', 0) > 0 and votes.get('yellow', 0) > 0):
        w_score = votes.get('white', 0)
        y_score = votes.get('yellow', 0)
        if abs(w_score - y_score) < 0.5:
            # Close contest — saturation decides
            if s_med > 70:
                return 'yellow'
            else:
                return 'white'

    # Red vs Orange: use hue as tiebreaker
    if votes.get('red', 0) > 0 and votes.get('orange', 0) > 0:
        r_score = votes.get('red', 0)
        o_score = votes.get('orange', 0)
        if abs(r_score - o_score) < 0.5:
            if 8 <= h_med <= 20:
                return 'orange'
            else:
                return 'red'

    # Return highest voted
    return max(votes, key=votes.get)


# ── Grid extraction ────────────────────────────────────────────────────────

def _extract_sticker_colors(bgr, hsv, lab, h, w, N=3):
    """
    Divide the frame into an N×N grid and classify each cell.
    Uses 15% padding on each side to avoid background.
    Samples 25% of each cell for robustness.
    """
    pad_x = int(w * 0.15)
    pad_y = int(h * 0.15)
    cell_w = (w - 2 * pad_x) / N
    cell_h = (h - 2 * pad_y) / N

    colors = []
    for row in range(N):
        for col in range(N):
            cx = int(pad_x + (col + 0.5) * cell_w)
            cy = int(pad_y + (row + 0.5) * cell_h)
            # Sample 25% of cell size — larger = more robust (min 1px)
            radius = max(1, int(min(cell_w, cell_h) * 0.25))

            y1 = max(0, cy - radius)
            y2 = min(h, cy + radius)
            x1 = max(0, cx - radius)
            x2 = min(w, cx + radius)

            bgr_roi = bgr[y1:y2, x1:x2]
            hsv_roi = hsv[y1:y2, x1:x2]
            lab_roi = lab[y1:y2, x1:x2]

            color = _classify_sticker(bgr_roi, hsv_roi, lab_roi)
            colors.append(color)

    return colors


# ── Public API ─────────────────────────────────────────────────────────────

def detect_face_colors(image_b64: str, N: int = 3) -> list[str]:
    """
    Detect NxN sticker colors from a base64-encoded JPEG image.
    Returns a list of N*N color names in reading order (top-left to bottom-right).
    """
    img_bytes = base64.b64decode(image_b64)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    if frame is None:
        raise ValueError("Could not decode image")

    return _process_frame(frame, N)


def detect_face_colors_from_frame(frame: np.ndarray, N: int = 3) -> list[str]:
    """Same as detect_face_colors but accepts a raw numpy frame (BGR)."""
    return _process_frame(frame, N)


def _process_frame(frame: np.ndarray, N: int = 3) -> list[str]:
    """
    Full processing pipeline:
    1. Bilateral filter for denoising (preserve edges)
    2. Convert to HSV + LAB
    3. Extract and classify N×N grid
    """
    h, w = frame.shape[:2]

    # Bilateral filter — good balance of noise removal and edge preservation
    denoised = cv2.bilateralFilter(frame, 9, 75, 75)

    # Also apply a small Gaussian for pixel-level noise
    smoothed = cv2.GaussianBlur(denoised, (5, 5), 0)

    # Convert to multiple color spaces
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(smoothed, cv2.COLOR_BGR2LAB)

    return _extract_sticker_colors(smoothed, hsv, lab, h, w, N)
