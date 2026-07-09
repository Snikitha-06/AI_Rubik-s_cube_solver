/* eslint-disable no-unused-vars */
// Import React hooks for lifecycle, references, and state values
import { useEffect, useRef, useState } from 'react';
// Import Framer Motion library to build smooth UI transitions and keyframe animations
import { motion } from 'framer-motion';

/**
 * Professional Rubik's Cube Rotation Indicator
 * Displays an interactive 3D cube with smooth animations and SVG arrows
 * Material Design inspired with glowing effects
 */

// Component to draw the custom curved/circular SVG arrow overlay representing the rotation direction
function RotationArrow({ direction, isActive }) {
  // Framer Motion configuration to animate arrow opacity and scale states
  const arrowVariants = {
    initial: { opacity: 0.4, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0.4, scale: 0.9 },
  };

  // Define vector bezier curves and arrowhead structures for all directions
  const arrowPaths = {
    up: {
      curve: 'M 50 100 Q 50 40 50 20', // Upwards straight curve
      arrowHead: 'M 50 20 L 42 35 M 50 20 L 58 35',
    },
    down: {
      curve: 'M 50 20 Q 50 80 50 100', // Downwards straight curve
      arrowHead: 'M 50 100 L 42 85 M 50 100 L 58 85',
    },
    left: {
      curve: 'M 100 50 Q 40 50 20 50', // Leftwards straight curve
      arrowHead: 'M 20 50 L 35 42 M 20 50 L 35 58',
    },
    right: {
      curve: 'M 20 50 Q 80 50 100 50', // Rightwards straight curve
      arrowHead: 'M 100 50 L 85 42 M 100 50 L 85 58',
    },
    clockwise: {
      curve: 'M 30 30 Q 70 10 80 40 Q 85 60 70 80 Q 30 90 20 70', // Clockwise circular curve path
      arrowHead: 'M 20 70 L 28 65 M 20 70 L 18 78',
    },
    counterClockwise: {
      curve: 'M 80 30 Q 30 10 20 40 Q 15 60 30 80 Q 70 90 80 70', // Counter-clockwise circular curve path
      arrowHead: 'M 80 70 L 72 65 M 80 70 L 82 78',
    },
  };

  // Retrieve curve configurations corresponding to current active direction
  const paths = arrowPaths[direction] || arrowPaths.right;

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="absolute w-24 h-24"
      variants={arrowVariants}
      initial="initial"
      animate={isActive ? 'animate' : 'initial'}
      transition={{ duration: 0.5 }}
    >
      {/* SVG glow filter overlay to add neon shadow styling to the arrow curves */}
      <defs>
        <filter id={`glow-${direction}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Render curved arrow body */}
      <path
        d={paths.curve}
        stroke={isActive ? '#2563eb' : 'rgba(37, 99, 235, 0.4)'}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${direction})`}
        className={isActive ? 'drop-shadow-[0_0_8px_rgb(37,99,235)]' : ''}
      />

      {/* Render arrowhead pointers */}
      <path
        d={paths.arrowHead}
        stroke={isActive ? '#2563eb' : 'rgba(37, 99, 235, 0.4)'}
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#glow-${direction})`}
      />
    </motion.svg>
  );
}

// Component representing a face sticker grid sheet inside the 3D CSS model
function CubeSticker({ face, isHighlighted, faceColors }) {
  // Colors mapped to the standard Rubik's cube sides
  const colors = {
    front: 'bg-white',
    back: 'bg-green-700',
    right: 'bg-red-600',
    left: 'bg-blue-500',
    top: 'bg-yellow-300',
    bottom: 'bg-white',
  };

  return (
    <motion.div
      className={`absolute w-20 h-20 rounded-lg border border-white/20 ${colors[face]} shadow-lg`}
      initial={{ opacity: 0.7 }}
      animate={{ opacity: isHighlighted ? 1 : 0.7 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      {/* Draw a 3x3 layout of black cells representing stickers border divisions */}
      <div className="grid grid-cols-3 gap-1 p-2 h-full">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-black/30 rounded" />
        ))}
      </div>
    </motion.div>
  );
}

