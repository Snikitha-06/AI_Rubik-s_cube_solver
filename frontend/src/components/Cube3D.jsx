import { useRef, useMemo } from 'react';
// Import Canvas for WebGL container and useFrame hook for game/render loop updates
import { Canvas, useFrame } from '@react-three/fiber';
// Import OrbitControls helper from Drei to allow user camera dragging/zooming
import { OrbitControls } from '@react-three/drei';
// Import ThreeJS core library
import * as THREE from 'three';
// Import HEX color helper
import { COLOR_HEX } from '../lib/cube';

// Reuse geometries and materials globally to optimize WebGL performance and memory footprint
const cubieGeo = new THREE.BoxGeometry(0.95, 0.95, 0.95);
const stickerGeo = new THREE.PlaneGeometry(0.85, 0.85);
const blackMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.8 });

/**
 * Optimized NxN Rubik's Cube Visualizer.
 * For N > 5, we use individual meshes sparingly or switch to instancing logic.
 * For now, we generalize the cubie generation to handle any size N.
 */
function buildCubies(state) {
  const N = state.size || 3;
  const cubies = [];
  const half = (N - 1) / 2; // Offset value to center the cube at coordinate (0, 0, 0)

  // Loop through 3D coordinate space coordinates
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        // Render only surface cubies to save GPU performance (ignore invisible inner core)
        const isSurface = x === 0 || x === N - 1 || y === 0 || y === N - 1 || z === 0 || z === N - 1;
        if (!isSurface) continue;

        // Map colors of the face stickers onto the outer face of the cubies
        const faceColors = {};
        if (y === N - 1) faceColors.U = state.U[z * N + x];
        if (y === 0)     faceColors.D = state.D[(N - 1 - z) * N + x];
        if (z === N - 1) faceColors.F = state.F[(N - 1 - y) * N + x];
        if (z === 0)     faceColors.B = state.B[(N - 1 - y) * N + (N - 1 - x)];
        if (x === N - 1) faceColors.R = state.R[(N - 1 - y) * N + (N - 1 - z)];
        if (x === 0)     faceColors.L = state.L[(N - 1 - y) * N + z];

        // Store positioning details and face colors for each cubie
        cubies.push({
          pos: [x - half, y - half, z - half],
          faceColors,
          id: `${x}-${y}-${z}`
        });
      }
    }
  }
  return cubies;
}

// Direction normal vectors for the six standard faces
const FACE_NORMALS = {
  U: [0, 1, 0],  D: [0, -1, 0],
  R: [1, 0, 0],  L: [-1, 0, 0],
  F: [0, 0, 1],  B: [0, 0, -1],
};

// Convert face letter identifier to Euler angles for rotating flat sticker planes on the cube surface
function faceToRotation(face) {
  switch (face) {
    case 'U': return [-Math.PI / 2, 0, 0];
    case 'D': return [Math.PI / 2, 0, 0];
    case 'R': return [0, Math.PI / 2, 0];
    case 'L': return [0, -Math.PI / 2, 0];
    case 'F': return [0, 0, 0];
    case 'B': return [0, Math.PI, 0];
    default:  return [0, 0, 0];
  }
}

// Render component representing a single physical 3D cube block (cubie)
function Cubie({ pos, faceColors }) {
  // Scale down cubies as N grows
  const scale = 1; 

  return (
    <group position={pos}>
      {/* Draw the base black box representation of the cubie */}
      <mesh geometry={cubieGeo} material={blackMat} scale={scale} />
      {/* Map and draw colored sticker planes on the active faces of the cubie */}
      {Object.entries(faceColors).map(([face, color]) => {
        const norm = FACE_NORMALS[face];
        return (
          <mesh 
            key={face} 
            // Position sticker slightly off-center (offset by 0.48) to avoid z-fighting artifacts
            position={[norm[0] * 0.48, norm[1] * 0.48, norm[2] * 0.48]}
            rotation={faceToRotation(face)}
            geometry={stickerGeo}
          >
            <meshStandardMaterial color={COLOR_HEX[color] || '#333'} />
          </mesh>
        );
      })}
    </group>
  );
}

