/**
 * Rubik's Cube state model and move logic for arbitrary NxNxN sizes.
 * 
 * Face layout: U=0, R=1, F=2, D=3, L=4, B=5
 * Sticker indices per face (reading order):
 *   0 1 2 ... N-1
 *   N ...
 *   ... (N*N-1)
 */

// Face identifiers in standard layout order: Up, Right, Front, Down, Left, Back
export const FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B'];
// Names of the six standard colors corresponding to the faces
export const COLORS = ['white', 'red', 'green', 'yellow', 'orange', 'blue'];

// Hex color codes used to render stickers in the 2D and 3D visualizers
export const COLOR_HEX = {
  white:  '#f0f0f0',
  red:    '#ff3b3b',
  green:  '#00c853',
  yellow: '#ffd93d',
  orange: '#ff8c00',
  blue:   '#2979ff',
  gray:   '#3a3a4a', // Used when stickers are uncolored/empty during scanning
};

/** Create a solved cube state of size N. */
export function createSolvedState(N = 3) {
  // Initialize state with size metadata
  const state = { size: N };
  // Assign each face standard colors filled to size N*N
  FACE_NAMES.forEach((face, i) => {
    state[face] = Array(N * N).fill(COLORS[i]);
  });
  return state;
}

/** Create an empty (unset) cube state of size N — all stickers gray. */
export function createEmptyState(N = 3) {
  // Initialize state with size metadata
  const state = { size: N };
  // Assign each face gray stickers filled to size N*N
  FACE_NAMES.forEach(face => {
    state[face] = Array(N * N).fill('gray');
  });
  return state;
}

/** Deep clone a cube state. */
export function cloneState(state) {
  const N = state.size;
  const copy = { size: N };
  // Clone the sticker arrays for each face to prevent mutation side-effects
  FACE_NAMES.forEach(face => {
    copy[face] = [...state[face]];
  });
  return copy;
}

