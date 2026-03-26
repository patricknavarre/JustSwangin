export const SWING_BENCHMARKS = {
  hipShoulderSeparationAtImpact: { min: 40, ideal: 45, max: 55 },
  spineTiltAtAddress: { min: 25, ideal: 30, max: 35 },
  kneeFlexAtAddress: { min: 20, ideal: 25, max: 30 },
  leadArmExtensionAtTop: { min: 160, ideal: 170, max: 180 },
  hipRotationBackswing: { min: 40, ideal: 50, max: 60 },
  hipRotationFollowThrough: { min: 35, ideal: 42, max: 50 },
  tempoRatio: { min: 2.5, ideal: 3.0, max: 3.5 },
  headLateralMovement: { min: 0, ideal: 0.5, max: 2.0 },
} as const;

export function metricStatus(
  value: number,
  min: number,
  ideal: number,
  max: number,
  lowerIsBetter = false,
): "good" | "borderline" | "needsWork" {
  if (lowerIsBetter) {
    if (value <= ideal) return "good";
    if (value <= max) return "borderline";
    return "needsWork";
  }
  const range = (max - min) / 2;
  if (value >= min && value <= max) {
    const mid = (min + max) / 2;
    if (Math.abs(value - mid) <= range * 0.35) return "good";
    return "borderline";
  }
  if (value >= min - 5 && value <= max + 5) return "borderline";
  return "needsWork";
}