// ThreeJS scene wrapper managing layout state and layer animations
function Scene({ state, animatingMove, onAnimDone }) {
  const N = state.size || 3;
  const groupRef = useRef();
  // Reference group containing only the cubies currently animating (rotating)
  const movingGroupRef = useRef();
  // Build the list of cubies (memoized to avoid rebuilding unless cube state changes)
  const cubies = useMemo(() => buildCubies(state), [state]);

  // Refs to track rotation angle state across animation render cycles
  const currentAngleRef = useRef(0);
  const lastMoveRef = useRef(null);
  const animDoneRef = useRef(false);

  // Compute moving slice properties (filter formula, rotation axis, target angle)
  const anim = useMemo(() => {
    if (!animatingMove) return null;
    const match = animatingMove.match(/^(\d+)?([URFDLB])(w)?(['2])?$/);
    if (!match) return null;

    let [, layerStr, face, wide, mod] = match;
    const layerNum = layerStr ? parseInt(layerStr) : 1;
    const half = (N - 1) / 2;

    let filter;
    const depth = layerNum - 1; // 0-indexed distance from face

    // Establish coordinate spatial filters to select which cubies belong to the rotating slice
    switch (face) {
      case 'U': filter = (p) => p[1] >= half - (wide ? depth : depth) - 0.1 && p[1] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'D': filter = (p) => p[1] <= -half + (wide ? depth : depth) + 0.1 && p[1] >= -half + (wide ? 0 : depth) - 0.1; break;
      case 'R': filter = (p) => p[0] >= half - (wide ? depth : depth) - 0.1 && p[0] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'L': filter = (p) => p[0] <= -half + (wide ? depth : depth) + 0.1 && p[0] >= -half + (wide ? 0 : depth) - 0.1; break;
      case 'F': filter = (p) => p[2] >= half - (wide ? depth : depth) - 0.1 && p[2] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'B': filter = (p) => p[2] <= -half + (wide ? depth : depth) + 0.1 && p[2] >= -half + (wide ? 0 : depth) - 0.1; break;
    }

    // Set rotation angle magnitude (default quarter turn = 90 degrees / half PI)
    let angle = -Math.PI / 2;
    if (mod === "'") angle = Math.PI / 2;
    if (mod === "2") angle = -Math.PI;

    // Flip angles for opposite faces to keep rotation directions consistent with standard notations
    if (['D', 'L', 'B'].includes(face)) angle = -angle;

    // Construct ThreeJS unit axis vector from face normals
    const axis = new THREE.Vector3(...FACE_NORMALS[face]);

    return { filter, axis, targetAngle: angle };
  }, [animatingMove, N]);

  // Framerate-independent animation loop
  useFrame((_, delta) => {
    // Return early if no active move is being animated
    if (!animatingMove) {
      lastMoveRef.current = null;
      animDoneRef.current = false;
      return;
    }

    if (!anim || !movingGroupRef.current) return;

    // Reset rotation angle parameters when a new move starts animating
    if (animatingMove !== lastMoveRef.current) {
      lastMoveRef.current = animatingMove;
      currentAngleRef.current = 0;
      animDoneRef.current = false;
      movingGroupRef.current.quaternion.identity(); // Clear group orientation
    }

    if (animDoneRef.current) return;

    // Linearly interpolate current angle towards the target angle using the step delta
    const speed = 6;
    const step = speed * delta;
    const remaining = anim.targetAngle - currentAngleRef.current;

    // If step brings us close enough to target angle, finalize the rotation
    if (Math.abs(remaining) < step) {
      movingGroupRef.current.quaternion.setFromAxisAngle(anim.axis, anim.targetAngle);
      animDoneRef.current = true;
      onAnimDone(); // Callback to tell parent component to update the logical state representation
    } else {
      // Step rotation increment
      const dir = remaining > 0 ? 1 : -1;
      currentAngleRef.current += dir * step;
      movingGroupRef.current.quaternion.setFromAxisAngle(anim.axis, currentAngleRef.current);
    }
  });

  // Split cubies into a moving list (rotating slice) and a static list
  const { moving, staticCubies } = useMemo(() => {
    if (!anim) return { moving: [], staticCubies: cubies };
    const m = [], s = [];
    cubies.forEach(c => {
      if (anim.filter(c.pos)) m.push(c);
      else s.push(c);
    });
    return { moving: m, staticCubies: s };
  }, [cubies, anim]);

  return (
    <group ref={groupRef}>
      {/* Render all cubies that remain static during the current move */}
      {staticCubies.map(c => <Cubie key={c.id} pos={c.pos} faceColors={c.faceColors} />)}
      {/* Render the moving group holding the active slice cubies undergoing rotation */}
      <group ref={movingGroupRef}>
        {moving.map(c => <Cubie key={c.id} pos={c.pos} faceColors={c.faceColors} />)}
      </group>
    </group>
  );
}

// Public component wrapper containing the Canvas context, lighting setup, and Camera parameters
export default function Cube3D({ cubeState, animatingMove, onAnimationComplete }) {
  const N = cubeState.size || 3;
  // Dynamically calculate camera view distance depending on cube size to prevent clipping
  const cameraDist = Math.max(5, N * 1.5);

  return (
    <div style={{ width: '100%', height: '100%', background: '#050505' }}>
      {/* Mount Canvas WebGL viewport */}
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        {/* Set up balanced ambient and directional lights */}
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
        {/* Mount internal 3D scene elements */}
        <Scene state={cubeState} animatingMove={animatingMove} onAnimDone={onAnimationComplete} />
        {/* Add standard trackball OrbitControls for mouse and touch dragging */}
        <OrbitControls enablePan={false} minDistance={3} maxDistance={cameraDist * 3} />
      </Canvas>
    </div>
  );
}
