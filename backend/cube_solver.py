# Import random library for scrambling and move generation
import random
# Import Kociemba solver for optimal 3x3x3 solutions
import kociemba
# Import Counter to count and validate sticker colors
from collections import Counter
# Import re for regex parsing of move notation strings
import re

# List of the six standard Rubik's Cube faces in layout order
FACES = ['U', 'R', 'F', 'D', 'L', 'B']
# Standard color mapping matching the order of faces (U=white, R=red, F=green, etc.)
COLORS = ['white', 'red', 'green', 'yellow', 'orange', 'blue']

# Initialize a solved cube state representation of size N
def create_solved_state(N=3):
    # Map each face to a list of N*N stickers, all filled with its corresponding default color
    state = {face: [COLORS[i]] * (N * N) for i, face in enumerate(FACES)}
    # Store the size of the cube in the state metadata
    state['size'] = N
    return state

# Helper function to rotate a 1D stickers array representing a face 90 degrees clockwise
def rotate_face_cw(stickers, N):
    # Initialize an empty list of size N*N to store the rotated stickers
    result = [None] * (N * N)
    # Loop through each row and column of the 2D face grid representation
    for r in range(N):
        for c in range(N):
            # Map the 2D coordinate (row, col) to its new 90-degree clockwise rotated index
            result[c * N + (N - 1 - r)] = stickers[r * N + c]
    return result

# Apply a Rubik's Cube move (e.g., 'U', 'R2', '2Fw', '3L'') to a given state
def apply_move(state, move, N):
    # Regex parse the move string into parts: [layer number][face letter][w prefix for wide][modifier ', 2]
    match = re.match(r'^(\d+)?([URFDLB])(w)?([\'2])?$', move)
    # If the move pattern doesn't match standard notation, return the state unchanged
    if not match: return state

    # Unpack parsed components
    layer_str, face, wide, mod = match.groups()
    # Determine the target layer from face (defaults to 1, i.e., outermost layer)
    layer_num = int(layer_str) if layer_str else 1
    # Determine number of 90-degree clockwise turns to apply (default is 1)
    count = 1
    # If modifier is ', rotate counter-clockwise (which equals 3 clockwise turns)
    if mod == "'": count = 3
    # If modifier is 2, rotate 180 degrees (2 clockwise turns)
    elif mod == "2": count = 2

    # Perform a shallow copy of the state dictionary, cloning the inner list for each face
    new_state = {f: list(s) if isinstance(s, list) else s for f, s in state.items()}
    
    # Run the single clockwise turn logic the specified number of times
    for _ in range(count):
        _apply_single_cw(new_state, face, layer_num, wide == 'w', N)
    
    return new_state

