/**
 * Rubik's Cube state model and move logic for arbitrary NxNxN sizes.
 * 
 * Face layout: U=0, R=1, F=2, D=3, L=4, B=5
 * Sticker indices per face (reading order):
 *   0 1 2 ... N-1
 *   N ...
 *   ... (N*N-1)
 */

export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const COLORS = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];

export const COLOR_HEX = {
  white:  '#f0f0f0',
  red:    '#ff3b3b',
  green:  '#00c853',
  yellow: '#ffd93d',
  orange: '#ff8c00',
  blue:   '#2979ff',
  gray:   '#3a3a4a',
};

/** Create a solved cube state of size N. */
export function createSolvedState(N = 3) {
  const state = { size: N };
  FACE_NAMES.forEach((face, i) => {
    state[face] = Array(N * N).fill(COLORS[i]);
  });
  return state;
}

/** Create an empty (unset) cube state of size N — all stickers gray. */
export function createEmptyState(N = 3) {
  const state = { size: N };
  FACE_NAMES.forEach(face => {
    state[face] = Array(N * N).fill('gray');
  });
  return state;
}

/** Deep clone a cube state. */
export function cloneState(state) {
  const N = state.size;
  const copy = { size: N };
  FACE_NAMES.forEach(face => {
    copy[face] = [...state[face]];
  });
  return copy;
}

/** Rotate a face's stickers 90° clockwise. */
function rotateFaceCW(stickers, N) {
  const result = new Array(N * N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // (r, c) -> (c, N-1-r)
      result[c * N + (N - 1 - r)] = stickers[r * N + c];
    }
  }
  return result;
}

/** 
 * Apply a move to a cube state.
 * Notation: 
 * - 'U', 'R', etc. = Outer layer turn.
 * - 'Uw', 'Rw', etc. = Outer 2 layers turn.
 * - '2U', '3R', etc. = Single inner layer turn (2nd, 3rd from face).
 */
export function applyMove(state, move) {
  const s = cloneState(state);
  
  // Parse move: [layers]Face[modifier]
  // e.g. "U", "Uw", "2U", "U'", "U2", "2Uw'"
  const match = move.match(/^(\d+)?([URFDLB])(w)?(['2])?$/);
  if (!match) return s;

  let [, layerStr, face, wide, mod] = match;
  let layerNum = layerStr ? parseInt(layerStr) : 1;
  let count = 1;
  if (mod === "'") count = 3;
  else if (mod === "2") count = 2;

  for (let i = 0; i < count; i++) {
    applySingleCW(s, face, layerNum, !!wide);
  }
  return s;
}

/** Apply a single clockwise quarter turn to a specific layer of a face. */
function applySingleCW(s, face, layerNum, wide) {
  const N = s.size;
  const targetLayer = layerNum; // 1-indexed

  // 1. Rotate the face stickers if this is the outermost layer (layer 1)
  if (targetLayer === 1) {
    s[face] = rotateFaceCW(s[face], N);
  }
  // If rotating opposite face of a slice (e.g. if we are at the very back)
  // we'd rotate that face CCW. But standard notation handles that via separate moves.

  // 2. Shift stickers on adjacent faces
  // Loop if 'wide', otherwise just do the single target layer
  const start = wide ? 1 : targetLayer;
  const end = targetLayer;

  for (let d = start; d <= end; d++) {
    const idx = d - 1; // 0-indexed distance from face
    const rev = N - 1 - idx; // 0-indexed distance from opposite side

    switch (face) {
      case 'U': {
        // U turn: F -> L -> B -> R -> F
        const temp = getRow(s.F, idx, N);
        setRow(s.F, idx, getRow(s.R, idx, N), N);
        setRow(s.R, idx, getRow(s.B, idx, N), N);
        setRow(s.B, idx, getRow(s.L, idx, N), N);
        setRow(s.L, idx, temp, N);
        break;
      }
      case 'D': {
        // D turn: F -> R -> B -> L -> F
        const temp = getRow(s.F, rev, N);
        setRow(s.F, rev, getRow(s.L, rev, N), N);
        setRow(s.L, rev, getRow(s.B, rev, N), N);
        setRow(s.B, rev, getRow(s.R, rev, N), N);
        setRow(s.R, rev, temp, N);
        break;
      }
      case 'R': {
        // R turn: U -> B(rev) -> D -> F -> U
        const temp = getCol(s.U, rev, N);
        setCol(s.U, rev, getCol(s.F, rev, N), N);
        setCol(s.F, rev, getCol(s.D, rev, N), N);
        setCol(s.D, rev, getCol(s.B, idx, N).reverse(), N);
        setCol(s.B, idx, temp.reverse(), N);
        break;
      }
      case 'L': {
        // L turn: U -> F -> D -> B(rev) -> U
        const temp = getCol(s.U, idx, N);
        setCol(s.U, idx, getCol(s.B, rev, N).reverse(), N);
        setCol(s.B, rev, getCol(s.D, idx, N).reverse(), N);
        setCol(s.D, idx, getCol(s.F, idx, N), N);
        setCol(s.F, idx, temp, N);
        break;
      }
      case 'F': {
        // F turn: U(bot) -> R(left) -> D(top) -> L(right)
        const temp = getRow(s.U, rev, N);
        setRow(s.U, rev, getCol(s.L, rev, N).reverse(), N);
        setCol(s.L, rev, getRow(s.D, idx, N), N);
        setRow(s.D, idx, getCol(s.R, idx, N).reverse(), N);
        setCol(s.R, idx, temp, N);
        break;
      }
      case 'B': {
        // B turn: U(top) -> L(left) -> D(bot) -> R(right)
        const temp = getRow(s.U, idx, N);
        setRow(s.U, idx, getCol(s.R, rev, N), N);
        setCol(s.R, rev, getRow(s.D, rev, N).reverse(), N);
        setRow(s.D, rev, getCol(s.L, idx, N), N);
        setCol(s.L, idx, temp.reverse(), N);
        break;
      }
    }
  }
}

// Helpers for NxN row/column extraction
function getRow(stickers, row, N) {
  return stickers.slice(row * N, (row + 1) * N);
}
function setRow(stickers, row, val, N) {
  for (let i = 0; i < N; i++) stickers[row * N + i] = val[i];
}
function getCol(stickers, col, N) {
  const res = [];
  for (let i = 0; i < N; i++) res.push(stickers[i * N + col]);
  return res;
}
function setCol(stickers, col, val, N) {
  for (let i = 0; i < N; i++) stickers[i * N + col] = val[i];
}

/** Apply a sequence of moves to a state. */
export function applyMoves(state, moves) {
  let current = state;
  for (const move of moves) {
    current = applyMove(current, move);
  }
  return current;
}

/** Parse a move string into an array. Handles wide and slice moves. */
export function parseMoves(moveString) {
  if (!moveString || !moveString.trim()) return [];
  return moveString.trim().split(/\s+/);
}

/** Check if the cube is solved. */
export function isSolved(state) {
  for (const face of FACE_NAMES) {
    const color = state[face][0];
    if (!state[face].every(c => c === color)) return false;
  }
  return true;
}
