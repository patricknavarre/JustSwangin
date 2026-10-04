import type { SavedRound, RoundId } from "@/types/round";

const STORAGE_KEY = "justswangin-rounds-v1";
const MAX_ROUNDS = 50;

function nowISO() {
  return new Date().toISOString();
}

function makeId(): RoundId {
  const maybeCrypto = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  if (maybeCrypto.crypto && typeof maybeCrypto.crypto.randomUUID === "function") {
    return maybeCrypto.crypto.randomUUID() as RoundId;
  }
  return `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readAll(): SavedRound[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse<SavedRound[]>(raw) ?? [];
}

function writeAll(rounds: SavedRound[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rounds.slice(0, MAX_ROUNDS)));
}

export function computeRoundTotals(
  holeScoresStrokes: Array<number | null>,
  totalPar: number,
): { totalStrokes: number; netToPar: number; holesEntered: number } {
  let totalStrokes = 0;
  let holesEntered = 0;
  for (const v of holeScoresStrokes) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      totalStrokes += v;
      holesEntered += 1;
    }
  }
  return {
    totalStrokes,
    netToPar: totalStrokes - totalPar,
    holesEntered,
  };
}

export function saveRoundLocal(
  roundInput: Omit<SavedRound, "id" | "createdAtISO">,
): RoundId | null {
  if (typeof window === "undefined") return null;
  const id = makeId();
  const createdAtISO = nowISO();
  const next: SavedRound = {
    id,
    createdAtISO,
    updatedAtISO: createdAtISO,
    ...roundInput,
  };
  writeAll([next, ...readAll()]);
  return id;
}

export function updateRoundLocal(
  id: RoundId,
  patch: Partial<Omit<SavedRound, "id" | "createdAtISO">>,
): boolean {
  if (typeof window === "undefined") return false;
  const existing = readAll();
  const idx = existing.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  const prev = existing[idx]!;
  existing[idx] = {
    ...prev,
    ...patch,
    updatedAtISO: nowISO(),
  };
  writeAll(existing);
  return true;
}

/** Create or update a round by id (creates when id is null / missing). */
export function upsertRoundLocal(
  roundInput: Omit<SavedRound, "id" | "createdAtISO"> & { id?: RoundId | null },
): RoundId | null {
  if (typeof window === "undefined") return null;
  const { id: maybeId, ...rest } = roundInput;
  if (maybeId && updateRoundLocal(maybeId, rest)) return maybeId;
  return saveRoundLocal(rest);
}

export function loadRoundsLocal(): SavedRound[] {
  return readAll();
}

export function clearRoundsLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function sortRoundsNewestFirst(rounds: SavedRound[]): SavedRound[] {
  return [...rounds].sort((a, b) => {
    const aKey = a.updatedAtISO ?? a.createdAtISO;
    const bKey = b.updatedAtISO ?? b.createdAtISO;
    return aKey < bKey ? 1 : -1;
  });
}

export function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