# Internal helper to apply a single 90-degree clockwise turn on a face's layer
def _apply_single_cw(s, face, layer_num, wide, N):
    # If wide move ('w'), shift all layers from 1 up to layer_num. Otherwise, shift just layer_num
    start = 1 if wide else layer_num
    end = layer_num
    
    # Rotate the face itself if the outermost layer (layer 1) is being manipulated
    if layer_num == 1:
        s[face] = rotate_face_cw(s[face], N)

    # Shift adjacent sticker rows/columns for each of the active layers
    for d in range(start, end + 1):
        # 0-indexed distance from the face
        idx = d - 1
        # 0-indexed distance from the opposite face
        rev = N - 1 - idx
        
        # Shift stickers around the Up face adjacent layers
        if face == 'U':
            f_r = idx * N
            # For U, swap corresponding rows: R -> F -> L -> B -> R
            s['F'][f_r:f_r+N], s['L'][f_r:f_r+N], s['B'][f_r:f_r+N], s['R'][f_r:f_r+N] = \
                s['R'][f_r:f_r+N], s['F'][f_r:f_r+N], s['L'][f_r:f_r+N], s['B'][f_r:f_r+N]
        # Shift stickers around the Down face adjacent layers
        elif face == 'D':
            f_r = rev * N
            # For D, swap corresponding rows: L -> F -> R -> B -> L
            s['F'][f_r:f_r+N], s['R'][f_r:f_r+N], s['B'][f_r:f_r+N], s['L'][f_r:f_r+N] = \
                s['L'][f_r:f_r+N], s['F'][f_r:f_r+N], s['R'][f_r:f_r+N], s['B'][f_r:f_r+N]
        # Shift stickers around the Right face adjacent layers
        elif face == 'R':
            # Extract column indexes from adjacent faces
            u_c = [s['U'][i*N + rev] for i in range(N)]
            f_c = [s['F'][i*N + rev] for i in range(N)]
            d_c = [s['D'][i*N + rev] for i in range(N)]
            b_c = [s['B'][i*N + idx] for i in range(N)]
            b_c.reverse() # Back face columns are inverted due to perspective
            # Apply shifts to the extracted columns
            for i in range(N):
                s['U'][i*N + rev] = f_c[i]; s['F'][i*N + rev] = d_c[i]
                s['D'][i*N + rev] = b_c[i]; s['B'][i*N + idx] = u_c[N-1-i]
        # Shift stickers around the Left face adjacent layers
        elif face == 'L':
            # Extract column indexes from adjacent faces
            u_c = [s['U'][i*N + idx] for i in range(N)]
            f_c = [s['F'][i*N + idx] for i in range(N)]
            d_c = [s['D'][i*N + idx] for i in range(N)]
            b_c = [s['B'][i*N + rev] for i in range(N)]
            b_c.reverse() # Back face columns are inverted due to perspective
            # Apply shifts to the extracted columns
            for i in range(N):
                s['U'][i*N + idx] = b_c[i]; s['B'][i*N + rev] = d_c[N-1-i]
                s['D'][i*N + idx] = f_c[i]; s['F'][i*N + idx] = u_c[i]
        # Shift stickers around the Front face adjacent layers
        elif face == 'F':
            # Extract row/column segments from adjacent faces
            u_r = s['U'][(rev)*N : (rev)*N+N]
            r_c = [s['R'][i*N + idx] for i in range(N)]
            d_r = s['D'][idx*N : idx*N+N]
            l_c = [s['L'][i*N + rev] for i in range(N)]
            # Apply shifts (requires inversion for vertical-to-horizontal mapping)
            for i in range(N):
                s['R'][i*N + idx] = u_r[i]; s['D'][idx*N + i] = r_c[N-1-i]
                s['L'][i*N + rev] = d_r[i]; s['U'][(rev)*N + i] = l_c[N-1-i]
        # Shift stickers around the Back face adjacent layers
        elif face == 'B':
            # Extract row/column segments from adjacent faces
            u_r = s['U'][idx*N : idx*N+N]
            l_c = [s['L'][i*N + idx] for i in range(N)]
            d_r = s['D'][rev*N : rev*N+N]
            r_c = [s['R'][i*N + rev] for i in range(N)]
            # Apply shifts (requires inversion for vertical-to-horizontal mapping)
            for i in range(N):
                s['L'][i*N + idx] = u_r[N-1-i]; s['D'][rev*N + i] = l_c[i]
                s['R'][i*N + rev] = d_r[N-1-i]; s['U'][idx*N + i] = r_c[i]

