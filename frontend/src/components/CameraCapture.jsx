// Import standard React hooks for component lifecycle and DOM references
import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
// Import Webcam component to capture stream snapshots
import Webcam from 'react-webcam';

// Default stroke color for the video overlay guidelines grid
const GRID_COLOR = 'rgba(108, 92, 231, 0.7)';
// API backend prefix URL
const API_URL = '/api';

// Map color keys to standard hexadecimal color strings
const COLOR_HEX = {
  white: '#f0f0f0', red: '#ff3b3b', green: '#00c853',
  yellow: '#ffd93d', orange: '#ff8c00', blue: '#2979ff',
};

/*
 * Scanning order: F → R → B → L → U → D
 * The user picks ANY face to start — center stickers determine the mapping.
 */
const FACE_ORDER = ['F', 'R', 'B', 'L', 'U', 'D'];

// Instructions, labels, and rotation arrow configurations for all scanning steps
const FACE_INFO = {
  F: {
    label: 'Front',
    stepNumber: 1,
    holdingGuide: 'Pick up the cube. Point ANY face at the camera — this will be your Front.',
    rotation: null,
    rotationArrow: null,
  },
  R: {
    label: 'Right',
    stepNumber: 2,
    holdingGuide: 'The face now facing the camera will be your Right side.',
    rotation: 'Rotate the cube LEFT ⟲ (turn the Right face to the front)',
    rotationArrow: 'left',
  },
  B: {
    label: 'Back',
    stepNumber: 3,
    holdingGuide: 'The face now facing the camera will be your Back.',
    rotation: 'Rotate the cube LEFT ⟲ again (same direction as before)',
    rotationArrow: 'left',
  },
  L: {
    label: 'Left',
    stepNumber: 4,
    holdingGuide: 'The face now facing the camera will be your Left side.',
    rotation: 'Rotate the cube LEFT ⟲ one more time',
    rotationArrow: 'left',
  },
  U: {
    label: 'Top',
    stepNumber: 5,
    holdingGuide: 'The face now facing the camera will be your Top.',
    rotation: 'Tilt the cube UP ↑ (so the Top face faces the camera)',
    rotationArrow: 'up',
  },
  D: {
    label: 'Bottom',
    stepNumber: 6,
    holdingGuide: 'The face now facing the camera will be your Bottom.',
    rotation: 'Tilt the cube DOWN ↓ (so the Bottom face faces the camera)',
    rotationArrow: 'down',
  },
};

// Inline CSS styles configurations
const styles = {
  wrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '360px',
    margin: '0 auto',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '2px solid var(--border-accent)',
    background: '#000',
  },
  webcam: { width: '100%', display: 'block' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    pointerEvents: 'none',
  },
  controls: {
    display: 'flex', gap: '8px', justifyContent: 'center',
    marginTop: '10px', flexWrap: 'wrap',
  },
  btn: {
    padding: '10px 20px', borderRadius: 'var(--radius-sm)',
    border: 'none', fontFamily: 'var(--font-sans)',
    fontWeight: '600', fontSize: '13px', cursor: 'pointer',
    transition: 'all 200ms ease',
    background: 'var(--accent-gradient)', color: '#fff',
  },
  btnSmall: {
    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-accent)', fontFamily: 'var(--font-sans)',
    fontWeight: '600', fontSize: '11px', cursor: 'pointer',
    transition: 'all 200ms ease',
    background: 'var(--bg-elevated)', color: '#fff',
  },
  stepCard: {
    margin: '8px 0', padding: '10px 12px',
    background: 'rgba(108,92,231,0.06)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(108,92,231,0.15)',
  },
  faceSelector: {
    display: 'flex', gap: '4px', justifyContent: 'center',
    marginBottom: '6px', flexWrap: 'wrap',
  },
  faceBtn: (active, scanned) => ({
    padding: '4px 10px', borderRadius: '6px',
    border: active ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
    background: active ? 'var(--accent-glow)' : scanned ? 'rgba(0,200,83,0.15)' : 'var(--bg-card)',
    color: scanned && !active ? '#00c853' : 'var(--text-primary)',
    fontFamily: 'var(--font-mono)', fontWeight: '600',
    fontSize: '12px', cursor: 'pointer', transition: 'all 150ms ease',
  }),
  status: {
    textAlign: 'center', color: 'var(--text-secondary)',
    fontSize: '12px', marginTop: '6px', fontFamily: 'var(--font-mono)',
  },
  progressRow: {
    display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '6px',
  },
  progressDot: (done, active) => ({
    width: '7px', height: '7px', borderRadius: '50%',
    background: done ? '#00c853' : active ? 'var(--accent-primary)' : 'var(--bg-card)',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
  }),
  // Detected colors preview grid container
  detectedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '3px',
    padding: '6px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '8px',
    maxWidth: '120px',
    margin: '8px auto 0',
  },
  detectedCell: (color) => ({
    width: '32px', height: '32px',
    borderRadius: '4px',
    backgroundColor: COLOR_HEX[color] || '#333',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 200ms ease',
  }),
};

