import type { LaunchMonitorShot, ShotShape } from "@/types/swing";
import type { LaunchAverages } from "@/lib/clubFitting/types";

function sumField(shots: LaunchMonitorShot[], key: keyof LaunchMonitorShot): number {
  const n = shots.length || 1;
  return (
    shots.reduce((a, s) => a + (typeof s[key] === "number" ? (s[key] as number) : 0), 0) / n
  );
}

function dominantShape(shots: LaunchMonitorShot[]): ShotShape | null {
  if (!shots.length) return null;
  const counts = new Map<ShotShape, number>();
  for (const s of shots) {
    counts.set(s.shotShape, (counts.get(s.shotShape) ?? 0) + 1);
  }
  let best: ShotShape | null = null;
  let max = 0;
  for (const [shape, c] of Array.from(counts.entries())) {
    if (c > max) {
      max = c;
      best = shape;
    }
  }
  return best;
}

export function averageLaunchShots(shots: LaunchMonitorShot[]): LaunchAverages | null {
  if (!shots.length) return null;
  return {
    clubSpeedMph: sumField(shots, "clubSpeedMph"),
    ballSpeedMph: sumField(shots, "ballSpeedMph"),
    smashFactor: sumField(shots, "smashFactor"),
    launchAngleDeg: sumField(shots, "launchAngleDeg"),
    spinRateRpm: sumField(shots, "spinRateRpm"),
    clubPathDeg: sumField(shots, "clubPathDeg"),
    faceAngleDeg: sumField(shots, "faceAngleDeg"),
    attackAngleDeg: sumField(shots, "attackAngleDeg"),
    carryYards: sumField(shots, "carryYards"),
    dominantShape: dominantShape(shots),
    shotCount: shots.length,
  };
}