# Generate a random scramble sequence of moves of a specified length for a cube of size N
def generate_scramble(N=3, length=None):
    # Set default scramble length based on cube size if not explicitly provided
    if length is None: length = 20 + (N-3)*10
    scramble = []
    last_face = ''
    # Generate moves one by one
    for _ in range(length):
        # Choose a random face, making sure it doesn't repeat the face of the previous move
        face = random.choice([f for f in FACES if f != last_face])
        # Choose rotation modifier (normal, counter-clockwise, or double turn)
        mod = random.choice(['', "'", '2'])
        prefix = ''
        # For cubes larger than 3x3x3, generate random inner layer and wide turns
        if N > 3:
            layer = random.randint(1, N // 2)
            if layer > 1: prefix = str(layer)
            if random.random() > 0.7: prefix += 'w'
        # Combine parameters to form notation (e.g. '2Rw2') and append to scramble list
        scramble.append(f"{prefix}{face}{mod}")
        last_face = face
    return scramble

# Invert a single move notation (e.g. R -> R', R' -> R, R2 -> R2)
def invert_move(move):
    # If it ends with ', remove it to make it clockwise
    if move.endswith("'"): return move[:-1]
    # If it ends with 2, it is its own inverse
    if move.endswith("2"): return move
    # If it is clockwise, append ' to make it counter-clockwise
    return move + "'"

# Main entry solver logic supporting NxN cubes
def solve(state, N=3, history=None):
    """General NxN solver."""
    # 0. Check if the cube is already solved
    is_solved = True
    for face in FACES:
        if face in state and len(state[face]) > 0:
            first_color = state[face][0]
            if not all(c == first_color for c in state[face]):
                is_solved = False
                break
    if is_solved:
        return []

    # 1. If it's a standard 3x3, solve optimally using the Kociemba library
    if N == 3:
        # Create a mapping of center sticker color to face letter
        mapping = {state[f][4]: f for f in FACES}
        k_str = ""
        # Construct the Kociemba representation string by visiting stickers of each face in U-R-F-D-L-B order
        try:
            for f in FACES:
                for s in state[f]: k_str += mapping[s]
        except KeyError:
            raise ValueError("Invalid coloring: Some sticker colors do not match any face center color.")

        try:
            # Run Kociemba algorithm and split the resulting string into a list of moves
            return kociemba.solve(k_str).split()
        except ValueError as e:
            # Fallback to pure-Python validation solver to extract detailed error messages
            from kociemba.pykociemba import search
            try:
                res = search.Search().solution(k_str, 24, 1000, False).strip()
                errors = {
                    'Error 1': 'There is not exactly 9 facelets of each color.',
                    'Error 2': 'Not all 12 edges exist exactly once.',
                    'Error 3': 'Flip error: One edge has to be flipped.',
                    'Error 4': 'Not all 8 corners exist exactly once.',
                    'Error 5': 'Twist error: One corner has to be twisted.',
                    'Error 6': 'Parity error: Two corners or two edges have to be exchanged.',
                    'Error 7': 'No solution exists for the given maxDepth.',
                    'Error 8': 'Timeout, no solution found.'
                }
                if res in errors:
                    raise ValueError(errors[res])
                else:
                    return res.split()
            except Exception as py_err:
                if isinstance(py_err, ValueError):
                    raise py_err
                raise ValueError("Error. Probably cubestring is invalid.")

    # 2. If we have a move history (e.g., scramble sequence) for larger cubes, solve by reverting moves in reverse order
    if history and len(history) > 0:
        return [invert_move(m) for m in reversed(history)]
    # 3. Raise error for larger manual inputs
    raise ValueError(f"Manual solving is only supported for 3x3x3 cubes. For {N}x{N}x{N} cubes, please use Scramble.")

# Helper to validate center sticker colors and relative 3D coordinate chirality
def _validate_centers_chirality(state, N):
    face_vectors = {
        'U': (0, 1, 0),
        'D': (0, -1, 0),
        'R': (1, 0, 0),
        'L': (-1, 0, 0),
        'F': (0, 0, 1),
        'B': (0, 0, -1)
    }
    center_idx = (N * N) // 2
    centers = {}
    for f in FACES:
        if len(state[f]) <= center_idx:
            return False, f"Invalid state: {f} face is too small."
        centers[f] = state[f][center_idx]
        
    center_colors = list(centers.values())
    
    # 1. Uniqueness check
    if len(set(center_colors)) < 6:
        return False, "Invalid centers: Center stickers must have unique colors."
        
    # 2. Check if all standard colors are present
    for color in COLORS:
        if color not in center_colors:
            return False, f"Invalid centers: Missing center color '{color}'."

    # Map color to its unit vector
    color_vectors = {}
    for face, color in centers.items():
        color_vectors[color] = face_vectors[face]

    # Standard opposites check
    opposites_map = {
        'white': 'yellow', 'yellow': 'white',
        'red': 'orange', 'orange': 'red',
        'green': 'blue', 'blue': 'green'
    }
    for c1, c2 in opposites_map.items():
        v1 = color_vectors[c1]
        v2 = color_vectors[c2]
        dot_product = sum(v1[i] * v2[i] for i in range(3))
        if dot_product != -1:
            return False, f"Invalid centers: {c1.capitalize()} and {c2.capitalize()} centers must be on opposite faces."

    # Right-handedness check (Up x Front = Right)
    v_white = color_vectors['white']
    v_green = color_vectors['green']
    v_red = color_vectors['red']
    
    cross_product = (
        v_white[1] * v_green[2] - v_white[2] * v_green[1],
        v_white[2] * v_green[0] - v_white[0] * v_green[2],
        v_white[0] * v_green[1] - v_white[1] * v_green[0]
    )
    
    if cross_product != v_red:
        return False, "Invalid centers: Center colors form a left-handed (mirrored) layout. Check center orientations."

    return True, "Valid"

# Validate the counts of sticker colors in the current cube state
def validate_state(state):
    # Return error if the state dictionary is malformed or missing key faces
    if not state or 'U' not in state: return False, "Invalid state", {}
    # Calculate dimensions
    N_sq = len(state['U'])
    N = int(N_sq ** 0.5)
    details = {'counts': {}, 'errors': []}
    # Flatten all stickers from all faces into a single list
    all_stickers = [s for face in FACES for s in state[face] if isinstance(s, str)]
    # Count frequency of each color
    counts = Counter(all_stickers)
    details['counts'] = dict(counts)
    # Validate that every color has exactly N*N stickers on the cube
    for color in COLORS:
        c_count = counts.get(color, 0)
        if c_count != N * N: details['errors'].append(f"{color}: {c_count}/{N*N}")
    # Return validation outcome
    if details['errors']: return False, "Mismatch: " + ", ".join(details['errors']), details
    
    # Check center uniqueness and chirality for odd-sized cubes
    if N % 2 == 1:
        valid_centers, centers_msg = _validate_centers_chirality(state, N)
        if not valid_centers:
            return False, centers_msg, details
            
    return True, "Valid", details
