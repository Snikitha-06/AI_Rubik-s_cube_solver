// Import React state manager hook
import { useState } from 'react';
// Import face keys, standard colors list, and hex codes mapping from cube library
import { FACE_NAMES, COLORS, COLOR_HEX } from '../lib/cube';

// Inline styling config for UI components
const styles = {
  // Main card container layout
  container: {
    padding: '8px 0',
  },
  // Hint instructions styling
  instructions: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  // Color picker palette box container
  palette: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  // Individual color picker swatch dot
  colorSwatch: (color, active) => ({
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    backgroundColor: COLOR_HEX[color],
    // Draw white border around selected active swatch
    border: active ? '3px solid #fff' : '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    transform: active ? 'scale(1.1)' : 'scale(1)',
  }),
  // CSS Grid mapping for the active face stickers
  faceGrid: (size) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gap: size > 7 ? '1px' : '2px', // Reduce gaps on large cubes to maximize clickable space
    justifyContent: 'center',
    marginBottom: '16px',
    aspectRatio: '1/1',
    maxWidth: '240px',
    margin: '0 auto 16px',
  }),
  // Styling for face grid cell buttons
  sticker: (color, size) => ({
    width: '100%',
    aspectRatio: '1/1',
    borderRadius: size > 7 ? '1px' : '3px',
    backgroundColor: COLOR_HEX[color],
    border: size > 11 ? 'none' : '1px solid rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'all 100ms ease',
  }),
  // Tabs container for switching active faces (U, R, F, etc.)
  faceSelector: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  // Individual face selector tab button
  faceBtn: (active) => ({
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: active ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
    background: active ? 'rgba(108,92,231,0.2)' : 'var(--bg-card)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontWeight: '600',
    fontSize: '11px',
    cursor: 'pointer',
  }),
  // Text label indicators
  label: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
  },
  // Group button panel for batch operations
  shortcuts: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginTop: '8px',
  },
  // Styling for shortcut buttons
  shortcutBtn: {
    fontSize: '10px',
    padding: '4px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  }
};

// Main ManualEditor Component
export default function ManualEditor({ cubeState, onStateChange }) {
  const size = cubeState.size || 3;
  // State tracking the currently selected paint color (defaults to white)
  const [selectedColor, setSelectedColor] = useState('white');
  // State tracking which face is currently displayed in the main grid (defaults to Up)
  const [activeFace, setActiveFace] = useState('U');

  // Triggered when a grid sticker is clicked: updates color of that single sticker
  const handleStickerClick = (face, idx) => {
    // Prevent modifying the center sticker on odd-sized cubes
    if (size % 2 === 1 && idx === Math.floor((size * size) / 2)) {
      return;
    }
    // Clone the cube state dictionary
    const newState = { ...cubeState };
    // Clone the specific face stickers array to update in place
    newState[face] = [...newState[face]];
    // Paint sticker index with the selected color
    newState[face][idx] = selectedColor;
    // Callback to parent component with new layout state
    onStateChange(newState);
  };

  // Paint all stickers of the currently active face with the selected color (keeping center color)
  const fillFace = () => {
    const newState = { ...cubeState };
    if (size % 2 === 1) {
      const centerIdx = Math.floor((size * size) / 2);
      const centerColor = newState[activeFace][centerIdx];
      newState[activeFace] = Array(size * size).fill(selectedColor);
      newState[activeFace][centerIdx] = centerColor;
    } else {
      newState[activeFace] = Array(size * size).fill(selectedColor);
    }
    onStateChange(newState);
  };

  // Clear all stickers of the currently active face to gray (keeping center color)
  const clearFace = () => {
    const newState = { ...cubeState };
    if (size % 2 === 1) {
      const centerIdx = Math.floor((size * size) / 2);
      const centerColor = newState[activeFace][centerIdx];
      newState[activeFace] = Array(size * size).fill('gray');
      newState[activeFace][centerIdx] = centerColor;
    } else {
      newState[activeFace] = Array(size * size).fill('gray');
    }
    onStateChange(newState);
  };

  return (
    <div style={styles.container}>
      <p style={styles.instructions}>
        Select color, then click stickers to paint.
      </p>

      {/* Render the color palette selector */}
      <div style={styles.palette}>
        {COLORS.map(c => (
          <div
            key={c}
            style={styles.colorSwatch(c, c === selectedColor)}
            onClick={() => setSelectedColor(c)} // Update selected paint color
            title={c}
          />
        ))}
      </div>

      {/* Render face tabs (U, R, F, D, L, B) */}
      <div style={styles.faceSelector}>
        {FACE_NAMES.map(f => (
          <button
            key={f}
            style={styles.faceBtn(f === activeFace)}
            onClick={() => setActiveFace(f)} // Update active face grid
          >
            {f}
          </button>
        ))}
      </div>

      {/* Render active face grid details and click targets */}
      <div style={styles.label}>Face: {activeFace} ({size}x{size})</div>
      <div style={styles.faceGrid(size)}>
        {cubeState[activeFace]?.map((color, idx) => {
          const isCenter = size % 2 === 1 && idx === Math.floor((size * size) / 2);
          return (
            <div
              key={idx}
              style={{
                ...styles.sticker(color, size),
                cursor: isCenter ? 'not-allowed' : 'pointer',
                opacity: isCenter ? 0.8 : 1,
                border: isCenter ? '2.5px dashed rgba(255,255,255,0.7)' : styles.sticker(color, size).border,
                boxShadow: isCenter ? 'inset 0 0 8px rgba(0,0,0,0.5)' : 'none',
              }}
              onClick={() => !isCenter && handleStickerClick(activeFace, idx)}
              title={isCenter ? `Center sticker (${color}) - Fixed` : `Click to set ${selectedColor}`}
            />
          );
        })}
      </div>

      {/* Render shortcuts for bulk-filling or clearing faces */}
      <div style={styles.shortcuts}>
        <button style={styles.shortcutBtn} onClick={fillFace}>
          Paint Entire Face
        </button>
        <button style={styles.shortcutBtn} onClick={clearFace}>
          Clear Face
        </button>
      </div>
    </div>
  );
}
