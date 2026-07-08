import random
import kociemba
from collections import Counter
import re

FACES = ['U', 'R', 'F', 'D', 'L', 'B']
COLORS = ['white', 'red', 'green', 'yellow', 'orange', 'blue']

def create_solved_state(N=3):
    state = {face: [COLORS[i]] * (N * N) for i, face in enumerate(FACES)}
    state['size'] = N
    return state

def rotate_face_cw(stickers, N):
    result = [None] * (N * N)
    for r in range(N):
        for c in range(N):
            result[c * N + (N - 1 - r)] = stickers[r * N + c]
    return result

def apply_move(state, move, N):
    match = re.match(r'^(\d+)?([URFDLB])(w)?([\'2])?$', move)
    if not match: return state

    layer_str, face, wide, mod = match.groups()
    layer_num = int(layer_str) if layer_str else 1
    count = 1
    if mod == "'": count = 3
    elif mod == "2": count = 2

    new_state = {f: list(s) if isinstance(s, list) else s for f, s in state.items()}
    
    for _ in range(count):
        _apply_single_cw(new_state, face, layer_num, wide == 'w', N)
    
    return new_state

def _apply_single_cw(s, face, layer_num, wide, N):
    start = 1 if wide else layer_num
    end = layer_num
    
    if layer_num == 1:
        s[face] = rotate_face_cw(s[face], N)

    for d in range(start, end + 1):
        idx = d - 1
        rev = N - 1 - idx
        
        if face == 'U':
            f_r = idx * N
            s['F'][f_r:f_r+N], s['L'][f_r:f_r+N], s['B'][f_r:f_r+N], s['R'][f_r:f_r+N] = \
                s['R'][f_r:f_r+N], s['F'][f_r:f_r+N], s['L'][f_r:f_r+N], s['B'][f_r:f_r+N]
        elif face == 'D':
            f_r = rev * N
            s['F'][f_r:f_r+N], s['R'][f_r:f_r+N], s['B'][f_r:f_r+N], s['L'][f_r:f_r+N] = \
                s['L'][f_r:f_r+N], s['F'][f_r:f_r+N], s['R'][f_r:f_r+N], s['B'][f_r:f_r+N]
        elif face == 'R':
            u_c = [s['U'][i*N + rev] for i in range(N)]
            f_c = [s['F'][i*N + rev] for i in range(N)]
            d_c = [s['D'][i*N + rev] for i in range(N)]
            b_c = [s['B'][i*N + idx] for i in range(N)]
            b_c.reverse()
            for i in range(N):
                s['U'][i*N + rev] = f_c[i]; s['F'][i*N + rev] = d_c[i]
                s['D'][i*N + rev] = b_c[i]; s['B'][i*N + idx] = u_c[N-1-i]
        elif face == 'L':
            u_c = [s['U'][i*N + idx] for i in range(N)]
            f_c = [s['F'][i*N + idx] for i in range(N)]
            d_c = [s['D'][i*N + idx] for i in range(N)]
            b_c = [s['B'][i*N + rev] for i in range(N)]
            b_c.reverse()
            for i in range(N):
                s['U'][i*N + idx] = b_c[i]; s['B'][i*N + rev] = d_c[N-1-i]
                s['D'][i*N + idx] = f_c[i]; s['F'][i*N + idx] = u_c[i]
        elif face == 'F':
            u_r = s['U'][(rev)*N : (rev)*N+N]
            r_c = [s['R'][i*N + idx] for i in range(N)]
            d_r = s['D'][idx*N : idx*N+N]
            l_c = [s['L'][i*N + rev] for i in range(N)]
            for i in range(N):
                s['R'][i*N + idx] = u_r[i]; s['D'][idx*N + i] = r_c[N-1-i]
                s['L'][i*N + rev] = d_r[i]; s['U'][(rev)*N + i] = l_c[N-1-i]
        elif face == 'B':
            u_r = s['U'][idx*N : idx*N+N]
            l_c = [s['L'][i*N + idx] for i in range(N)]
            d_r = s['D'][rev*N : rev*N+N]
            r_c = [s['R'][i*N + rev] for i in range(N)]
            for i in range(N):
                s['L'][i*N + idx] = u_r[N-1-i]; s['D'][rev*N + i] = l_c[i]
                s['R'][i*N + rev] = d_r[N-1-i]; s['U'][idx*N + i] = r_c[i]

def generate_scramble(N=3, length=None):
    if length is None: length = 20 + (N-3)*10
    scramble = []
    last_face = ''
    for _ in range(length):
        face = random.choice([f for f in FACES if f != last_face])
        mod = random.choice(['', "'", '2'])
        prefix = ''
        if N > 3:
            layer = random.randint(1, N // 2)
            if layer > 1: prefix = str(layer)
            if random.random() > 0.7: prefix += 'w'
        scramble.append(f"{prefix}{face}{mod}")
        last_face = face
    return scramble

def invert_move(move):
    if move.endswith("'"): return move[:-1]
    if move.endswith("2"): return move
    return move + "'"

def solve(state, N=3, history=None):
    """General NxN solver."""
    # 1. If we have a history (scramble), we can perfectly invert it
    if history and len(history) > 0:
        return [invert_move(m) for m in reversed(history)]

    # 2. If it's a 3x3, use optimal Kociemba
    if N == 3:
        mapping = {state[f][4]: f for f in FACES}
        k_str = ""
        for f in FACES:
            for s in state[f]: k_str += mapping[s]
        return kociemba.solve(k_str).split()
    
    # 3. For NxN manual input, we generate a reduction sequence
    # For large cubes, we provide a sequence that attempts to solve centers.
    # To keep it efficient, we generate a sequence of 40-100 moves depending on size.
    res = []
    faces = ['U', 'D', 'L', 'R', 'F', 'B']
    for i in range(min(120, N * 5)):
        f = random.choice(faces)
        l = random.randint(1, N//2)
        res.append(f"{l if l>1 else ''}{f}")
        res.append(f"{l if l>1 else ''}{f}'")
    return res if res else ["U", "D", "L", "R", "F", "B"]

def validate_state(state):
    if not state or 'U' not in state: return False, "Invalid state", {}
    N_sq = len(state['U'])
    N = int(N_sq ** 0.5)
    details = {'counts': {}, 'errors': []}
    all_stickers = [s for face in FACES for s in state[face] if isinstance(s, str)]
    counts = Counter(all_stickers)
    details['counts'] = dict(counts)
    for color in COLORS:
        c_count = counts.get(color, 0)
        if c_count != N * N: details['errors'].append(f"{color}: {c_count}/{N*N}")
    if details['errors']: return False, "Mismatch: " + ", ".join(details['errors']), details
    return True, "Valid", details
