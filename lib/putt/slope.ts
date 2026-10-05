/** Gravity vector sample from DeviceMotionEvent.accelerationIncludingGravity (m/s²). */
export type GravitySample = {
  x: number;
  y: number;
  z: number;
};

export type SideLabel = "left" | "right" | "flat";
export type AlongLabel = "uphill" | "downhill" | "level";

export type SlopeReading = {
  /** Signed side tilt in degrees: positive = break to golfer's right (high side left). */
  sideDeg: number;
  /** Signed along-line tilt in degrees: positive = uphill toward hole. */
  alongDeg: number;
  sidePercent: number;
  alongPercent: number;
  sideLabel: SideLabel;
  alongLabel: AlongLabel;
};

const DEG = 180 / Math.PI;
const DEADZONE_DEG = 0.15;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function applyDeadzone(deg: number): number {
  return Math.abs(deg) < DEADZONE_DEG ? 0 : deg;
}

function percentFromDeg(deg: number): number {
  return 100 * Math.tan((deg * Math.PI) / 180);
}

/**
 * Convert face-up device gravity into putt-line slope.
 *
 * Convention (portrait, face-up on green):
 * - Device top points toward the hole (along +Y screen / device y).
 * - Sidehill uses x: positive x tilt → high side on golfer's left → ball breaks right.
 */
export function slopeFromGravity(g: GravitySample): SlopeReading {
  const mag = Math.hypot(g.x, g.y, g.z);
  if (!Number.isFinite(mag) || mag < 1) {
    return {
      sideDeg: 0,
      alongDeg: 0,
      sidePercent: 0,
      alongPercent: 0,
      sideLabel: "flat",
      alongLabel: "level",
    };
  }

  const nx = g.x / mag;
  const ny = g.y / mag;
  const nz = g.z / mag;

  // Face-up: z ≈ −g (or +g if inverted). Prefer the orientation where |nz| is large.
  const faceUpSign = nz <= 0 ? 1 : -1;

  // Side: tilt about the putt line (y). atan2(x, |z|) with face-up convention.
  let sideDeg = applyDeadzone(Math.atan2(faceUpSign * nx, Math.abs(nz)) * DEG);
  // Along: tilt about the cross-line (x). Positive = nose up toward hole = uphill.
  let alongDeg = applyDeadzone(Math.atan2(faceUpSign * -ny, Math.abs(nz)) * DEG);

  sideDeg = clamp(sideDeg, -45, 45);
  alongDeg = clamp(alongDeg, -45, 45);

  const sidePercent = percentFromDeg(sideDeg);
  const alongPercent = percentFromDeg(alongDeg);

  let sideLabel: SideLabel = "flat";
  if (sideDeg > 0) sideLabel = "right";
  else if (sideDeg < 0) sideLabel = "left";

  let alongLabel: AlongLabel = "level";
  if (alongDeg > 0) alongLabel = "uphill";
  else if (alongDeg < 0) alongLabel = "downhill";

  return {
    sideDeg,
    alongDeg,
    sidePercent,
    alongPercent,
    sideLabel,
    alongLabel,
  };
}

export function averageGravity(samples: GravitySample[]): GravitySample | null {
  if (samples.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const s of samples) {
    sx += s.x;
    sy += s.y;
    sz += s.z;
  }
  const n = samples.length;
  return { x: sx / n, y: sy / n, z: sz / n };
}

export function formatSlopeShort(reading: SlopeReading): {
  side: string;
  along: string;
} {
  const sideMag = Math.abs(reading.sideDeg);
  const alongMag = Math.abs(reading.alongDeg);
  const side =
    reading.sideLabel === "flat"
      ? "Level sidehill"
      : `${sideMag.toFixed(1)}° ${reading.sideLabel} (${Math.abs(reading.sidePercent).toFixed(1)}%)`;
  const along =
    reading.alongLabel === "level"
      ? "Level to hole"
      : `${alongMag.toFixed(1)}° ${reading.alongLabel} (${Math.abs(reading.alongPercent).toFixed(1)}%)`;
  return { side, along };
}
