import { COLOR_HEX } from '../lib/cube';

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    minHeight: '260px',
    overflowX: 'auto',
    overflowY: 'auto',
  },
  unfolded: () => {
    const faceSize = 120;
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(4, ${faceSize}px)`,
      gridTemplateRows: `repeat(3, ${faceSize}px)`,
      gap: '8px',
    };
  },
  face: (size) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`,
    gridTemplateRows: `repeat(${size}, 1fr)`,
    gap: size > 11 ? '0' : '1px',
    border: '1px solid rgba(0,0,0,0.4)',
    background: '#111',
  }),
  sticker: (color) => ({
    width: '100%',
    height: '100%',
    backgroundColor: COLOR_HEX[color] || '#333',
  }),
  label: {
    position: 'absolute',
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '9px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'var(--font-mono)',
  }
};

/* 
  Face positions in 4x3 grid:
      U
    L F R B
      D
*/
const GRID_POS = {
  U: [0, 1],
  L: [1, 0], F: [1, 1], R: [1, 2], B: [1, 3],
  D: [2, 1],
};

function Face({ face, stickers, size, onStickerClick }) {
  return (
    <div style={{
      ...styles.face(size),
      gridColumn: GRID_POS[face][1] + 1,
      gridRow: GRID_POS[face][0] + 1,
      position: 'relative',
    }}>
      <div style={styles.label}>{face}</div>
      {stickers?.map((color, i) => (
        <div
          key={i}
          style={styles.sticker(color)}
          onClick={() => onStickerClick?.(face, i)}
        />
      ))}
    </div>
  );
}

export default function Cube2D({ cubeState, onStickerClick }) {
  const size = cubeState.size || 3;
  
  return (
    <div style={styles.container}>
      <div style={styles.unfolded(size)}>
        {Object.keys(GRID_POS).map((face) => (
          <Face
            key={face}
            face={face}
            stickers={cubeState[face]}
            size={size}
            onStickerClick={onStickerClick}
          />
        ))}
      </div>
    </div>
  );
}
