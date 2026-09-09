import * as THREE from 'three';

export const EARTH_RADIUS_KM = 6371;

/** Circumference of the Earth at the equator, in kilometers. */
export const EARTH_CIRCUMFERENCE_KM = 40075;

/** Standard radius of the rendered globe in scene units. */
export const GLOBE_RADIUS = 2.5;

/**
 * Converts geographic coordinates (latitude, longitude) to 3D Cartesian coordinates
 * on a sphere of specified radius. Aligned with standard equirectangular textures.
 */
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/**
 * Computes surface distance in kilometers using the Great-Circle Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_KM * c);
}

/**
 * Generates an array of Vector3 points representing a Great-Circle parabolic arc.
 * Uses Spherical Linear Interpolation (SLERP) elevated by a parabolic altitude profile.
 */
export function generateFlightArcPoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  globeRadius: number,
  numPoints: number = 64,
  maxPeakAltitude: number = 0.35
): THREE.Vector3[] {
  const vStart = latLngToVector3(start.lat, start.lng, globeRadius);
  const vEnd = latLngToVector3(end.lat, end.lng, globeRadius);

  const angle = vStart.angleTo(vEnd);
  if (angle < 0.001) return [vStart, vEnd];

  // Scale maximum elevation proportionally to trip distance
  const arcHeight = globeRadius * Math.min(maxPeakAltitude, (angle / Math.PI) * 0.55);

  const points: THREE.Vector3[] = [];
  const vStartNorm = vStart.clone().normalize();
  const vEndNorm = vEnd.clone().normalize();

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const sinAngle = Math.sin(angle);
    const weightStart = Math.sin((1 - t) * angle) / sinAngle;
    const weightEnd = Math.sin(t * angle) / sinAngle;

    const interpolated = new THREE.Vector3()
      .addScaledVector(vStartNorm, weightStart)
      .addScaledVector(vEndNorm, weightEnd)
      .normalize();

    // Parabolic elevation: 4 * h * t * (1 - t) reaches peak height at t = 0.5
    const altitude = 4 * arcHeight * t * (1 - t);
    interpolated.multiplyScalar(globeRadius + altitude);
    points.push(interpolated);
  }

  return points;
}

/**
 * Generates a CatmullRomCurve3 instance suitable for rendering TubeGeometry or animated points.
 */
export function createFlightCurve(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  globeRadius: number
): THREE.CatmullRomCurve3 {
  const points = generateFlightArcPoints(start, end, globeRadius);
  return new THREE.CatmullRomCurve3(points);
}

/**
 * Fraction of the year elapsed at the given ISO timestamp, in [0, 1].
 * Accounts for leap years so that Dec 31 always lands near 1.0.
 */
export function dateToYearProgress(iso: string): number {
  const date = new Date(iso);
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return (date.getTime() - start) / (end - start);
}

/** Converts a 0-1 year progress value into a readable "MMM D" label. */
export function yearProgressToLabel(progress: number, year: number): string {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const clamped = Math.min(Math.max(progress, 0), 0.999999);
  const date = new Date(start + clamped * (end - start));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
