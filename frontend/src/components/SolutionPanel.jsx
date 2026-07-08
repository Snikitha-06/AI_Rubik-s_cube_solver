

const MOVE_DESCRIPTIONS = {
  U: "Turn the TOP face clockwise",
  "U'": "Turn the TOP face counter-clockwise",
  U2: "Turn the TOP face 180°",
  D: "Turn the BOTTOM face clockwise",
  "D'": "Turn the BOTTOM face counter-clockwise",
  D2: "Turn the BOTTOM face 180°",
  R: "Turn the RIGHT face clockwise",
  "R'": "Turn the RIGHT face counter-clockwise",
  R2: "Turn the RIGHT face 180°",
  L: "Turn the LEFT face clockwise",
  "L'": "Turn the LEFT face counter-clockwise",
  L2: "Turn the LEFT face 180°",
  F: "Turn the FRONT face clockwise",
  "F'": "Turn the FRONT face counter-clockwise",
  F2: "Turn the FRONT face 180°",
  B: "Turn the BACK face clockwise",
  "B'": "Turn the BACK face counter-clockwise",
  B2: "Turn the BACK face 180°",
};

const MOVE_FACE_COLORS = {
  U: '#f0f0f0', D: '#ffd93d', R: '#ff3b3b',
  L: '#ff8c00', F: '#00c853', B: '#2979ff',
};

const styles = {
  container: { padding: '4px 0' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px',
  },
  title: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' },
  badge: {
    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
    fontFamily: 'var(--font-mono)', background: 'rgba(108,92,231,0.15)',
    color: 'var(--accent-secondary)', border: '1px solid var(--border-accent)',
  },
  progress: {
    width: '100%', height: '4px', borderRadius: '2px',
    background: 'var(--bg-card)', marginBottom: '12px', overflow: 'hidden',
  },
  progressBar: (pct) => ({
    width: `${pct}%`, height: '100%', background: 'var(--accent-gradient)',
    borderRadius: '2px', transition: 'width 200ms ease',
  }),
  /* Current move highlight box */
  currentMoveBox: {
    padding: '12px 16px', marginBottom: '12px',
    background: 'rgba(108,92,231,0.08)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(108,92,231,0.25)',
    textAlign: 'center',
  },
  currentMoveNotation: {
    fontSize: '28px', fontWeight: '900', fontFamily: 'var(--font-mono)',
    lineHeight: 1.2,
  },
  currentMoveDesc: {
    fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px',
    fontWeight: '500',
  },
  /* Steps list */
  stepsList: {
    maxHeight: '240px', overflowY: 'auto', marginBottom: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
  },
  stepRow: (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', cursor: 'pointer',
    transition: 'all 150ms ease',
    background: active ? 'rgba(108,92,231,0.12)' : 'transparent',
    borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
    borderBottom: '1px solid var(--border-subtle)',
  }),
  stepNum: (active, done) => ({
    width: '24px', height: '24px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '11px', fontWeight: '700', fontFamily: 'var(--font-mono)',
    flexShrink: 0,
    background: done ? '#00c853' : active ? 'var(--accent-primary)' : 'var(--bg-card)',
    color: done || active ? '#fff' : 'var(--text-muted)',
    border: `1px solid ${done ? '#00c853' : active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
  }),
  stepMove: {
    fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-mono)',
    minWidth: '32px',
  },
  stepDesc: {
    fontSize: '11px', color: 'var(--text-secondary)', flex: 1,
  },
  faceDot: (color) => ({
    width: '8px', height: '8px', borderRadius: '50%',
    background: color, flexShrink: 0,
    border: color === '#f0f0f0' ? '1px solid rgba(255,255,255,0.3)' : 'none',
  }),
  controls: {
    display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center',
  },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
    border: variant === 'primary' ? 'none' : '1px solid var(--border-accent)',
    background: variant === 'primary' ? 'var(--accent-gradient)' : 'var(--bg-elevated)',
    color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: '600', fontSize: '13px',
    transition: 'all 200ms ease', display: 'flex', alignItems: 'center', gap: '4px',
  }),
  speedControl: {
    display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', justifyContent: 'center',
  },
  speedLabel: { fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  slider: { width: '100px', accentColor: 'var(--accent-primary)' },
  empty: {
    textAlign: 'center', padding: '30px 16px',
    color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6',
  },
};

export default function SolutionPanel({
  solution,
  currentStep = -1,
  isPlaying = false,
  speed = 400,
  onSpeedChange,
  onPlay,
  onStepForward,
  onStepBack,
  onReset,
  onMoveHighlight,
}) {
  const moves = solution || [];

  if (!moves.length) {
    return (
      <div style={styles.empty}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🧩</div>
        <strong>No solution yet</strong><br />
        Set up your cube state using Camera or Manual editor, then hit <strong>Solve</strong>!
      </div>
    );
  }

  const progress = moves.length > 0 ? ((currentStep + 1) / moves.length) * 100 : 0;
  const currentMove = currentStep >= 0 && currentStep < moves.length ? moves[currentStep] : null;
  const faceColor = currentMove ? MOVE_FACE_COLORS[currentMove[0]] || '#888' : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Steps</span>
        <span style={styles.badge}>{moves.length} moves</span>
      </div>

      <div style={styles.progress}>
        <div style={styles.progressBar(progress)} />
      </div>

      {/* Current move highlight */}
      {currentMove && (
        <div style={styles.currentMoveBox}>
          <div style={{ ...styles.currentMoveNotation, color: faceColor }}>
            {currentMove}
          </div>
          <div style={styles.currentMoveDesc}>
            {MOVE_DESCRIPTIONS[currentMove] || currentMove}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px',
            fontFamily: 'var(--font-mono)',
          }}>
            Step {currentStep + 1} of {moves.length}
          </div>
        </div>
      )}

      {/* Steps list */}
      <div style={styles.stepsList}>
        {moves.map((move, i) => {
          const active = i === currentStep;
          const done = i < currentStep;
          const fc = MOVE_FACE_COLORS[move[0]] || '#888';
          return (
            <div
              key={i}
              style={styles.stepRow(active, done)}
              onClick={() => onMoveHighlight?.(i)}
            >
              <div style={styles.stepNum(active, done)}>
                {done ? '✓' : i + 1}
              </div>
              <div style={styles.faceDot(fc)} />
              <div style={{
                ...styles.stepMove,
                color: active ? 'var(--accent-primary)' : done ? '#00c853' : 'var(--text-primary)',
              }}>
                {move}
              </div>
              <div style={styles.stepDesc}>
                {MOVE_DESCRIPTIONS[move] || ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Playback controls */}
      <div style={styles.controls}>
        <button style={styles.btn('secondary')} onClick={onReset} title="Reset">⏮</button>
        <button style={styles.btn('secondary')} onClick={onStepBack} title="Previous">⏪</button>
        <button style={styles.btn('primary')} onClick={onPlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={styles.btn('secondary')} onClick={onStepForward} title="Next">⏩</button>
      </div>

      <div style={styles.speedControl}>
        <span style={styles.speedLabel}>Speed</span>
        <input
          type="range" min={150} max={1500} step={50} value={speed}
          onChange={e => onSpeedChange?.(Number(e.target.value))}
          style={styles.slider}
        />
        <span style={styles.speedLabel}>{speed}ms</span>
      </div>
    </div>
  );
}
