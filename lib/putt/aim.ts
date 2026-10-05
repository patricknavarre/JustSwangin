import type { SlopeReading } from "@/lib/putt/slope";

export const GOLF_BALL_DIAMETER_IN = 1.68;
const G = 9.80665;
const FT_TO_M = 0.3048;
const M_TO_IN = 39.3700787;

export type AimEstimate = {
  /** Signed inches: positive = aim right of cup (ball breaks left → aim opposite). */
  offsetInches: number;
  ballWidths: number;
  /** Direction to aim relative to the cup. */
  aimLabel: "left" | "right" | "straight";
  stimp: number;
  distanceFeet: number;
  /** Characteristic dying-putt speed used (m/s). */
  speedMps: number;
};

/**
 * Map Stimpmeter reading to a rough characteristic dying-putt speed (m/s).
 * Faster greens → higher v → less time for gravity → less break.
 */
export function stimpToSpeedMps(stimp: number): number {
  const s = Number.isFinite(stimp) ? Math.min(14, Math.max(6, stimp)) : 10;
  // Empirically tuned proxy: ~0.55 m/s @ Stimp 7 → ~1.1 m/s @ Stimp 13
  return 0.2 + 0.07 * s;
}

/**
 * Lateral aim offset from side slope only (physics-lite dying putt).
 * offsetM ≈ 0.5 * g * sin(θ_side) * (distanceM / v)²
 *
 * Sign: positive sideDeg means break to golfer's right, so aim left of cup (negative offset).
 */
export function estimateAimOffset(
  reading: SlopeReading,
  distanceFeet: number,
  stimp: number,
): AimEstimate {
  const distFt = Number.isFinite(distanceFeet) ? Math.min(80, Math.max(0, distanceFeet)) : 0;
  const speedMps = stimpToSpeedMps(stimp);
  const distanceM = distFt * FT_TO_M;

  if (distFt < 0.5 || Math.abs(reading.sideDeg) < 0.15) {
    return {
      offsetInches: 0,
      ballWidths: 0,
      aimLabel: "straight",
      stimp: Number.isFinite(stimp) ? stimp : 10,
      distanceFeet: distFt,
      speedMps,
    };
  }

  const thetaRad = (reading.sideDeg * Math.PI) / 180;
  const t = distanceM / speedMps;
  // Break distance toward the low side (same sign as sideDeg).
  const breakM = 0.5 * G * Math.sin(thetaRad) * t * t;
  // Aim opposite the break.
  const offsetInches = -breakM * M_TO_IN;
  const ballWidths = offsetInches / GOLF_BALL_DIAMETER_IN;

  let aimLabel: AimEstimate["aimLabel"] = "straight";
  if (offsetInches > 0.15) aimLabel = "right";
  else if (offsetInches < -0.15) aimLabel = "left";

  return {
    offsetInches,
    ballWidths,
    aimLabel,
    stimp: Number.isFinite(stimp) ? stimp : 10,
    distanceFeet: distFt,
    speedMps,
  };
}

export function formatAimCallout(aim: AimEstimate): string {
  if (aim.aimLabel === "straight") return "Aim at the center of the cup";
  const inches = Math.abs(aim.offsetInches);
  const balls = Math.abs(aim.ballWidths);
  const inchLabel = inches < 12 ? `${inches.toFixed(1)} in` : `${(inches / 12).toFixed(1)} ft`;
  return `Aim ~${inchLabel} (${balls.toFixed(1)} balls) ${aim.aimLabel} of the cup`;
}