// Component to render a 3D cube demonstrating rotation directions (Left, Right, Up, Down)
function CaptureGuideCube({ rotationArrow, activeFace }) {
  const [phase, setPhase] = useState(0);

  // requestAnimationFrame hook to update rotation phases dynamically
  useEffect(() => {
    if (!rotationArrow) return undefined;

    let frame = 0;
    let startTime = null;

    const animate = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      setPhase(elapsed);
      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [rotationArrow, activeFace]);

  // Loop cycle length: 2.6 seconds for snappy, responsive looping visual demonstration
  const cycle = 2.6;
  const t = phase % cycle;
  
  let p;
  if (t < 0.4) {
    p = 0; // Pause at starting position (facing user directly)
  } else if (t < 1.6) {
    // Smooth ease-in-out rotation to demonstration state
    const norm = (t - 0.4) / 1.2;
    p = norm * norm * (3 - 2 * norm);
  } else if (t < 2.0) {
    p = 1; // Pause at rotated state (so user can clearly see)
  } else {
    // Smooth ease-in-out rotation back to starting position
    const norm = (t - 2.0) / 0.6;
    p = 1 - (norm * norm * (3 - 2 * norm));
  }

  // Calculate angles (resting state is 0, 0)
  let rotateX = 0;
  let rotateY = 0;

  // Set rotation degrees depending on guide direction
  if (rotationArrow === 'left') {
    rotateY = p * -90; // Demonstrates rotating left Y-axis
  } else if (rotationArrow === 'right') {
    rotateY = p * 90;  // Demonstrates rotating right Y-axis
  } else if (rotationArrow === 'up') {
    rotateX = p * -90; // Demonstrates tilting up X-axis
  } else if (rotationArrow === 'down') {
    rotateX = p * 90;  // Demonstrates tilting down X-axis
  }

  // Western scheme colors to match real Rubik's cube:
  // Front: Green, Back: Blue, Right: Red, Left: Orange, Top: White, Bottom: Yellow
  const faceColors = {
    front: '#00c853',
    back: '#2979ff',
    right: '#ff3b3b',
    left: '#ff8c00',
    top: '#f0f0f0',
    bottom: '#ffd93d',
  };

  // Generate 3D face styling configurations
  const faceStyle = (transform, bg) => ({
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform,
    transformStyle: 'preserve-3d',
    background: bg,
    border: '1px solid rgba(0, 0, 0, 0.95)',
    borderRadius: '6px',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22)',
    backfaceVisibility: 'hidden',
  });

  // Render 3x3 layout of stickers inside each guide face
  const stickerGrid = (color) => (
    <div style={{
      position: 'absolute', inset: '4px', display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5px',
    }}>
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} style={{
          borderRadius: '1.5px',
          background: color,
          opacity: index % 2 === 0 ? 0.96 : 0.85,
          border: '1px solid rgba(255,255,255,0.25)',
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', zIndex: 2,
    }}>
      <div style={{
        position: 'relative', width: '90px', height: '90px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        perspective: '400px',
      }}>
        {/* Curved arrow: rotates WITH the cube, fixed relative to it, and remains fully visible */}
        {rotationArrow === 'left' && (
          <svg viewBox="0 0 120 120" style={{
            position: 'absolute', width: '100px', height: '100px',
            transform: 'rotateX(75deg) translateZ(4px)',
            transformStyle: 'preserve-3d',
            overflow: 'visible', pointerEvents: 'none', zIndex: 10,
          }}>
            <defs>
              <filter id="glow-left" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M 92 60 A 32 18 0 0 1 28 60" fill="none" stroke="#ff5252" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow-left)" />
            <path d="M 36 50 L 28 60 L 38 68" fill="none" stroke="#ff5252" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-left)" />
          </svg>
        )}
        {rotationArrow === 'right' && (
          <svg viewBox="0 0 120 120" style={{
            position: 'absolute', width: '100px', height: '100px',
            transform: 'rotateX(75deg) translateZ(4px)',
            transformStyle: 'preserve-3d',
            overflow: 'visible', pointerEvents: 'none', zIndex: 10,
          }}>
            <defs>
              <filter id="glow-right" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M 28 60 A 32 18 0 0 0 92 60" fill="none" stroke="#ff5252" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow-right)" />
            <path d="M 84 50 L 92 60 L 82 68" fill="none" stroke="#ff5252" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-right)" />
          </svg>
        )}
        {rotationArrow === 'up' && (
          <svg viewBox="0 0 120 120" style={{
            position: 'absolute', width: '100px', height: '100px',
            transform: 'rotateY(75deg) translateZ(4px)',
            transformStyle: 'preserve-3d',
            overflow: 'visible', pointerEvents: 'none', zIndex: 10,
          }}>
            <defs>
              <filter id="glow-up" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M 60 92 A 18 32 0 0 0 60 28" fill="none" stroke="#00e676" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow-up)" />
            <path d="M 50 36 L 60 28 L 68 38" fill="none" stroke="#00e676" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-up)" />
          </svg>
        )}
        {rotationArrow === 'down' && (
          <svg viewBox="0 0 120 120" style={{
            position: 'absolute', width: '100px', height: '100px',
            transform: 'rotateY(75deg) translateZ(4px)',
            transformStyle: 'preserve-3d',
            overflow: 'visible', pointerEvents: 'none', zIndex: 10,
          }}>
            <defs>
              <filter id="glow-down" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <path d="M 60 28 A 18 32 0 0 0 60 92" fill="none" stroke="#ffd93d" strokeWidth="4.5" strokeLinecap="round" filter="url(#glow-down)" />
            <path d="M 50 84 L 60 92 L 68 82" fill="none" stroke="#ffd93d" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-down)" />
          </svg>
        )}

        {/* 3D Cube (Size 64x64x64) */}
        <div style={{
          position: 'relative', width: '64px', height: '64px',
          transformStyle: 'preserve-3d',
        }}>
          <div style={faceStyle('translateZ(32px)', faceColors.front)}>{stickerGrid(faceColors.front)}</div>
          <div style={faceStyle('rotateY(180deg) translateZ(32px)', faceColors.back)}>{stickerGrid(faceColors.back)}</div>
          <div style={faceStyle('rotateY(90deg) translateZ(32px)', faceColors.right)}>{stickerGrid(faceColors.right)}</div>
          <div style={faceStyle('rotateY(-90deg) translateZ(32px)', faceColors.left)}>{stickerGrid(faceColors.left)}</div>
          <div style={faceStyle('rotateX(90deg) translateZ(32px)', faceColors.top)}>{stickerGrid(faceColors.top)}</div>
          <div style={faceStyle('rotateX(-90deg) translateZ(32px)', faceColors.bottom)}>{stickerGrid(faceColors.bottom)}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Grid Overlay WITH arrows & face label ─────────── */
