import type { SavedRound, RoundId } from "@/types/round";

const STORAGE_KEY = "justswangin-rounds-v1";
const MAX_ROUNDS = 50;

function nowISO() {
  return new Date().toISOString();
}

function makeId(): RoundId {
  // Prefer crypto if available (browser + modern node). Fallback is fine for local-only.
  const maybeCrypto = globalThis as unknown as {
    crypto?: { randomUUID?: () => string };
  };
  if (maybeCrypto.crypto && typeof maybeCrypto.crypto.randomUUID === "function") {
    return maybeCrypto.crypto.randomUUID() as RoundId;
  }
  return `r_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function saveRoundLocal(
  roundInput: Omit<SavedRound, "id" | "createdAtISO">,
): RoundId | null {
  const id = makeId();
  const createdAtISO = nowISO();

  const next: SavedRound = { id, createdAtISO, ...roundInput };
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const existing = raw ? (safeParse<SavedRound[]>(raw) ?? []) : [];

  const merged = [next, ...existing].slice(0, MAX_ROUNDS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  return id;
}

export function loadRoundsLocal(): SavedRound[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return safeParse<SavedRound[]>(raw) ?? [];
}

export function clearRoundsLocal() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function sortRoundsNewestFirst(rounds: SavedRound[]): SavedRound[] {
  return [...rounds].sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
