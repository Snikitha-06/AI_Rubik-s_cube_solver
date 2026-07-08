import { useState } from 'react';
import { FACE_NAMES, COLORS, COLOR_HEX } from '../lib/cube';

const styles = {
  container: {
    padding: '8px 0',
  },
  instructions: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '12px',
    textAlign: 'center',
    lineHeight: '1.4',
  },
  palette: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  colorSwatch: (color, active) => ({
    width: '30px',
    height: '30px',
    borderRadius: '6px',
    backgroundColor: COLOR_HEX[color],
    border: active ? '3px solid #fff' : '1px solid rgba(255,255,255,0.15)',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    transform: active ? 'scale(1.1)' : 'scale(1)',
  }),
  faceGrid: (size) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gap: size > 7 ? '1px' : '2px',
    justifyContent: 'center',
    marginBottom: '16px',
    aspectRatio: '1/1',
    maxWidth: '240px',
    margin: '0 auto 16px',
  }),
  sticker: (color, size) => ({
    width: '100%',
    aspectRatio: '1/1',
    borderRadius: size > 7 ? '1px' : '3px',
    backgroundColor: COLOR_HEX[color],
    border: size > 11 ? 'none' : '1px solid rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'all 100ms ease',
  }),
  faceSelector: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
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
  label: {
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
  },
  shortcuts: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginTop: '8px',
  },
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

export default function ManualEditor({ cubeState, onStateChange }) {
  const size = cubeState.size || 3;
  const [selectedColor, setSelectedColor] = useState('white');
  const [activeFace, setActiveFace] = useState('U');

  const handleStickerClick = (face, idx) => {
    const newState = { ...cubeState };
    newState[face] = [...newState[face]];
    newState[face][idx] = selectedColor;
    onStateChange(newState);
  };

  const fillFace = () => {
    const newState = { ...cubeState };
    newState[activeFace] = Array(size * size).fill(selectedColor);
    onStateChange(newState);
  };

  const clearFace = () => {
    const newState = { ...cubeState };
    newState[activeFace] = Array(size * size).fill('gray');
    onStateChange(newState);
  };

  return (
    <div style={styles.container}>
      <p style={styles.instructions}>
        Select color, then click stickers to paint.
      </p>

      {/* Palette */}
      <div style={styles.palette}>
        {COLORS.map(c => (
          <div
            key={c}
            style={styles.colorSwatch(c, c === selectedColor)}
            onClick={() => setSelectedColor(c)}
            title={c}
          />
        ))}
      </div>

      {/* Face Selector */}
      <div style={styles.faceSelector}>
        {FACE_NAMES.map(f => (
          <button
            key={f}
            style={styles.faceBtn(f === activeFace)}
            onClick={() => setActiveFace(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Active Face Grid */}
      <div style={styles.label}>Face: {activeFace} ({size}x{size})</div>
      <div style={styles.faceGrid(size)}>
        {cubeState[activeFace]?.map((color, idx) => (
          <div
            key={idx}
            style={styles.sticker(color, size)}
            onClick={() => handleStickerClick(activeFace, idx)}
            title={`Click to set ${selectedColor}`}
          />
        ))}
      </div>

      {/* Shortcuts for large cubes */}
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
