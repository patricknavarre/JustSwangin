import type { ScorecardPlayer } from "@/types/round";
import { defaultPlayers, playersFromRound } from "@/lib/rounds/players";

export type ScorecardSessionV1 = {
  version: 1;
  courseId: string;
  teeId: string;
  activeRoundId: string | null;
  holeScoresStrokes: Array<number | null>;
  updatedAtISO: string;
};

export type ScorecardSession = {
  version: 2;
  courseId: string;
  teeId: string;
  activeRoundId: string | null;
  players: ScorecardPlayer[];
  updatedAtISO: string;
};

const STORAGE_KEY = "justswangin-scorecard-session-v1";

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function migrateToV2(raw: unknown, holeCountHint?: number): ScorecardSession | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (!obj.courseId || typeof obj.courseId !== "string") return null;

  if (obj.version === 2 && Array.isArray(obj.players)) {
    return {
      version: 2,
      courseId: obj.courseId,
      teeId: typeof obj.teeId === "string" ? obj.teeId : "",
      activeRoundId: typeof obj.activeRoundId === "string" ? obj.activeRoundId : null,
      players: obj.players as ScorecardPlayer[],
      updatedAtISO:
        typeof obj.updatedAtISO === "string" ? obj.updatedAtISO : new Date().toISOString(),
    };
  }

  if (obj.version === 1 || Array.isArray(obj.holeScoresStrokes)) {
    const scores = (obj.holeScoresStrokes as Array<number | null>) ?? [];
    const holeCount = holeCountHint && holeCountHint > 0 ? holeCountHint : Math.max(scores.length, 18);
    return {
      version: 2,
      courseId: obj.courseId,
      teeId: typeof obj.teeId === "string" ? obj.teeId : "",
      activeRoundId: typeof obj.activeRoundId === "string" ? obj.activeRoundId : null,
      players: playersFromRound(scores, undefined, holeCount),
      updatedAtISO:
        typeof obj.updatedAtISO === "string" ? obj.updatedAtISO : new Date().toISOString(),
    };
  }

  return null;
}

export function loadScorecardSession(holeCountHint?: number): ScorecardSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeParse<unknown>(raw);
  return migrateToV2(parsed, holeCountHint);
}

export function saveScorecardSession(
  session: Omit<ScorecardSession, "version" | "updatedAtISO">,
): void {
  if (typeof window === "undefined") return;
  const payload: ScorecardSession = {
    version: 2,
    updatedAtISO: new Date().toISOString(),
    ...session,
    players: session.players.length ? session.players : defaultPlayers(18),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearScorecardSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
