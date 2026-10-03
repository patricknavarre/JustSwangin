import type { ClubAveragesMap } from "@/lib/clubAverages/storage";

export type CaddyClubOption = {
  clubName: string;
  avgCarryYards: number;
  source: "personal" | "default";
  sampleCount?: number;
};

export type CaddyRecommendation = {
  targetYards: number;
  primary: CaddyClubOption | null;
  longer: CaddyClubOption | null;
  shorter: CaddyClubOption | null;
  usedPersonalAverages: boolean;
  note: string;
};

/** Typical mid-handicap carry yardages when the player has no Club Averages yet. */
export const DEFAULT_BAG_CARRY: ReadonlyArray<{ clubName: string; avgCarryYards: number }> = [
  { clubName: "Driver", avgCarryYards: 230 },
  { clubName: "3-wood", avgCarryYards: 210 },
  { clubName: "5-wood", avgCarryYards: 195 },
  { clubName: "4-hybrid", avgCarryYards: 185 },
  { clubName: "5-iron", avgCarryYards: 170 },
  { clubName: "6-iron", avgCarryYards: 160 },
  { clubName: "7-iron", avgCarryYards: 150 },
  { clubName: "8-iron", avgCarryYards: 140 },
  { clubName: "9-iron", avgCarryYards: 130 },
  { clubName: "PW", avgCarryYards: 120 },
  { clubName: "GW", avgCarryYards: 105 },
  { clubName: "SW", avgCarryYards: 90 },
  { clubName: "LW", avgCarryYards: 70 },
];

function personalOptions(map: ClubAveragesMap): CaddyClubOption[] {
  return Object.values(map)
    .filter((c) => c.count > 0 && Number.isFinite(c.sum))
    .map((c) => ({
      clubName: c.clubName,
      avgCarryYards: c.sum / c.count,
      source: "personal" as const,
      sampleCount: c.count,
    }))
    .filter((c) => c.avgCarryYards > 0)
    .sort((a, b) => b.avgCarryYards - a.avgCarryYards);
}

function defaultOptions(): CaddyClubOption[] {
  return DEFAULT_BAG_CARRY.map((c) => ({
    clubName: c.clubName,
    avgCarryYards: c.avgCarryYards,
    source: "default" as const,
  }));
}

/**
 * Pick the club whose average carry is closest to target yards.
 * Prefer not coming up short when two clubs are similarly close (±8 yds).
 */
export function recommendClubFromDistance(
  targetYards: number,
  clubAverages: ClubAveragesMap,
): CaddyRecommendation {
  const yards = Math.max(0, Math.round(targetYards));
  const personal = personalOptions(clubAverages);
  const usedPersonalAverages = personal.length > 0;
  const bag = usedPersonalAverages ? personal : defaultOptions();

  if (!Number.isFinite(yards) || yards <= 0) {
    return {
      targetYards: yards,
      primary: null,
      longer: null,
      shorter: null,
      usedPersonalAverages,
      note: "Enter a distance to the green to get a club suggestion.",
    };
  }

  let best = bag[0]!;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const club of bag) {
    const delta = club.avgCarryYards - yards;
    const abs = Math.abs(delta);
    // Prefer clubs that cover the number when nearly tied
    const score = abs + (delta < 0 ? 3 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = club;
    }
  }

  const longer =
    bag
      .filter((c) => c.avgCarryYards > best.avgCarryYards + 0.5)
      .sort((a, b) => a.avgCarryYards - b.avgCarryYards)[0] ?? null;
  const shorter =
    bag
      .filter((c) => c.avgCarryYards < best.avgCarryYards - 0.5)
      .sort((a, b) => b.avgCarryYards - a.avgCarryYards)[0] ?? null;

  const diff = Math.round(best.avgCarryYards - yards);
  const cover =
    diff >= 0
      ? `about ${diff} yd past your number on average`
      : `about ${Math.abs(diff)} yd short of the number on average — consider the next longer club if you need carry`;

  const note = usedPersonalAverages
    ? `Based on your Club Averages. ${best.clubName} carries ~${Math.round(best.avgCarryYards)} yd (${cover}).`
    : `Using a default bag (import launch CSVs in Club Averages for personal distances). ${best.clubName} ~${Math.round(best.avgCarryYards)} yd (${cover}).`;

  return {
    targetYards: yards,
    primary: best,
    longer,
    shorter,
    usedPersonalAverages,
    note,
  };
}