function GridOverlay({ width, height, faceInfo, detectedColors, size = 3 }) {
  if (!width || !height) return null;
  // Match backend padding: 15%
  const pad = 0.15;
  const x1 = width * pad, x2 = width * (1 - pad);
  const y1 = height * pad, y2 = height * (1 - pad);
  const cw = (x2 - x1) / size;
  const ch = (y2 - y1) / size;
  const cx = width / 2, cy = height / 2;
  const arrow = faceInfo.rotationArrow;
  const innerLines = Array.from({ length: size - 1 }, (_, i) => i + 1);

  return (
    <svg style={styles.overlay} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid Border */}
      <rect x={x1} y={y1} width={x2 - x1} height={y2 - y1}
        fill="none" stroke={GRID_COLOR} strokeWidth="2" rx="6" />
      {/* Vertical divider lines */}
      {innerLines.map(i => (
        <line key={`v${i}`} x1={x1 + cw * i} y1={y1} x2={x1 + cw * i} y2={y2}
          stroke={GRID_COLOR} strokeWidth="1.5" />
      ))}
      {/* Horizontal divider lines */}
      {innerLines.map(i => (
        <line key={`h${i}`} x1={x1} y1={y1 + ch * i} x2={x2} y2={y1 + ch * i}
          stroke={GRID_COLOR} strokeWidth="1.5" />
      ))}

      {/* Center sampling dots — show where detection is sampling */}
      {Array.from({ length: size }).map((_, r) =>
        Array.from({ length: size }).map((_, c) => {
          const dotCx = x1 + cw * (c + 0.5);
          const dotCy = y1 + ch * (r + 0.5);
          const idx = r * size + c;
          const detected = detectedColors?.[idx];
          return (
            <g key={`d${r}${c}`}>
              {/* Sampling area indicator */}
              <rect
                x={dotCx - cw * 0.25} y={dotCy - ch * 0.25}
                width={cw * 0.5} height={ch * 0.5}
                rx={Math.max(1, Math.min(3, cw * 0.1))}
                fill={detected ? (COLOR_HEX[detected] || 'transparent') : 'transparent'}
                opacity={detected ? 0.5 : 0}
                stroke={detected ? '#fff' : GRID_COLOR}
                strokeWidth={detected ? 1 : 0}
              />
              {/* Center dot */}
              <circle cx={dotCx} cy={dotCy}
                r={Math.max(1.5, Math.min(3, cw * 0.08))} fill={detected ? '#fff' : GRID_COLOR} opacity={detected ? 0.9 : 0.5} />
            </g>
          );
        })
      )}

      {/* Center sticker highlight ring — dashed */}
      <circle cx={x1 + cw * (size / 2)} cy={y1 + ch * (size / 2)}
        r={Math.min(cw, ch) * 0.35}
        fill="none" stroke="#fff" strokeWidth="2"
        strokeDasharray="6 3" opacity="0.7" />

      {/* Face label badge */}
      <rect x={cx - 55} y={4} width={110} height={24} rx={12}
        fill="rgba(0,0,0,0.75)" />
      <text x={cx} y={20} textAnchor="middle"
        fill="#fff" fontSize="12" fontWeight="700"
        fontFamily="sans-serif">
        Step {faceInfo.stepNumber}: {faceInfo.label}
      </text>

      {/* Directional arrows */}
      {arrow === 'up' && (
        <g>
          <line x1={x2 + 25} y1={cy + 50} x2={x2 + 25} y2={cy - 50}
            stroke="#00e676" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <polygon points={`${x2 + 25},${cy - 50} ${x2 + 18},${cy - 38} ${x2 + 25},${cy - 41} ${x2 + 32},${cy - 38}`}
            fill="#00e676" opacity="0.9" />
          <text x={x2 + 34} y={cy - 5} textAnchor="start"
            fill="#00e676" fontSize="12" fontWeight="900" fontFamily="sans-serif">
            TILT
          </text>
          <text x={x2 + 34} y={cy + 10} textAnchor="start"
            fill="#00e676" fontSize="12" fontWeight="900" fontFamily="sans-serif">
            UP ↑
          </text>
        </g>
      )}
      {arrow === 'down' && (
        <g>
          <line x1={x2 + 25} y1={cy - 50} x2={x2 + 25} y2={cy + 50}
            stroke="#ffd93d" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <polygon points={`${x2 + 25},${cy + 50} ${x2 + 18},${cy + 38} ${x2 + 25},${cy + 41} ${x2 + 32},${cy + 38}`}
            fill="#ffd93d" opacity="0.9" />
          <text x={x2 + 34} y={cy - 5} textAnchor="start"
            fill="#ffd93d" fontSize="12" fontWeight="900" fontFamily="sans-serif">
            TILT
          </text>
          <text x={x2 + 34} y={cy + 10} textAnchor="start"
            fill="#ffd93d" fontSize="12" fontWeight="900" fontFamily="sans-serif">
            DOWN ↓
          </text>
        </g>
      )}
      {arrow === 'left' && (
        <g>
          <path d={`M ${cx + 60} ${cy + 85} Q ${cx} ${cy + 105} ${cx - 60} ${cy + 85}`}
            fill="none" stroke="#ff5252" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <polygon points={`${cx - 60},${cy + 85} ${cx - 45},${cy + 75} ${cx - 48},${cy + 85} ${cx - 45},${cy + 95}`}
            fill="#ff5252" opacity="0.9" />
          <text x={cx} y={cy + 73} textAnchor="middle"
            fill="#ff5252" fontSize="12" fontWeight="900" fontFamily="sans-serif">
            ROTATE LEFT ⟲
          </text>
        </g>
      )}
    </svg>
  );
}

