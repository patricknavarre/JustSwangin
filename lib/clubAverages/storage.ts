import type { LaunchMonitorShot } from "@/types/swing";

export type ClubCarryStats = {
  clubName: string;
  count: number;
  sum: number; // sum(carryYards)
  sumSq: number; // sum(carryYards^2)
  min: number;
  max: number;
};

export type ClubAveragesMap = Record<string, ClubCarryStats>;

const STORAGE_KEY = "justswangin-club-averages-v1";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getClubAverages(): ClubAveragesMap {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  return safeParse<ClubAveragesMap>(raw) ?? {};
}

export function saveClubAverages(map: ClubAveragesMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function mergeClubAveragesFromShots(
  existing: ClubAveragesMap,
  shots: LaunchMonitorShot[],
): ClubAveragesMap {
  const out: ClubAveragesMap = { ...existing };

  for (const shot of shots) {
    const clubName = shot.club?.trim() || "Unknown";
    const carry = shot.carryYards;
    if (!Number.isFinite(carry) || carry <= 0) continue;

    const prev = out[clubName];
    const next: ClubCarryStats = prev
      ? {
          ...prev,
          count: prev.count + 1,
          sum: prev.sum + carry,
          sumSq: prev.sumSq + carry * carry,
          min: Math.min(prev.min, carry),
          max: Math.max(prev.max, carry),
        }
      : {
          clubName,
          count: 1,
          sum: carry,
          sumSq: carry * carry,
          min: carry,
          max: carry,
        };

    out[clubName] = next;
  }

  return out;
}

