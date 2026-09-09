'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GLOBE_RADIUS,
  createFlightCurve,
  dateToYearProgress,
  latLngToVector3,
} from '@/lib/geo-utils';
import {
  selectFilteredSegments,
  useTravelStore,
  type TransportMode,
  type TravelSegment,
} from '@/stores/useTravelStore';

export const MODE_COLORS: Record<TransportMode, string> = {
  flight: '#00F5D4',
  train: '#10B981',
  roadtrip: '#FF4D6D',
  bike: '#FBBF24',
};

const TUBE_RADIUS = 0.008;
const TUBE_SEGMENTS = 96;
/** Fraction of the year an arc spends drawing itself in once it becomes active. */
const DRAW_IN_WINDOW = 0.012;

interface ArcProps {
  segment: TravelSegment;
  /** 0 = not yet departed, 1 = fully drawn. */
  reveal: number;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (id: string) => void;
}

function FlightArc({ segment, reveal, isSelected, isDimmed, onSelect }: ArcProps) {
  const beaconRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const tubeRef = useRef<THREE.Mesh>(null);

  const color = MODE_COLORS[segment.mode];

  const curve = useMemo(
    () => createFlightCurve(segment.origin, segment.destination, GLOBE_RADIUS),
    [segment.origin, segment.destination]
  );

  const geometry = useMemo(
    () => new THREE.TubeGeometry(curve, TUBE_SEGMENTS, TUBE_RADIUS, 8, false),
    [curve]
  );

  // TubeGeometry is constructed manually, so it must be disposed explicitly.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const endpoints = useMemo(
    () => ({
      origin: latLngToVector3(segment.origin.lat, segment.origin.lng, GLOBE_RADIUS * 1.004),
      destination: latLngToVector3(
        segment.destination.lat,
        segment.destination.lng,
        GLOBE_RADIUS * 1.004
      ),
    }),
    [segment.origin, segment.destination]
  );

  // Reveal is applied via drawRange rather than remounting geometry, so the
  // arc grows out of its origin without reallocating buffers each frame.
  useEffect(() => {
    if (!tubeRef.current) return;
    const index = geometry.getIndex();
    if (!index) return;
    const total = index.count;
    const visible = Math.max(0, Math.floor(total * reveal));
    // Keep the count on a whole-triangle boundary to avoid torn ribbons.
    geometry.setDrawRange(0, visible - (visible % 3));
  }, [geometry, reveal]);

  useFrame((state) => {
    if (!beaconRef.current) return;

    // Beacon rides the visible head of the arc, looping once fully drawn.
    const loop = (state.clock.elapsedTime * 0.22) % 1;
    const t = reveal < 1 ? reveal : loop;
    const point = curve.getPointAt(Math.min(Math.max(t, 0), 1));
    beaconRef.current.position.copy(point);

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.18;
    const scale = (isSelected ? 1.7 : 1) * pulse;
    beaconRef.current.scale.setScalar(scale);

    if (materialRef.current) {
      materialRef.current.emissiveIntensity = isSelected ? 3.2 : 1.4;
    }
  });

  const opacity = isDimmed ? 0.16 : 1;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(segment.id);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <mesh ref={tubeRef}>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 3.2 : 1.4}
          transparent={isDimmed}
          opacity={opacity}
          depthWrite
          toneMapped={false}
        />
      </mesh>

      {/* Origin / destination markers */}
      <mesh position={endpoints.origin}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent={isDimmed}
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      <mesh position={endpoints.destination} visible={reveal > 0.995}>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent={isDimmed}
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>

      {/* Travelling beacon */}
      <mesh ref={beaconRef} visible={!isDimmed}>
        <sphereGeometry args={[0.026, 12, 12]} />
        <meshBasicMaterial color="#FFFFFF" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function FlightArcs() {
  const segments = useTravelStore((state) => state.segments);
  const selectedYear = useTravelStore((state) => state.selectedYear);
  const activeModeFilter = useTravelStore((state) => state.activeModeFilter);
  const timelineProgress = useTravelStore((state) => state.timelineProgress);
  const selectedSegmentId = useTravelStore((state) => state.selectedSegmentId);
  const setSelectedSegmentId = useTravelStore((state) => state.setSelectedSegmentId);

  const filtered = useMemo(
    () => selectFilteredSegments({ segments, selectedYear, activeModeFilter }),
    [segments, selectedYear, activeModeFilter]
  );

  return (
    <group>
      {filtered.map((segment) => {
        const departure = dateToYearProgress(segment.departureTime);
        // Arcs draw themselves in over a short window after their departure date.
        const reveal = Math.min(
          Math.max((timelineProgress - departure) / DRAW_IN_WINDOW, 0),
          1
        );
        if (reveal <= 0) return null;

        return (
          <FlightArc
            key={segment.id}
            segment={segment}
            reveal={reveal}
            isSelected={selectedSegmentId === segment.id}
            isDimmed={selectedSegmentId !== null && selectedSegmentId !== segment.id}
            onSelect={setSelectedSegmentId}
          />
        );
      })}
    </group>
  );
}