/* ── Detected Colors Mini Preview ─────────── */
// Component rendering a miniature grid reflecting the colors scanned/detected on the face
function DetectedPreview({ colors, label, size = 3 }) {
  if (!colors) return null;
  // Calculate cell size dynamically so the grid preview stays compact
  const gridWidth = Math.min(180, size * 24);
  const cellSize = Math.max(12, Math.floor(gridWidth / size) - 3);

  return (
    <div style={{ textAlign: 'center', marginTop: '6px' }}>
      <div style={{
        fontSize: '10px', color: 'var(--text-muted)',
        marginBottom: '3px', fontFamily: 'var(--font-mono)',
      }}>
        {label} — detected:
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gap: '2px',
        padding: '6px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '8px',
        maxWidth: `${gridWidth}px`,
        margin: '8px auto 0',
      }}>
        {/* Render each detected sticker color swatch */}
        {colors.map((color, i) => (
          <div key={i} style={{
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            borderRadius: '2.5px',
            backgroundColor: COLOR_HEX[color] || '#333',
            border: '1px solid rgba(255,255,255,0.2)',
            transition: 'all 200ms ease',
          }}
            title={`[${i}] ${color}`} />
        ))}
      </div>
    </div>
  );
}

// Main CameraCapture Component
export default function CameraCapture({ 
  onFaceScanned, 
  size = 3,
  mode = 'scan',
  onColorsDetected,
  isTransitioning = false,
  currentMove = null,
  playbackStep = -1,
  solutionLength = 0,
  showSolvedAnimation = false,
  onResetSolved
}) {
  const webcamRef = useRef(null);
  // State hook tracking which face is currently being scanned (defaults to Front)
  const [activeFace, setActiveFace] = useState('F');
  // State hook tracking if scanner request is in flight
  const [scanning, setScanning] = useState(false);
  // Set tracking which faces have been captured successfully
  const [scannedFaces, setScannedFaces] = useState(new Set());
  // Map recording center colors of scanned faces to check orientation mapping
  const [scannedCenters, setScannedCenters] = useState({});
  // Colors detected from the most recent camera frame scan
  const [lastDetected, setLastDetected] = useState(null); 
  const [lastDetectedFace, setLastDetectedFace] = useState(null);
  // Status message string for instructions
  const [status, setStatus] = useState('Pick up the cube — point any face at the camera');

  const currentIdx = FACE_ORDER.indexOf(activeFace);
  const nextFace = currentIdx < FACE_ORDER.length - 1 ? FACE_ORDER[currentIdx + 1] : null;
  const info = FACE_INFO[activeFace];
  const nextInfo = nextFace ? FACE_INFO[nextFace] : null;

  // Continuous polling loop in solve mode to check if user has executed step correctly
  useEffect(() => {
    // Return if not in solve mode, transitioning, or modal completed is shown
    if (mode !== 'solve' || isTransitioning || showSolvedAnimation) return;

    let active = true;
    let timer = null;

    // Async function to grab screenshots and request classification
    const runDetection = async () => {
      if (!active) return;
      const webcam = webcamRef.current;
      // Retry after delay if webcam is offline
      if (!webcam) {
        timer = setTimeout(runDetection, 300);
        return;
      }

      // Grab base64 image representation from webcam stream
      const imageSrc = webcam.getScreenshot();
      if (!imageSrc) {
        timer = setTimeout(runDetection, 300);
        return;
      }

      setScanning(true);
      try {
        // Strip base64 metadata header to extract raw data bytes
        const base64 = imageSrc.split(',')[1];
        // Request color classification from Python API backend
        const res = await fetch(`${API_URL}/detect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, size: size }),
        });
        const data = await res.json();
        
        // Pass detected colors to callback if response is successful
        if (active && !data.error && data.colors) {
          setLastDetected(data.colors);
          onColorsDetected?.(data.colors);
        }
      } catch (err) {
        console.error("Continuous detection error:", err);
      } finally {
        if (active) {
          setScanning(false);
          // Set next poll delay (400ms)
          timer = setTimeout(runDetection, 400); 
        }
      }
    };

    // Run first update
    runDetection();

    // Clean up timer handles on unmount
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [mode, size, isTransitioning, showSolvedAnimation, onColorsDetected]);

  // Determine affected faces for the current move to guide the user (e.g. U affects F, R, B, L)
  const changedFaces = useMemo(() => {
    if (!currentMove) return [];
    
    // Parse notation parts
    const match = currentMove.match(/^(\d+)?([URFDLB])(w)?(['2])?$/);
    if (!match) return [];
    const [, layerStr, face, wide] = match;
    
    const affected = new Set();
    affected.add(face);
    
    const adjacent = {
      U: ['F', 'R', 'B', 'L'],
      D: ['F', 'R', 'B', 'L'],
      R: ['U', 'B', 'D', 'F'],
      L: ['U', 'F', 'D', 'B'],
      F: ['U', 'R', 'D', 'L'],
      B: ['U', 'L', 'D', 'R']
    };
    
    if (adjacent[face]) {
      adjacent[face].forEach(f => affected.add(f));
    }
    
    const faceNames = {
      U: 'Top (White)',
      R: 'Right (Red)',
      F: 'Front (Green)',
      D: 'Bottom (Yellow)',
      L: 'Left (Orange)',
      B: 'Back (Blue)'
    };
    
    // Convert face letters to readable names
    return Array.from(affected).map(f => faceNames[f] || f);
  }, [currentMove]);

  // Visual header object configuration in solve mode
  const solveFaceInfo = {
    stepNumber: playbackStep + 2,
    label: `Solve: ${currentMove || ''}`,
    rotationArrow: null
  };

  // Capture callback: runs when user clicks 'Capture Face' button in scanning mode
  const capture = useCallback(async () => {
    const webcam = webcamRef.current;
    if (!webcam) return;

    setScanning(true);
    setStatus('📸 Analyzing colours…');

    try {
      // Get base64 frame data URL from video component
      const imageSrc = webcam.getScreenshot();
      if (!imageSrc) {
        setStatus('❌ Failed to capture — check camera permissions');
        setScanning(false);
        return;
      }
      const base64 = imageSrc.split(',')[1];
      // Send BGR image to OpenCV Flask endpoint
      const res = await fetch(`${API_URL}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, size: size }),
      });
      const data = await res.json();

      if (data.error) {
        setStatus(`❌ ${data.error}`);
      } else {
        // Send colors layout array back to parent component
        onFaceScanned(activeFace, data.colors);
        // Identify center sticker color (index computed from middle row/col)
        const centerIdx = Math.floor(size / 2) * size + Math.floor(size / 2);
        const centerColor = data.colors[centerIdx];
        setScannedCenters(prev => ({ ...prev, [activeFace]: centerColor }));
        setScannedFaces(prev => new Set([...prev, activeFace]));
        setLastDetected(data.colors);
        setLastDetectedFace(activeFace);
        setStatus(`✅ ${info.label} captured!${centerColor ? ` (center: ${centerColor})` : ''}`);

        // Debug outputs
        if (data.debug) {
          console.log(`[${activeFace}] HSV medians:`, data.debug.hsv_medians);
          console.log(`[${activeFace}] RGB medians:`, data.debug.rgb_medians);
        }

        // Auto transition to next face in sequence after a short delay
        if (nextFace) {
          setTimeout(() => {
            setActiveFace(nextFace);
            setStatus(`Now: ${FACE_INFO[nextFace].rotation || 'ready'}`);
          }, 1200);
        } else {
          setStatus('🎉 All 6 faces scanned! Hit Solve!');
        }
      }
    } catch {
      setStatus('❌ Backend offline — start server with: python server.py');
    }
    setScanning(false);
  }, [activeFace, nextFace, info, onFaceScanned, size]);

  return (
    <div>
      {/* Face tab selector buttons (Scan mode only) */}
      {mode === 'scan' && (
        <div style={styles.faceSelector}>
          {FACE_ORDER.map(f => {
            const center = scannedCenters[f];
            return (
              <button key={f}
                style={styles.faceBtn(f === activeFace, scannedFaces.has(f))}
                onClick={() => { setActiveFace(f); setLastDetected(null); }}>
                {scannedFaces.has(f) ? '✓' : ''}{f}
                {center && (
                  <span style={{
                    display: 'inline-block', width: '8px', height: '8px',
                    borderRadius: '50%', marginLeft: '3px',
                    background: COLOR_HEX[center] || '#888',
                    verticalAlign: 'middle',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Step card with instructions / guidance */}
      {mode === 'scan' ? (
        <div style={styles.stepCard}>
          {/* Step header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px',
          }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--accent-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '800', color: '#fff', flexShrink: 0,
            }}>
              {info.stepNumber}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Scan: {info.label} Face
            </span>
          </div>

          {/* How to rotate (for faces 2-6) */}
          {info.rotation && (
            <div style={{
              padding: '6px 10px', marginBottom: '5px',
              background: 'rgba(255,82,82,0.08)', borderRadius: '6px',
              border: '1px solid rgba(255,82,82,0.15)',
              fontSize: '11px', fontWeight: '600', color: '#ff8a80',
              lineHeight: '1.4',
            }}>
              🔄 {info.rotation}
            </div>
          )}

          {/* How to hold */}
          <div style={{
            fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4',
          }}>
            ✋ {info.holdingGuide}
          </div>

          {/* Tip for first face */}
          {info.stepNumber === 1 && (
            <div style={{
              marginTop: '5px', padding: '5px 8px',
              background: 'rgba(0,200,83,0.06)', borderRadius: '5px',
              border: '1px solid rgba(0,200,83,0.12)',
              fontSize: '10px', color: '#69f0ae', lineHeight: '1.4',
            }}>
              💡 <strong>Tip:</strong> You can start with ANY color as the front face.
              Just keep the same top throughout all 4 side scans.
            </div>
          )}
        </div>
      ) : (
        // Playback guidance card
        <div style={styles.stepCard}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px',
          }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '50%',
              background: 'var(--accent-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '800', color: '#fff', flexShrink: 0,
            }}>
              {playbackStep + 2}
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Next Move: <span style={{ color: 'var(--accent-primary)', fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{currentMove}</span>
            </span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', marginTop: '6px' }}>
            💡 <strong>Guidance:</strong> Perform the move, then show any affected face to the camera:
            <div style={{ marginTop: '4px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {changedFaces.join(', ')}
            </div>
          </div>

          <div style={{ 
            marginTop: '8px', 
            padding: '6px', 
            borderRadius: '6px', 
            background: isTransitioning ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            textAlign: 'center',
            fontSize: '11px',
            color: isTransitioning ? '#00c853' : 'var(--text-muted)',
            fontWeight: 'bold',
            border: isTransitioning ? '1px solid #00c853' : '1px solid var(--border-subtle)'
          }}>
            {isTransitioning ? '✅ Move completed! Advancing...' : scanning ? '📸 Analyzing camera feed...' : '👀 Waiting for move...'}
          </div>
        </div>
      )}

      {/* Webcam Viewport */}
      <div style={styles.wrapper}>
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.92}
          style={styles.webcam}
          videoConstraints={{
            width: { ideal: 480 },
            height: { ideal: 480 },
            facingMode: 'environment',
          }}
        />
        {/* Render 3D guide overlay cube in scanning mode */}
        {mode === 'scan' && (
          <CaptureGuideCube key={activeFace} rotationArrow={info.rotationArrow} activeFace={activeFace} />
        )}
        {/* Render grid alignment overlay guidelines */}
        <GridOverlay
          width={480} height={480} faceInfo={mode === 'solve' ? solveFaceInfo : info}
          detectedColors={lastDetected}
          size={size}
        />
      </div>

      {/* Progress Dots indicators (Scan mode only) */}
      {mode === 'scan' && (
        <div style={styles.progressRow}>
          {FACE_ORDER.map(f => (
            <div key={f}
              style={styles.progressDot(scannedFaces.has(f), f === activeFace)}
              title={FACE_INFO[f].label} />
          ))}
        </div>
      )}

      {/* Scanned status text (Scan mode only) */}
      {mode === 'scan' && <p style={styles.status}>{status}</p>}

      {/* Detected color swatches grid preview */}
      {lastDetected && (mode === 'solve' || lastDetectedFace === activeFace) && (
        <DetectedPreview
          colors={lastDetected}
          label={mode === 'solve' ? 'Live Camera' : FACE_INFO[activeFace].label}
          size={size}
        />
      )}

      {/* Action controls (Scan mode only) */}
      {mode === 'scan' && (
        <div style={styles.controls}>
          <button style={styles.btn} onClick={capture} disabled={scanning}>
            {scanning ? '⏳ Scanning…' : `📸 Capture ${info.label}`}
          </button>
          {scannedFaces.has(activeFace) && (
            <button style={styles.btnSmall} onClick={capture} disabled={scanning}>
              🔄 Re-scan
            </button>
          )}
        </div>
      )}

      {/* Dynamic guidance indicator for next rotation step (Scan mode only) */}
      {mode === 'scan' && nextInfo && !scanning && (
        <div style={{
          marginTop: '6px', padding: '6px 10px', textAlign: 'center',
          background: 'rgba(0,200,83,0.06)', borderRadius: '6px',
          border: '1px solid rgba(0,200,83,0.12)',
          fontSize: '11px', color: '#69f0ae',
        }}>
          <strong>Next:</strong> {nextInfo.label} — {nextInfo.rotation}
        </div>
      )}
    </div>
  );
}
