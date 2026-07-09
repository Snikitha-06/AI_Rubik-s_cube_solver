// Import React hooks for managing state variables, effects, memoization, callbacks, and element references
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Import child components
import Cube3D from './Cube3D';
import Cube2D from './Cube2D';
import ManualEditor from './ManualEditor';
import CameraCapture from './CameraCapture';
import SolutionPanel from './SolutionPanel';
// Import helpers from cube model library
import { 
  createEmptyState, 
  applyMoves, 
  cloneState,
  FACE_NAMES,
  COLORS,
  COLOR_HEX
} from '../lib/cube';

// Target URL prefix for Flask REST API server endpoints
const API_URL = '/api';

// Styling layout variables (CSS-in-JS style objects)
const s = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: '900',
    margin: 0,
    background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-1px',
  },
  nav: {
    display: 'flex',
    gap: '8px',
    background: 'var(--bg-card)',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
  },
  navBtn: (active) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: active ? 'var(--bg-secondary)' : 'transparent',
    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  }),
  // Main page grid separating navigation controls, canvas viewports, and progress solutions
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr 300px',
    gap: '24px',
    alignItems: 'start',
  },
  panel: {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--border-subtle)',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  button: (variant = 'primary') => ({
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    background: variant === 'primary' 
      ? 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)'
      : variant === 'secondary'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255, 107, 107, 0.15)',
    color: variant === 'danger' ? '#ff7675' : '#fff',
    marginTop: '12px',
    border: variant === 'secondary' ? '1px solid var(--border-subtle)' : 'none',
  }),
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    background: 'rgba(162, 155, 254, 0.15)',
    color: 'var(--accent-primary)',
    marginBottom: '12px',
    textTransform: 'uppercase',
  }
};

