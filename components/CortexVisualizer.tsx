import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MemoryNode, MemoryTier } from '../types';

interface CortexVisualizerProps {
  memories: MemoryNode[];
}

interface MemoryPointProps {
  position: [number, number, number];
  color: string;
  importance: number;
  tier: MemoryTier;
}

const MemoryPoint: React.FC<MemoryPointProps> = ({ position, color, importance, tier }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulse effect based on importance
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1 * importance;
      meshRef.current.scale.setScalar(hovered ? 2 : 1 * scale);
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      position={new THREE.Vector3(...position)} 
      onPointerOver={() => setHovered(true)} 
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        emissive={color} 
        emissiveIntensity={hovered ? 2 : 0.5 + (importance * 0.5)} 
        transparent
        opacity={0.8}
      />
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-black/80 text-white text-xs p-2 rounded border border-white/20 whitespace-nowrap backdrop-blur-md pointer-events-none">
            <div className="font-bold">{tier.split(' ')[0]}</div>
            <div>Imp: {(importance * 100).toFixed(0)}%</div>
          </div>
        </Html>
      )}
    </mesh>
  );
};

const Connections = ({ memories }: { memories: MemoryNode[] }) => {
  const lines = useMemo(() => {
    const points: THREE.Vector3[] = [];
    // Create random connections between nearby nodes to simulate neural pathways
    // For performance, we limit connections
    for (let i = 0; i < Math.min(memories.length, 50); i++) {
        const start = new THREE.Vector3(...memories[i].embedding);
        // Find closest neighbor
        let minDist = Infinity;
        let closestIndex = -1;
        for (let j = 0; j < memories.length; j++) {
            if (i === j) continue;
            const end = new THREE.Vector3(...memories[j].embedding);
            const dist = start.distanceTo(end);
            if (dist < minDist && dist < 2.5) {
                minDist = dist;
                closestIndex = j;
            }
        }
        if (closestIndex !== -1) {
            points.push(start);
            points.push(new THREE.Vector3(...memories[closestIndex].embedding));
        }
    }
    return points;
  }, [memories]);

  if (lines.length === 0) return null;

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={lines.length}
          array={new Float32Array(lines.flatMap(v => [v.x, v.y, v.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#4f46e5" transparent opacity={0.15} />
    </lineSegments>
  );
}

const CortexScene = ({ memories }: { memories: MemoryNode[] }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001; // Slow rotation
    }
  });

  return (
    <group ref={groupRef}>
      <Connections memories={memories} />
      {memories.map((mem) => {
        let color = '#6366f1'; // L2 Blue
        if (mem.tier === MemoryTier.L1_SCRATCHPAD) color = '#10b981'; // L1 Green
        if (mem.tier === MemoryTier.L3_ENTITY) color = '#ec4899'; // L3 Pink
        
        return (
          <MemoryPoint 
            key={mem.id} 
            position={mem.embedding} 
            color={color} 
            importance={mem.importanceScore}
            tier={mem.tier}
          />
        );
      })}
    </group>
  );
};

export const CortexVisualizer: React.FC<CortexVisualizerProps> = ({ memories }) => {
  return (
    <div className="w-full h-full bg-gradient-to-b from-[#0B0C15] to-[#111322] rounded-xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-white font-mono font-bold text-lg bg-black/50 px-2 py-1 rounded inline-block backdrop-blur-sm">CORTEX MONITOR</h3>
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-gray-300">L1 Scratchpad (Active)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span className="text-gray-300">L2 Semantic Store</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span className="text-gray-300">L3 Entity Graph</span>
          </div>
        </div>
      </div>
      
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <color attach="background" args={['#0B0C15']} />
        <fog attach="fog" args={['#0B0C15', 5, 12]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <CortexScene memories={memories} />
        <OrbitControls enableZoom={true} enablePan={true} autoRotate={false} />
      </Canvas>
    </div>
  );
};