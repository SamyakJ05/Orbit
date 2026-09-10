'use client';

import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, OrbitControls, Stars } from '@react-three/drei';
import type { Group } from 'three';
import EarthSphere from './EarthSphere';
import FlightArcs from './FlightArcs';
import { useTravelStore } from '@/stores/useTravelStore';

const SPACE_BACKGROUND = '#030712';

/**
 * Globe and flight arcs must share one rotation, since arcs are computed
 * directly in world-space lat/lng coordinates rather than as children
 * parented to the spinning globe mesh — spinning the globe alone (as an
 * earlier version did) left arcs behind, silently drifting them off their
 * real-world coastlines the longer the page stayed open.
 */
function RotatingWorld({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.015;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default function GlobeCanvas() {
  const setSelectedSegmentId = useTravelStore((state) => state.setSelectedSegmentId);

  return (
    <Canvas
      className="absolute inset-0"
      camera={{ position: [0, 2.2, 8.2], fov: 45, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      // Clicking empty space clears the current selection.
      onPointerMissed={() => setSelectedSegmentId(null)}
    >
      <color attach="background" args={[SPACE_BACKGROUND]} />
      <fog attach="fog" args={[SPACE_BACKGROUND, 14, 30]} />

      {/* Atmospheric base light plus a directional sun and a cool fill. */}
      <ambientLight intensity={0.32} color="#7DD3FC" />
      <directionalLight position={[6, 3, 4]} intensity={2.6} color="#FFF7E6" />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color="#3B82F6" />
      <pointLight position={[0, 0, 0]} intensity={0.4} color="#00F5D4" distance={4} />

      <Suspense fallback={null}>
        <Stars radius={60} depth={40} count={3500} factor={3} saturation={0} fade speed={0.4} />
        <RotatingWorld>
          <EarthSphere />
          <FlightArcs />
        </RotatingWorld>
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={4.2}
        maxDistance={14}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        autoRotate={false}
      />
      <AdaptiveDpr pixelated />
    </Canvas>
  );
}