/** Rotate a face's stickers 90° clockwise. */
function rotateFaceCW(stickers, N) {
  // Initialize output array
  const result = new Array(N * N);
  // Loop row-by-row and column-by-column
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Map index (row, col) to (col, N-1-row) clockwise index
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
  // Clone the cube state to maintain pure functional state transitions
  const s = cloneState(state);
  
  // Parse move string using regex: [layer number][face URFDLB][w prefix for wide][modifier ', 2]
  const match = move.match(/^(\d+)?([URFDLB])(w)?(['2])?$/);
  // If parsing fails, return the cloned state unchanged
  if (!match) return s;

  // Unpack parsed parts
  let [, layerStr, face, wide, mod] = match;
  // Convert layer string to number (default to 1, outermost layer)
  let layerNum = layerStr ? parseInt(layerStr) : 1;
  // Set count of 90-degree turns
  let count = 1;
  if (mod === "'") count = 3; // Counter-clockwise turn is equivalent to 3 clockwise turns
  else if (mod === "2") count = 2; // Double turn is 2 clockwise turns

  // Sequentially apply the clockwise turn logic
  for (let i = 0; i < count; i++) {
    applySingleCW(s, face, layerNum, !!wide);
  }
  return s;
}

/** Apply a single clockwise quarter turn to a specific layer of a face. */
function applySingleCW(s, face, layerNum, wide) {
  const N = s.size;
  const targetLayer = layerNum; // 1-indexed target layer depth

  // 1. Rotate the face stickers if this is the outermost layer (layer 1)
  if (targetLayer === 1) {
    s[face] = rotateFaceCW(s[face], N);
  }

  // 2. Shift stickers on adjacent faces
  // Loop if 'wide' move (shifts all layers from 1 up to targetLayer), otherwise just shift targetLayer
  const start = wide ? 1 : targetLayer;
  const end = targetLayer;

  // Apply shifts for each layer index
  for (let d = start; d <= end; d++) {
    // 0-indexed distance from the face
    const idx = d - 1; 
    // 0-indexed distance from opposite side
    const rev = N - 1 - idx; 

    // Handle shift mappings based on target face
    switch (face) {
      case 'U': {
        // U turn: Front row -> Left row -> Back row -> Right row -> Front row
        const temp = getRow(s.F, idx, N);
        setRow(s.F, idx, getRow(s.R, idx, N), N);
        setRow(s.R, idx, getRow(s.B, idx, N), N);
        setRow(s.B, idx, getRow(s.L, idx, N), N);
        setRow(s.L, idx, temp, N);
        break;
      }
      case 'D': {
        // D turn: Front row -> Right row -> Back row -> Left row -> Front row
        const temp = getRow(s.F, rev, N);
        setRow(s.F, rev, getRow(s.L, rev, N), N);
        setRow(s.L, rev, getRow(s.B, rev, N), N);
        setRow(s.B, rev, getRow(s.R, rev, N), N);
        setRow(s.R, rev, temp, N);
        break;
      }
      case 'R': {
        // R turn: Up col -> Back col (inverted) -> Down col -> Front col -> Up col
        const temp = getCol(s.U, rev, N);
        setCol(s.U, rev, getCol(s.F, rev, N), N);
        setCol(s.F, rev, getCol(s.D, rev, N), N);
        setCol(s.D, rev, getCol(s.B, idx, N).reverse(), N);
        setCol(s.B, idx, temp.reverse(), N);
        break;
      }
      case 'L': {
        // L turn: Up col -> Front col -> Down col -> Back col (inverted) -> Up col
        const temp = getCol(s.U, idx, N);
        setCol(s.U, idx, getCol(s.B, rev, N).reverse(), N);
        setCol(s.B, rev, getCol(s.D, idx, N).reverse(), N);
        setCol(s.D, idx, getCol(s.F, idx, N), N);
        setCol(s.F, idx, temp, N);
        break;
      }
      case 'F': {
        // F turn: Up row (inverted) -> Right col -> Down row (inverted) -> Left col
        const temp = getRow(s.U, rev, N);
        setRow(s.U, rev, getCol(s.L, rev, N).reverse(), N);
        setCol(s.L, rev, getRow(s.D, idx, N), N);
        setRow(s.D, idx, getCol(s.R, idx, N).reverse(), N);
        setCol(s.R, idx, temp, N);
        break;
      }
      case 'B': {
        // B turn: Up row -> Left col (inverted) -> Down row -> Right col (inverted)
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

// Helpers for NxN row/column extraction from face arrays

// Extract the elements of a given row from the 1D face array
function getRow(stickers, row, N) {
  return stickers.slice(row * N, (row + 1) * N);
}
// Set the elements of a given row in the 1D face array
function setRow(stickers, row, val, N) {
  for (let i = 0; i < N; i++) stickers[row * N + i] = val[i];
}
// Extract the elements of a given column from the 1D face array
function getCol(stickers, col, N) {
  const res = [];
  for (let i = 0; i < N; i++) res.push(stickers[i * N + col]);
  return res;
}
// Set the elements of a given column in the 1D face array
function setCol(stickers, col, val, N) {
  for (let i = 0; i < N; i++) stickers[i * N + col] = val[i];
}

/** Apply a sequence of moves to a state. */
export function applyMoves(state, moves) {
  let current = state;
  // Apply each move in sequence
  for (const move of moves) {
    current = applyMove(current, move);
  }
  return current;
}

/** Parse a move string into an array. Handles wide and slice moves. */
export function parseMoves(moveString) {
  // Return empty array if input string is null, empty or white spaces
  if (!moveString || !moveString.trim()) return [];
  // Split string based on space characters
  return moveString.trim().split(/\s+/);
}

/** Check if the cube is solved. */
export function isSolved(state) {
  // Check each face separately
  for (const face of FACE_NAMES) {
    // Retreive color of the first sticker on the face
    const color = state[face][0];
    // Check if every sticker on the face matches the first sticker's color
    if (!state[face].every(c => c === color)) return false;
  }
  return true;
}