// Panel showing sticker totals to inform the user if the scanned colors layout is physically valid
function ColorCounts({ cubeState }) {
  const N = cubeState.size;
  const target = N * N; // Every standard color must count up to N*N (e.g. 9 for a 3x3)
  const counts = {};
  
  // Calculate frequencies of each color in active state
  FACE_NAMES.forEach(f => {
    if (Array.isArray(cubeState[f])) {
      cubeState[f].forEach(color => {
        counts[color] = (counts[color] || 0) + 1;
      });
    }
  });

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={s.badge}>📊 Sticker Counts (Goal: {target} each)</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        {COLORS.map(color => (
          <div key={color} style={{
            padding: '8px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            // Turn border green when color count exactly matches physical target
            border: counts[color] === target ? '1px solid #00b894' : '1px solid var(--border-subtle)',
            color: counts[color] === target ? '#00b894' : 'var(--text-secondary)',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLOR_HEX[color] }} />
            {counts[color] || 0}/{target}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main CubeApp Container Component
export default function CubeApp() {
  /* ── State variables ─────────────────────────────────── */
  
  // Size (N) of the Rubik's cube (defaults to 3)
  const [size, setSize] = useState(3);
  // Cube colors configuration state
  const [cubeState, setCubeState] = useState(createEmptyState(3));
  // Solved steps rotation move sequence list
  const [solution, setSolution] = useState([]);
  // Current active mode ('scan' camera, 'manual' editor, 'solve' tracker, 'visualize' viewport)
  const [inputMode, setInputMode] = useState('manual');
  // Loading status indicator when solver request is active
  const [solving, setSolving] = useState(false);
  // Loading status indicator when scramble request is active
  const [scrambling, setScrambling] = useState(false);
  // System error message text
  const [error, setError] = useState('');
  // Current step index of solution playback (-1 means initial unsolved state)
  const [playbackStep, setPlaybackStep] = useState(-1);
  // Keeps the sequence of moves that scrambled the cube (assists perfect solves)
  const [scrambleHistory, setScrambleHistory] = useState([]);
  // Throttle timer flag during auto-transition steps to prevent double clicks
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Status flag to pop up the success congratulations modal
  const [showSolvedAnimation, setShowSolvedAnimation] = useState(false);

  // Reference pointer to hold solution playback auto-run setTimeout timers
  const playTimerRef = useRef(null);

  // Clear running auto-run playback timers to avoid memory leaks
  const clearPlayTimer = () => {
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  };

  // Wipe states and apply updates when cube size configuration slider is moved
  const handleSizeChange = (newSize) => {
    clearPlayTimer();
    setSize(newSize);
    setCubeState(createEmptyState(newSize));
    setSolution([]);
    setPlaybackStep(-1);
    setBaseState(null);
    setAnimatingMove(null);
    setIsPlaying(false);
    setError('');
    setScrambleHistory([]);
    setIsTransitioning(false);
    setShowSolvedAnimation(false);
  };

  // State parameter representing move being animated in 3D canvas (e.g. 'R')
  const [animatingMove, setAnimatingMove] = useState(null);
  // Play status flag for auto-run playback
  const [isPlaying, setIsPlaying] = useState(false);
  // Playback timer delay in ms between consecutive moves (defaults to 400ms)
  const [animSpeed, setAnimSpeed] = useState(400);
  // Cube configuration snapshot before starting playback moves
  const [baseState, setBaseState] = useState(null);

  // Derived state: calculate colors layout configuration based on active step selection
  const displayState = useMemo(() => {
    if (!baseState || playbackStep < 0 || !solution.length) return cubeState;
    const movesToApply = solution.slice(0, playbackStep + 1);
    return applyMoves(cloneState(baseState), movesToApply);
  }, [cubeState, baseState, solution, playbackStep]);

  // Derived state checking if every single color has exactly N*N stickers
  const isColorCountValid = useMemo(() => {
    const counts = {};
    FACE_NAMES.forEach(f => {
      cubeState[f]?.forEach(color => {
        counts[color] = (counts[color] || 0) + 1;
      });
    });
    const N = cubeState.size;
    return COLORS.every(c => counts[c] === N * N);
  }, [cubeState]);

  /* ── Server API Handlers ────────────────────────────── */
  
  // Call server scramble endpoint to randomize the cube layout
  async function handleScramble() {
    clearPlayTimer();
    setScrambling(true);
    setError('');
    setSolution([]);
    setPlaybackStep(-1);
    setBaseState(null);
    setAnimatingMove(null);
    setIsPlaying(false);
    setIsTransitioning(false);
    setShowSolvedAnimation(false);
    try {
      const res = await fetch(`${API_URL}/scramble?size=${size}`);
      const data = await res.json();
      if (data.state) {
        setCubeState({ ...data.state, size });
        if (data.scramble) setScrambleHistory(data.scramble);
      }
    } catch {
      setError('Could not connect to server.');
    }
    setScrambling(false);
  }

  // Call server solve endpoint to calculate solution sequence path
  async function handleSolve() {
    // Return early if color totals are invalid
    if (!isColorCountValid) {
      setError('Invalid state: Check color counts.');
      return;
    }
    setSolving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          state: cubeState,
          history: scrambleHistory 
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        // Store solution sequence
        setSolution(data.solution);
        // Snapshot layout state to calculate playback increments
        setBaseState(cloneState(cubeState));
        setPlaybackStep(-1);
      }
    } catch {
      setError('Server error.');
    }
    setSolving(false);
  }

  // Clean and reset all variables to original defaults
  function handleReset() {
    clearPlayTimer();
    setCubeState(createEmptyState(size));
    setSolution([]);
    setPlaybackStep(-1);
    setBaseState(null);
    setAnimatingMove(null);
    setIsPlaying(false);
    setError('');
    setScrambleHistory([]);
    setIsTransitioning(false);
    setShowSolvedAnimation(false);
  }

  // Helper to rotate a face's colors 90 degrees clockwise (for rotation-invariant matching)
  const rotateFaceCW = (stickers, N) => {
    const result = new Array(N * N);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        result[c * N + (N - 1 - r)] = stickers[r * N + c];
      }
    }
    return result;
  };

  // Helper to compare detected colors with target face colors under 4 possible rotations
  const getBestMatchScore = (detected, target, N) => {
    let maxScore = 0;
    let current = target;
    
    // Compare face layout at 0, 90, 180, and 270 degrees rotations
    for (let rot = 0; rot < 4; rot++) {
      let score = 0;
      for (let i = 0; i < N * N; i++) {
        if (detected[i] === current[i]) {
          score++;
        }
      }
      if (score > maxScore) {
        maxScore = score;
      }
      current = rotateFaceCW(current, N);
    }
    
    return maxScore;
  };

  // Handler for continuous colors detected from the camera during solving
  const handleColorsDetected = useCallback((detectedColors) => {
    // Skip checking if auto transition, solved popup is open, or solution is empty
    if (isTransitioning || showSolvedAnimation || !baseState || !solution.length) return;

    // Retrieve move index we are trying to complete
    const currentStepIndex = playbackStep + 1; // The move we want to complete
    if (currentStepIndex >= solution.length) return;

    // 1. Calculate states before and after this move
    const stateBefore = currentStepIndex === 0 
      ? baseState 
      : applyMoves(cloneState(baseState), solution.slice(0, currentStepIndex));
      
    const stateAfter = applyMoves(cloneState(baseState), solution.slice(0, currentStepIndex + 1));
    
    const N = size;
    let identifiedFace = null;
    let bestScore = -1;

    // For odd sizes, try using the center color to identify which face is facing the camera
    if (N % 2 === 1) {
      const centerIdx = Math.floor(N / 2) * N + Math.floor(N / 2);
      const centerColor = detectedColors[centerIdx];
      const faceMap = {
        white: 'U',
        red: 'R',
        green: 'F',
        yellow: 'D',
        orange: 'L',
        blue: 'B'
      };
      identifiedFace = faceMap[centerColor];
    }

    // Fallback/Even sizes: find the face that yields the highest similarity score
    if (!identifiedFace) {
      for (const face of FACE_NAMES) {
        const score = getBestMatchScore(detectedColors, stateAfter[face], N);
        if (score > bestScore) {
          bestScore = score;
          identifiedFace = face;
        }
      }
    }

    if (!identifiedFace) return;

    // 2. Check if this face actually changed during the move
    const faceColorsBefore = stateBefore[identifiedFace];
    const faceColorsAfter = stateAfter[identifiedFace];
    const hasChanged = !faceColorsBefore.every((c, i) => c === faceColorsAfter[i]);

    if (!hasChanged) {
      // Ignore faces that aren't affected by the current move to avoid premature triggering
      return;
    }

    // 3. Check if the detected colors match the face's target state
    const matchScore = getBestMatchScore(detectedColors, faceColorsAfter, N);
    const requiredMatches = Math.ceil(0.85 * N * N); // Require 85% match accuracy to trigger

    if (matchScore >= requiredMatches) {
      // Match found! Auto-advance.
      triggerMoveAdvancement();
    }
  }, [playbackStep, solution, baseState, size, isTransitioning, showSolvedAnimation]);

  // Advance playback index when camera detects a rotation was completed by user
  const triggerMoveAdvancement = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    setPlaybackStep(prev => {
      const nextStep = prev + 1;
      
      // If we just completed the last move, show success congratulations popup
      if (nextStep >= solution.length - 1) {
        setShowSolvedAnimation(true);
        setIsPlaying(false);
      }
      
      return nextStep;
    });

    // Hold detection for 500ms to debounce and let user see the transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 500);
  };

  // Triggered when a face camera scan completes
  const handleFaceScanned = useCallback((face, colors) => {
    setCubeState(prev => {
      const next = cloneState(prev);
      next[face] = colors;
      return next;
    });
    setError('');
  }, []);

  // Update playback step index
  const handleStepChange = (step) => {
    clearPlayTimer();
    if (step < -1 || step >= solution.length) return;
    setPlaybackStep(step);
    setAnimatingMove(null);
  };

  // Toggle playback auto-run timers
  const togglePlay = () => {
    if (solution.length === 0) return;
    
    setIsPlaying(prevIsPlaying => {
      const nextIsPlaying = !prevIsPlaying;
      
      clearPlayTimer();
      
      if (nextIsPlaying) {
        let currentStep = playbackStep;
        // Loop back to start if we finished the solution sequence
        if (currentStep >= solution.length - 1) {
          currentStep = -1;
          setPlaybackStep(-1);
        }
        
        const nextStep = currentStep + 1;
        if (nextStep < solution.length) {
          playTimerRef.current = setTimeout(() => {
            setAnimatingMove(solution[nextStep]);
          }, 100);
        }
      } else {
        setAnimatingMove(null);
      }
      
      return nextIsPlaying;
    });
  };

  // Clean up timer on component unmount
  useEffect(() => {
    return () => clearPlayTimer();
  }, []);

  // Callback triggered when 3D rotation animation completes
  const handleAnimationComplete = () => {
    clearPlayTimer();
    
    setPlaybackStep(prev => {
      const nextStep = prev + 1;
      
      // If playing is active, queue up the next move rotation
      if (isPlaying && nextStep < solution.length - 1) {
        playTimerRef.current = setTimeout(() => {
          setAnimatingMove(solution[nextStep + 1]);
        }, animSpeed);
      } else if (nextStep >= solution.length - 1) {
        setIsPlaying(false);
      }
      
      return nextStep;
    });
    
    setAnimatingMove(null);
  };

  return (
    <div style={s.container}>
      {/* Page Title Header and Nav Tabs */}
      <header style={s.header}>
        <h1 style={s.title}>Rubik's Cube <span style={{ color: 'var(--text-primary)', fontWeight: '400' }}>Solver</span></h1>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={s.nav}>
            <button style={s.navBtn(inputMode === 'scan')} onClick={() => setInputMode('scan')}>Scan</button>
            <button style={s.navBtn(inputMode === 'manual')} onClick={() => setInputMode('manual')}>Edit</button>
            <button style={s.navBtn(inputMode === 'solve')} onClick={() => setInputMode('solve')}>Solve</button>
            <button style={s.navBtn(inputMode === 'visualize')} onClick={() => setInputMode('visualize')}>Visualize</button>
          </div>

          {/* Size slider bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 12px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Size:</span>
            <input 
              type="range" min="2" max="21" value={size} 
              onChange={(e) => handleSizeChange(parseInt(e.target.value))}
              style={{ width: '80px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#fff', fontFamily: 'var(--font-mono)', minWidth: '40px' }}>
              {size}x{size}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid split into 3 panels */}
      <main style={s.mainGrid}>
        {/* Left Side: Input Panel (Camera scan, Paint editor, or Auto-Step solver feeds) */}
        <section style={{ ...s.panel, overflowY: 'auto', maxHeight: 'calc(100vh - 160px)' }}>
          <div style={s.badge}>Input Method</div>
          
          {inputMode === 'scan' && (
            <CameraCapture onFaceScanned={handleFaceScanned} size={size} />
          )}

          {inputMode === 'manual' && (
            <ManualEditor 
              cubeState={cubeState} 
              onStateChange={setCubeState} 
            />
          )}

          {inputMode === 'solve' && (
            solution.length > 0 ? (
              <CameraCapture 
                mode="solve"
                size={size}
                onColorsDetected={handleColorsDetected}
                isTransitioning={isTransitioning}
                currentMove={solution[playbackStep + 1]}
                playbackStep={playbackStep}
                solutionLength={solution.length}
                showSolvedAnimation={showSolvedAnimation}
                onResetSolved={() => {
                  setShowSolvedAnimation(false);
                  handleStepChange(-1);
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                <div style={{ 
                  padding: '16px', borderRadius: '12px', textAlign: 'center',
                  background: 'rgba(108, 92, 231, 0.08)', border: '1px solid rgba(108, 92, 231, 0.2)' 
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔮</div>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {isColorCountValid ? 'Ready to Solve!' : 'Verification Required'}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                    {isColorCountValid 
                      ? 'The sticker counts are valid. Hit the Solve button below to generate the solution.'
                      : `To solve, each color must have exactly ${size * size} stickers. Scan or Edit the cube to correct any errors.`}
                  </p>
                </div>
              </div>
            )
          )}

          {inputMode === 'visualize' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '24px' }}>✨</div>
              Use the 3D and 2D views to visualize the cube state. You can rotate the 3D cube with your mouse or touch controls.
            </div>
          )}

          {/* Trigger Solve controls */}
          {((inputMode === 'manual' || inputMode === 'solve') && solution.length === 0) && (
            <>
              <ColorCounts cubeState={cubeState} />

              <button 
                style={s.button('primary')} 
                onClick={handleSolve}
                disabled={solving || !isColorCountValid}
              >
                {solving ? 'Solving...' : '🔮 Solve'}
              </button>
            </>
          )}

          {/* Scramble and Reset controls */}
          <button 
            style={s.button('secondary')} 
            onClick={handleScramble}
            disabled={scrambling}
          >
            {scrambling ? 'Mixing...' : '🔀 Scramble'}
          </button>

          <button 
            style={s.button('danger')} 
            onClick={handleReset}
          >
            ↺ Reset
          </button>

          {/* Error notifications */}
          {error && (
            <div style={{ 
              marginTop: '16px', padding: '12px', borderRadius: '10px', 
              background: 'rgba(255, 107, 107, 0.1)', color: '#ff7675', fontSize: '12px',
              border: '1px solid rgba(255, 107, 107, 0.2)'
            }}>
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Center Panel: Viewport visualizers */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 3D Visualizer Canvas container */}
          <div style={{ ...s.panel, height: '480px', padding: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1, display: 'flex', gap: '8px' }}>
              <div style={s.badge}>💎 Cube View</div>
            </div>
            
            <Cube3D
              key={`cube3d-${size}`}
              cubeState={displayState}
              autoRotate={!solution.length}
              animatingMove={animatingMove}
              animDuration={animSpeed}
              onAnimationComplete={handleAnimationComplete}
            />
          </div>

          {/* 2D Unfolded Grid container */}
          <div style={{ ...s.panel, padding: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
              2D Unfolded View ({size}x{size})
            </div>
            <Cube2D
              key={`cube2d-${size}`}
              cubeState={displayState}
            />
          </div>
        </section>

        {/* Right Side: Solution navigation list and step descriptions */}
        <section style={s.panel}>
          <div style={s.badge}>📜 Solution</div>
          <SolutionPanel 
            solution={solution}
            currentStep={playbackStep}
            isPlaying={isPlaying}
            speed={animSpeed}
            onSpeedChange={setAnimSpeed}
            onPlay={togglePlay}
            onStepForward={() => handleStepChange(playbackStep + 1)}
            onStepBack={() => handleStepChange(playbackStep - 1)}
            onReset={() => handleStepChange(-1)}
            onMoveHighlight={handleStepChange}
          />
        </section>
      </main>

      {/* Solved Success Congratulations Modal Popup */}
      {showSolvedAnimation && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '2px solid #00b894',
            borderRadius: '24px',
            padding: '40px 30px',
            maxWidth: '450px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0, 184, 148, 0.3)',
            animation: 'slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <div style={{ fontSize: '72px', marginBottom: '20px', animation: 'bounce 1s infinite' }}>🎉</div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              color: '#00b894',
              margin: '0 0 10px 0',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>Cube Solved!</h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              margin: '0 0 28px 0'
            }}>
              Congratulations! Every rotation has been completed successfully. The cube is now fully solved.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                style={{
                  ...s.button('primary'),
                  background: 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: '800'
                }}
                onClick={() => {
                  setShowSolvedAnimation(false);
                  handleReset();
                }}
              >
                ↺ Solve Another Cube
              </button>
              <button
                style={{
                  ...s.button('secondary'),
                  margin: 0,
                  fontSize: '13px'
                }}
                onClick={() => setShowSolvedAnimation(false)}
              >
                Close Guidance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
