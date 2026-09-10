'use client';

import { useCallback, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '@/lib/geo-utils';

const ATMOSPHERE_COLOR = '#00F5D4';

/**
 * Real Natural Earth coastlines (public domain, via datasets/geo-countries)
 * rasterized once into a 2048x1024 equirectangular map. See
 * `scripts/build-earth-texture.py` for how these are generated.
 */
const COLOR_MAP_URL = '/textures/earth-color.png';
const EMISSIVE_MAP_URL = '/textures/earth-emissive.png';

/**
 * Fresnel rim glow. Facing fragments stay transparent so the globe reads as a
 * solid body, while grazing angles bloom into the atmosphere colour.
 */
const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float fresnel = 1.0 - clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float glow = pow(fresnel, uPower) * uIntensity;
    // Taper the outermost sliver so the halo dissolves into space instead of
    // terminating in a hard bright ring at the silhouette.
    glow *= smoothstep(1.0, 0.86, fresnel);
    gl_FragColor = vec4(uColor, clamp(glow, 0.0, 1.0));
  }
`;

/** Thin cyan halo rendered on the back faces so it sits behind the globe. */
function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(ATMOSPHERE_COLOR) },
      uIntensity: { value: 0.85 },
      uPower: { value: 2.4 },
    }),
    []
  );

  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Faint latitude/longitude wireframe for depth cueing. */
function Graticule() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.0005, 36, 24]} />
      <meshBasicMaterial
        color="#1B2B45"
        wireframe
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Renders only the globe's own geometry (ocean/land sphere, graticule,
 * atmosphere). Deliberately does NOT own any rotation — this must live in
 * the same rotating group as FlightArcs (see GlobeCanvas), or the globe
 * spins out from under the arcs since they're computed independently in
 * world-space lat/lng coordinates.
 */
export default function EarthSphere() {
  // drei's useTexture runs onLoad in a layout effect, which is the sanctioned
  // place to configure a loaded texture (colorSpace, anisotropy) rather than
  // mutating it during render.
  const onTexturesLoaded = useCallback((loaded: THREE.Texture | THREE.Texture[]) => {
    const textures = Array.isArray(loaded) ? loaded : [loaded];
    const [loadedColorMap] = textures;
    loadedColorMap.colorSpace = THREE.SRGBColorSpace;
    for (const texture of textures) {
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
  }, []);

  const [colorMap, emissiveMap] = useTexture(
    [COLOR_MAP_URL, EMISSIVE_MAP_URL],
    onTexturesLoaded
  );

  return (
    <>
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={colorMap}
          emissiveMap={emissiveMap}
          emissive={ATMOSPHERE_COLOR}
          emissiveIntensity={0.55}
          roughness={0.68}
          metalness={0.22}
        />
      </mesh>
      <Graticule />
      <Atmosphere />
    </>
  );
}
