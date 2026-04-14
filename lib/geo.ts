const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Haversine distance between two WGS84 points in meters.
 */
export function distanceMeters(
  lat0: number,
  lng0: number,
  lat1: number,
  lng1: number,
): number {
  const φ1 = toRad(lat0);
  const φ2 = toRad(lat1);
  const Δφ = toRad(lat1 - lat0);
  const Δλ = toRad(lng1 - lng0);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Initial (forward) bearing from point A to B in degrees [0, 360).
 */
export function initialBearingDeg(
  lat0: number,
  lng0: number,
  lat1: number,
  lng1: number,
): number {
  const φ1 = toRad(lat0);
  const φ2 = toRad(lat1);
  const Δλ = toRad(lng1 - lng0);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const deg = (toDeg(θ) + 360) % 360;
  return deg;
}

export type LatLng = { lat: number; lng: number };

/**
 * Interpolate points along the great circle from a to b (inclusive).
 * `segments` is the number of segments; returns `segments + 1` points.
 */
export function interpolateGreatCircle(
  a: LatLng,
  b: LatLng,
  segments: number,
): LatLng[] {
  const n = Math.max(1, Math.floor(segments));
  const δ = distanceMeters(a.lat, a.lng, b.lat, b.lng) / EARTH_RADIUS_M;
  if (δ < 1e-12) {
    return [{ ...a }];
  }

  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lng);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lng);

  const out: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * δ) / Math.sin(δ);
    const B = Math.sin(f * δ) / Math.sin(δ);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λi = Math.atan2(y, x);

    out.push({
      lat: toDeg(φi),
      lng: toDeg(λi),
    });
  }
  return out;
}

/**
 * Smallest signed difference between two compass headings in [-180, 180].
 */
export function bearingDeltaDeg(current: number, target: number): number {
  const d = ((target - current + 540) % 360) - 180;
  return d;
}
