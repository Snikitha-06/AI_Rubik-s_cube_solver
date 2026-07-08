import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { COLOR_HEX } from '../lib/cube';

// Reuse geometries and materials
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
  const half = (N - 1) / 2;

  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        // Only surface cubies
        const isSurface = x === 0 || x === N - 1 || y === 0 || y === N - 1 || z === 0 || z === N - 1;
        if (!isSurface) continue;

        const faceColors = {};
        if (y === N - 1) faceColors.U = state.U[z * N + x];
        if (y === 0)     faceColors.D = state.D[(N - 1 - z) * N + x];
        if (z === N - 1) faceColors.F = state.F[(N - 1 - y) * N + x];
        if (z === 0)     faceColors.B = state.B[(N - 1 - y) * N + (N - 1 - x)];
        if (x === N - 1) faceColors.R = state.R[(N - 1 - y) * N + (N - 1 - z)];
        if (x === 0)     faceColors.L = state.L[(N - 1 - y) * N + z];

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

const FACE_NORMALS = {
  U: [0, 1, 0],  D: [0, -1, 0],
  R: [1, 0, 0],  L: [-1, 0, 0],
  F: [0, 0, 1],  B: [0, 0, -1],
};

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

function Cubie({ pos, faceColors }) {
  // Scale down cubies as N grows
  const scale = 1; 

  return (
    <group position={pos}>
      <mesh geometry={cubieGeo} material={blackMat} scale={scale} />
      {Object.entries(faceColors).map(([face, color]) => {
        const norm = FACE_NORMALS[face];
        return (
          <mesh 
            key={face} 
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

function Scene({ state, animatingMove, onAnimDone }) {
  const N = state.size || 3;
  const groupRef = useRef();
  const movingGroupRef = useRef();
  const cubies = useMemo(() => buildCubies(state), [state]);

  const currentAngleRef = useRef(0);
  const lastMoveRef = useRef(null);
  const animDoneRef = useRef(false);

  const anim = useMemo(() => {
    if (!animatingMove) return null;
    const match = animatingMove.match(/^(\d+)?([URFDLB])(w)?(['2])?$/);
    if (!match) return null;

    let [, layerStr, face, wide, mod] = match;
    const layerNum = layerStr ? parseInt(layerStr) : 1;
    const half = (N - 1) / 2;

    let filter;
    const depth = layerNum - 1; // 0-indexed distance from face

    switch (face) {
      case 'U': filter = (p) => p[1] >= half - (wide ? depth : depth) - 0.1 && p[1] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'D': filter = (p) => p[1] <= -half + (wide ? depth : depth) + 0.1 && p[1] >= -half + (wide ? 0 : depth) - 0.1; break;
      case 'R': filter = (p) => p[0] >= half - (wide ? depth : depth) - 0.1 && p[0] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'L': filter = (p) => p[0] <= -half + (wide ? depth : depth) + 0.1 && p[0] >= -half + (wide ? 0 : depth) - 0.1; break;
      case 'F': filter = (p) => p[2] >= half - (wide ? depth : depth) - 0.1 && p[2] <= half - (wide ? 0 : depth) + 0.1; break;
      case 'B': filter = (p) => p[2] <= -half + (wide ? depth : depth) + 0.1 && p[2] >= -half + (wide ? 0 : depth) - 0.1; break;
    }

    let angle = -Math.PI / 2;
    if (mod === "'") angle = Math.PI / 2;
    if (mod === "2") angle = -Math.PI;

    if (['D', 'L', 'B'].includes(face)) angle = -angle;

    const axis = new THREE.Vector3(...FACE_NORMALS[face]);

    return { filter, axis, targetAngle: angle };
  }, [animatingMove, N]);

  useFrame((_, delta) => {
    if (!animatingMove) {
      lastMoveRef.current = null;
      animDoneRef.current = false;
      return;
    }

    if (!anim || !movingGroupRef.current) return;

    if (animatingMove !== lastMoveRef.current) {
      lastMoveRef.current = animatingMove;
      currentAngleRef.current = 0;
      animDoneRef.current = false;
      movingGroupRef.current.quaternion.identity();
    }

    if (animDoneRef.current) return;

    const speed = 6;
    const step = speed * delta;
    const remaining = anim.targetAngle - currentAngleRef.current;

    if (Math.abs(remaining) < step) {
      movingGroupRef.current.quaternion.setFromAxisAngle(anim.axis, anim.targetAngle);
      animDoneRef.current = true;
      onAnimDone();
    } else {
      const dir = remaining > 0 ? 1 : -1;
      currentAngleRef.current += dir * step;
      movingGroupRef.current.quaternion.setFromAxisAngle(anim.axis, currentAngleRef.current);
    }
  });

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
      {staticCubies.map(c => <Cubie key={c.id} pos={c.pos} faceColors={c.faceColors} />)}
      <group ref={movingGroupRef}>
        {moving.map(c => <Cubie key={c.id} pos={c.pos} faceColors={c.faceColors} />)}
      </group>
    </group>
  );
}

export default function Cube3D({ cubeState, animatingMove, onAnimationComplete }) {
  const N = cubeState.size || 3;
  // Adjust camera distance based on N
  const cameraDist = Math.max(5, N * 1.5);

  return (
    <div style={{ width: '100%', height: '100%', background: '#050505' }}>
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        <ambientLight intensity={1.2} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
        <Scene state={cubeState} animatingMove={animatingMove} onAnimDone={onAnimationComplete} />
        <OrbitControls enablePan={false} minDistance={3} maxDistance={cameraDist * 3} />
      </Canvas>
    </div>
  );
}
