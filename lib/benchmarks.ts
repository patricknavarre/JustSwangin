import type { GolfShotType } from "@/types/swing";

export type SwingBenchmarkTable = {
  hipShoulderSeparationAtImpact: { min: number; ideal: number; max: number };
  spineTiltAtAddress: { min: number; ideal: number; max: number };
  kneeFlexAtAddress: { min: number; ideal: number; max: number };
  leadArmExtensionAtTop: { min: number; ideal: number; max: number };
  hipRotationBackswing: { min: number; ideal: number; max: number };
  hipRotationFollowThrough: { min: number; ideal: number; max: number };
  tempoRatio: { min: number; ideal: number; max: number };
  headLateralMovement: { min: number; ideal: number; max: number };
};

/** Driver / full-swing reference bands (baseline for tour-style motion). */
export const SWING_BENCHMARKS: SwingBenchmarkTable = {
  hipShoulderSeparationAtImpact: { min: 40, ideal: 45, max: 55 },
  spineTiltAtAddress: { min: 25, ideal: 30, max: 35 },
  kneeFlexAtAddress: { min: 20, ideal: 25, max: 30 },
  leadArmExtensionAtTop: { min: 160, ideal: 170, max: 180 },
  hipRotationBackswing: { min: 40, ideal: 50, max: 60 },
  hipRotationFollowThrough: { min: 35, ideal: 42, max: 50 },
  tempoRatio: { min: 2.5, ideal: 3.0, max: 3.5 },
  headLateralMovement: { min: 0, ideal: 0.5, max: 2.0 },
};

/** Slightly more forward posture and acceptable quicker tempo vs driver. */
const IRON_SWING_BENCHMARKS: SwingBenchmarkTable = {
  hipShoulderSeparationAtImpact: { min: 38, ideal: 44, max: 56 },
  spineTiltAtAddress: { min: 28, ideal: 32, max: 38 },
  kneeFlexAtAddress: { min: 20, ideal: 26, max: 32 },
  leadArmExtensionAtTop: { min: 158, ideal: 168, max: 180 },
  hipRotationBackswing: { min: 38, ideal: 48, max: 60 },
  hipRotationFollowThrough: { min: 33, ideal: 41, max: 52 },
  tempoRatio: { min: 2.3, ideal: 2.8, max: 3.3 },
  headLateralMovement: { min: 0, ideal: 0.5, max: 2.0 },
};

/** Shorter swing arc; a bit more spine tilt and rotation slack than iron. */
const WEDGE_SWING_BENCHMARKS: SwingBenchmarkTable = {
  hipShoulderSeparationAtImpact: { min: 36, ideal: 43, max: 57 },
  spineTiltAtAddress: { min: 30, ideal: 35, max: 42 },
  kneeFlexAtAddress: { min: 18, ideal: 26, max: 34 },
  leadArmExtensionAtTop: { min: 152, ideal: 165, max: 179 },
  hipRotationBackswing: { min: 32, ideal: 44, max: 58 },
  hipRotationFollowThrough: { min: 30, ideal: 40, max: 53 },
  tempoRatio: { min: 2.1, ideal: 2.6, max: 3.5 },
  headLateralMovement: { min: 0, ideal: 0.6, max: 2.2 },
};

/** Short game: wide bands — same pose math, not scored like a full swing. */
const CHIP_SWING_BENCHMARKS: SwingBenchmarkTable = {
  hipShoulderSeparationAtImpact: { min: 22, ideal: 42, max: 62 },
  spineTiltAtAddress: { min: 18, ideal: 36, max: 52 },
  kneeFlexAtAddress: { min: 12, ideal: 28, max: 42 },
  leadArmExtensionAtTop: { min: 130, ideal: 162, max: 180 },
  hipRotationBackswing: { min: 10, ideal: 32, max: 58 },
  hipRotationFollowThrough: { min: 15, ideal: 36, max: 58 },
  tempoRatio: { min: 1.4, ideal: 2.4, max: 4.8 },
  headLateralMovement: { min: 0, ideal: 1.0, max: 3.2 },
};

export function getSwingBenchmarks(shot: GolfShotType = "driver"): SwingBenchmarkTable {
  switch (shot) {
    case "iron":
      return IRON_SWING_BENCHMARKS;
    case "wedge":
      return WEDGE_SWING_BENCHMARKS;
    case "chip":
      return CHIP_SWING_BENCHMARKS;
    default:
      return SWING_BENCHMARKS;
  }
}

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
