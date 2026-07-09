// Import color hex code mapping helper from cube lib
import { COLOR_HEX } from '../lib/cube';

// Inline CSS style definitions using React style object syntax
const styles = {
  // Styles for the main container centering the unfolded layout
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
  // Dynamic layout generator for the 4x3 unfolded cube configuration
  unfolded: () => {
    const faceSize = 120; // Width/height of each 3x3 face in pixels
    return {
      display: 'grid',
      gridTemplateColumns: `repeat(4, ${faceSize}px)`, // 4 horizontal grid columns
      gridTemplateRows: `repeat(3, ${faceSize}px)`,    // 3 vertical grid rows
      gap: '8px',
    };
  },
  // Dynamic layout for the stickers inside an individual face
  face: (size) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${size}, 1fr)`, // Divide columns equally by cube size (N)
    gridTemplateRows: `repeat(${size}, 1fr)`,    // Divide rows equally by cube size (N)
    gap: size > 11 ? '0' : '1px',                 // Remove gaps for extremely large cubes to save space
    border: '1px solid rgba(0,0,0,0.4)',
    background: '#111',
  }),
  // Styling for individual sticker color elements
  sticker: (color) => ({
    width: '100%',
    height: '100%',
    backgroundColor: COLOR_HEX[color] || '#333', // Fallback color if mapping is missing
  }),
  // Positioning for face name text labels (e.g. U, R, F)
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
  Face positions mapped onto the 4x3 grid layout coordinate:
      U
    L F R B
      D
*/
const GRID_POS = {
  U: [0, 1], // Row 0, Col 1
  L: [1, 0], F: [1, 1], R: [1, 2], B: [1, 3], // Row 1 positions
  D: [2, 1], // Row 2, Col 1
};

// Component to render a single face of the Rubik's Cube in 2D
function Face({ face, stickers, size, onStickerClick }) {
  return (
    <div style={{
      ...styles.face(size),
      // Set grid position from the 4x3 map (1-indexed for CSS grid)
      gridColumn: GRID_POS[face][1] + 1,
      gridRow: GRID_POS[face][0] + 1,
      position: 'relative',
    }}>
      {/* Display face indicator label */}
      <div style={styles.label}>{face}</div>
      {/* Loop through and render stickers for this face */}
      {stickers?.map((color, i) => (
        <div
          key={i}
          style={styles.sticker(color)}
          onClick={() => onStickerClick?.(face, i)} // Handle manual click color changes
        />
      ))}
    </div>
  );
}

// Main 2D Unfolded Cube component
export default function Cube2D({ cubeState, onStickerClick }) {
  const size = cubeState.size || 3;
  
  return (
    <div style={styles.container}>
      <div style={styles.unfolded(size)}>
        {/* Render each face matching the grid positions mapping */}
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