// Component rendering a 3D Cube using pure CSS 3D transforms
function Cube3DVisualization({ rotation, highlightedFace }) {
  return (
    <motion.div
      className="relative w-32 h-32 mx-auto"
      style={{ perspective: '1000px' }} // Perspective depth to active CSS 3D transforms
      animate={{
        // Dynamically rotate coordinate orientations from values computed in animation frame loops
        rotateX: rotation.x,
        rotateY: rotation.y,
        rotateZ: rotation.z,
      }}
      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
    >
      {/* Container holding standard CSS transformStyle: preserve-3d properties */}
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {/* Front Face: translateZ shifts the face forward by half of cube width */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-white to-gray-100 rounded-lg border-2 border-white/30 shadow-xl"
          style={{
            transform: 'translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-white/40 to-gray-300/40 rounded border border-white/20"
              />
            ))}
          </div>
        </div>

        {/* Back Face: rotates 180 degrees around Y axis and translates */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-lg border-2 border-green-300/30 shadow-xl"
          style={{
            transform: 'rotateY(180deg) translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full opacity-80">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-green-900/40 rounded" />
            ))}
          </div>
        </div>

        {/* Right Face: rotates 90 degrees around Y axis and translates */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-lg border-2 border-red-300/30 shadow-xl"
          style={{
            transform: 'rotateY(90deg) translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full opacity-90">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-red-700/40 rounded" />
            ))}
          </div>
        </div>

        {/* Left Face: rotates -90 degrees around Y axis and translates */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg border-2 border-blue-300/30 shadow-xl"
          style={{
            transform: 'rotateY(-90deg) translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full opacity-90">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-blue-700/40 rounded" />
            ))}
          </div>
        </div>

        {/* Top Face: rotates 90 degrees around X axis and translates */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-lg border-2 border-yellow-300/30 shadow-xl"
          style={{
            transform: 'rotateX(90deg) translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full opacity-90">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-yellow-600/30 rounded" />
            ))}
          </div>
        </div>

        {/* Bottom Face: rotates -90 degrees around X axis and translates */}
        <div
          className="absolute w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg border-2 border-gray-300/30 shadow-xl"
          style={{
            transform: 'rotateX(-90deg) translateZ(40px)',
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
          }}
        >
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full opacity-80">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-gray-500/30 rounded" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Main CubeRotationGuide component displaying 3D animations and arrows
export default function CubeRotationGuide({
  direction = 'right',
  isAnimating = true,
  instruction = 'Rotate the cube',
  instructionDetail = '',
  showInstructionCard = true,
  compact = false,
}) {
  // State hook keeping active 3D x-y-z Euler angle orientations
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  // Handle requestAnimationFrame loops to animate the visual guide
  useEffect(() => {
    if (!isAnimating) return;

    let animationFrame;
    let time = 0;

    const animate = () => {
      // Step animation clock
      time += 0.02;
      // Calculate oscillation angle using sinusoids (swings +/- 25 degrees)
      const angle = Math.sin(time) * 25;

      // Assign rotation to respective coordinate axis based on the direction prop
      setRotation(prev => {
        switch (direction) {
          case 'left':
            return { x: 0, y: angle, z: 0 };
          case 'right':
            return { x: 0, y: -angle, z: 0 };
          case 'up':
            return { x: angle, y: 0, z: 0 };
          case 'down':
            return { x: -angle, y: 0, z: 0 };
          case 'clockwise':
            return { x: 0, y: 0, z: angle };
          case 'counterClockwise':
            return { x: 0, y: 0, z: -angle };
          default:
            return prev;
        }
      });

      // Recurse next animation cycle
      animationFrame = requestAnimationFrame(animate);
    };

    // Begin render updates
    animationFrame = requestAnimationFrame(animate);
    // Cleanup loop handle on destroy
    return () => cancelAnimationFrame(animationFrame);
  }, [direction, isAnimating]);

  // Positions configurations for rendering overlays around the central visualizer
  const arrowPositions = {
    up: 'top-0 left-1/2 -translate-x-1/2',
    down: 'bottom-0 left-1/2 -translate-x-1/2',
    left: 'left-0 top-1/2 -translate-y-1/2',
    right: 'right-0 top-1/2 -translate-y-1/2',
    clockwise: 'top-0 right-0',
    counterClockwise: 'top-0 left-0',
  };

  // Render compact view layout (useful for overlays on camera scan page)
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-40 h-40 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Positional arrow */}
          <div className={`absolute inset-0 ${arrowPositions[direction] || arrowPositions.right}`}>
            <RotationArrow direction={direction} isActive={isAnimating} />
          </div>
          {/* Main 3D model */}
          <Cube3DVisualization rotation={rotation} highlightedFace={direction} />
        </div>
        {/* Instruction label */}
        {showInstructionCard && (
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{instruction}</p>
            {instructionDetail && <p className="text-xs text-blue-300">{instructionDetail}</p>}
          </div>
        )}
      </div>
    );
  }

  // Render standard full size layout with banners and control button grids
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Top Banner Card showing the current instructions */}
      {showInstructionCard && (
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 mb-6 shadow-lg text-white"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse" />
            <div>
              <h3 className="font-bold text-lg">{instruction}</h3>
              {instructionDetail && <p className="text-sm text-blue-100 mt-1">{instructionDetail}</p>}
            </div>
          </div>
        </motion.div>
      )}

      {/* Visualizer Area */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-2xl">
        {/* Circular background radial glow element */}
        <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 to-transparent rounded-3xl" />

        {/* 3D Cube Canvas box */}
        <div className="relative flex items-center justify-center h-64">
          <Cube3DVisualization rotation={rotation} highlightedFace={direction} />

          {/* Overlay Arrow indicators */}
          <div className={`absolute ${arrowPositions[direction] || arrowPositions.right}`}>
            <RotationArrow direction={direction} isActive={isAnimating} />
          </div>
        </div>

        {/* Animated pulse badge */}
        <motion.div
          className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold"
          animate={{ scale: isAnimating ? [1, 1.1, 1] : 1 }}
          transition={{ repeat: isAnimating ? Infinity : 0, duration: 1.5 }}
        >
          {isAnimating ? 'Rotating' : 'Ready'}
        </motion.div>
      </div>

      {/* Button controls grid */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {['left', 'up', 'right', 'down', 'clockwise', 'counterClockwise'].slice(0, 3).map(dir => (
          <motion.button
            key={dir}
            className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              direction === dir
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {dir.charAt(0).toUpperCase() + dir.slice(1)}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
