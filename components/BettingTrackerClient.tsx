"use client";

import { useEffect, useMemo, useState } from "react";
import type { CourseScorecard, ScorecardCourseSummary } from "@/types/scorecard";
import type { SavedRound, RoundId } from "@/types/round";
import {
  loadRoundsLocal,
  sortRoundsNewestFirst,
} from "@/lib/rounds/storage";

type BettingFormat = "nassau" | "skins" | "wolf" | "stableford" | "matchplay";

type PlayerDraft = {
  name: string;
  // hole index = holeNumber-1
  holeStrokes: Array<number | null>;
  selectedRoundId: RoundId | null;
  handicap?: number;
};

const PLAYER_DEFAULTS = ["Player 1", "Player 2", "Player 3", "Player 4"];

function teeById(tees: CourseScorecard["tees"], teeId: string): CourseScorecard["tees"][number] {
  return tees.find((t) => t.teeId === teeId) ?? tees[0];
}

export function BettingTrackerClient() {
  const [knownCourses, setKnownCourses] = useState<ScorecardCourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<CourseScorecard | null>(null);
  const [selectedTeeId, setSelectedTeeId] = useState<string>("");

  const [savedRounds, setSavedRounds] = useState<SavedRound[]>([]);
  const [playersCount, setPlayersCount] = useState<number>(2);
  const [players, setPlayers] = useState<PlayerDraft[]>([]);

  const [format, setFormat] = useState<BettingFormat>("nassau");
  const [skinsCarryover, setSkinsCarryover] = useState(false);

  // v1 stakes inputs (flat pot units)
  const [stakePerHole, setStakePerHole] = useState(10); // skins/wolf/stableford
  const [stakeFront9, setStakeFront9] = useState(20);
  const [stakeBack9, setStakeBack9] = useState(20);
  const [stakeOverall, setStakeOverall] = useState(20); // nassau/matchplay settlement pot

  // If a player's handicap is set, we compute net scores by distributing handicap strokes across holes.

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/scorecard/courses", { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load course list");
        const json = (await res.json()) as { courses: ScorecardCourseSummary[] };
        setKnownCourses(json.courses);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load courses");
      }
    })();
  }, []);

  useEffect(() => {
    try {
      setSavedRounds(sortRoundsNewestFirst(loadRoundsLocal()));
    } catch {
      setSavedRounds([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedCourse(null);
      setSelectedTeeId("");
      setPlayers([]);
      return;
    }

    void (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/scorecard/${selectedCourseId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load scorecard");
        const json = (await res.json()) as { course: CourseScorecard };
        setSelectedCourse(json.course);
        setSelectedTeeId(json.course.tees[0]?.teeId ?? "");

        setPlayers(
          new Array(playersCount).fill(null).map((_, i) => ({
            name: PLAYER_DEFAULTS[i] ?? `Player ${i + 1}`,
            holeStrokes: new Array(json.course.holes.length).fill(null),
            selectedRoundId: null,
            handicap: undefined,
          })),
        );
      } catch (e) {
        setSelectedCourse(null);
        setError(e instanceof Error ? e.message : "Failed to load scorecard");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse) return;
    setPlayers((prev) => {
      const next = new Array(playersCount).fill(null).map((_, i) => prev[i] ?? null);
      return next.map((p, i) => {
        if (!p) {
          return {
            name: PLAYER_DEFAULTS[i] ?? `Player ${i + 1}`,
            holeStrokes: new Array(selectedCourse.holes.length).fill(null),
            selectedRoundId: null,
            handicap: undefined,
          };
        }
        // Adjust hole strokes length if needed
        return {
          ...p,
          holeStrokes: p.holeStrokes.length === selectedCourse.holes.length ? p.holeStrokes : new Array(selectedCourse.holes.length).fill(null),
        };
      });
    });
  }, [playersCount, selectedCourse]);

  const roundsForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return savedRounds.filter((r) => r.courseId === selectedCourse.courseId && r.teeId === selectedTeeId);
  }, [savedRounds, selectedCourse, selectedTeeId]);

  function setPlayerRound(playerIdx: number, roundId: RoundId | null) {
    if (!selectedCourse) return;
    setPlayers((prev) => {
      const next = [...prev];
      const player = next[playerIdx];
      if (!player) return prev;

      if (!roundId) {
        next[playerIdx] = {
          ...player,
          selectedRoundId: null,
          holeStrokes: new Array(selectedCourse.holes.length).fill(null),
        };
        return next;
      }

      const found = savedRounds.find((r) => r.id === roundId);
      if (!found) return prev;

      next[playerIdx] = {
        ...player,
        selectedRoundId: roundId,
        holeStrokes: [...found.holeScoresStrokes],
      };
      return next;
    });
  }

  function setPlayerStroke(playerIdx: number, holeNumber: number, strokes: number | null) {
    setPlayers((prev) => {
      const next = [...prev];
      const player = next[playerIdx];
      if (!player) return prev;

      const holeIdx = holeNumber - 1;
      const hs = [...player.holeStrokes];
      hs[holeIdx] = strokes;
      next[playerIdx] = { ...player, holeStrokes: hs };
      return next;
    });
  }

  const selectedTee = useMemo(() => {
    if (!selectedCourse) return null;
    return teeById(selectedCourse.tees, selectedTeeId);
  }, [selectedCourse, selectedTeeId]);

  const canCompute =
    Boolean(selectedCourse) &&
    players.length > 1 &&
    selectedCourse?.holes.length != null &&
    players.every(
      (p) =>
        p.holeStrokes.length === selectedCourse.holes.length &&
        p.holeStrokes.every((v) => typeof v === "number" && Number.isFinite(v)),
    );

  const settlement = useMemo(() => {
    if (!selectedCourse || !canCompute) return null;

    const holes = selectedCourse.holes;
    const holeCount = holes.length;

    const getHandicapAdjustment = (hole: (typeof holes)[number], playerHandicap?: number) => {
      if (typeof playerHandicap !== "number" || !Number.isFinite(playerHandicap)) return 0;
      if (!hole.handicap) return 0;
      if (playerHandicap <= 0) return 0;

      const full = Math.floor(playerHandicap / 18);
      const rem = playerHandicap % 18; // remainder strokes distributed by hole handicap index
      const extra = hole.handicap <= rem ? 1 : 0;
      return full + extra;
    };

    const netByPlayer: number[][] = players.map((p) =>
      holes.map((hole, idx) => {
        const gross = p.holeStrokes[idx] as number;
        const adj = getHandicapAdjustment(hole, p.handicap);
        return gross - adj;
      }),
    );

    const applyPot = (
      pot: number,
      winnersIdxs: number[],
      due: number[],
      losersIdxs: number[],
    ) => {
      if (pot <= 0) return;
      if (winnersIdxs.length === 0 || losersIdxs.length === 0) return;

      const winnersShare = pot / winnersIdxs.length;
      for (const wi of winnersIdxs) due[wi] += winnersShare;

      const losersShare = pot / losersIdxs.length;
      for (const li of losersIdxs) due[li] -= losersShare;
    };

    const playersIdxs = players.map((_, i) => i);
    const due = new Array(players.length).fill(0);

    const formatLabel =
      format === "nassau"
        ? "Nassau"
        : format === "skins"
          ? `Skins${skinsCarryover ? " (carry-over)" : ""}`
          : format === "wolf"
            ? "Wolf"
            : format === "stableford"
              ? "Stableford"
              : "Match play";

    const netTotals = playersIdxs.map((i) => netByPlayer[i].reduce((s, v) => s + v, 0));

    if (format === "nassau") {
      const segment = (from: number, to: number) => {
        const start = Math.max(0, from - 1);
        const end = Math.min(holeCount, to);
        const idxs = playersIdxs.map((pi) => {
          const total = netByPlayer[pi].slice(start, end).reduce((s, v) => s + v, 0);
          return { pi, total };
        });
        const best = Math.min(...idxs.map((x) => x.total));
        const winners = idxs.filter((x) => x.total === best).map((x) => x.pi);
        const losers = playersIdxs.filter((pi) => !winners.includes(pi));
        return { winners, losers };
      };

      const front = segment(1, 9);
      const back = segment(10, 18);
      const overall = segment(1, 18);

      applyPot(stakeFront9, front.winners, due, front.losers);
      applyPot(stakeBack9, back.winners, due, back.losers);
      applyPot(stakeOverall, overall.winners, due, overall.losers);

      const topDue = Math.max(...due);
      const winnerIdxs = due
        .map((v, i) => (v === topDue ? i : null))
        .filter((x): x is number => x != null);

      return {
        formatLabel,
        due,
        winnerIdxs,
      };
    }

    if (format === "skins") {
      let carryPot = 0;

      for (let holeIdx = 0; holeIdx < holeCount; holeIdx++) {
        const scores = playersIdxs.map((pi) => ({ pi, v: netByPlayer[pi][holeIdx] }));
        const best = Math.min(...scores.map((s) => s.v));
        const winners = scores.filter((s) => s.v === best).map((s) => s.pi);
        const losers = playersIdxs.filter((pi) => !winners.includes(pi));

        const isTie = winners.length > 1;
        if (isTie) {
          if (skinsCarryover) {
            carryPot += stakePerHole;
          } else {
            applyPot(stakePerHole, winners, due, losers);
          }
          continue;
        }

        // single-hole winner
        const transfer = stakePerHole + (skinsCarryover ? carryPot : 0);
        applyPot(transfer, winners, due, losers);
        carryPot = 0;
      }

      if (skinsCarryover && carryPot > 0) {
        const bestTotal = Math.min(...netTotals);
        const winnersOverall = playersIdxs.filter((pi) => netTotals[pi] === bestTotal);
        const losersOverall = playersIdxs.filter((pi) => !winnersOverall.includes(pi));
        applyPot(carryPot, winnersOverall, due, losersOverall);
      }

      const topDue = Math.max(...due);
      const winnerIdxs = due
        .map((v, i) => (v === topDue ? i : null))
        .filter((x): x is number => x != null);

      return {
        formatLabel,
        due,
        winnerIdxs,
      };
    }

    if (format === "wolf") {
      for (let holeIdx = 0; holeIdx < holeCount; holeIdx++) {
        const scores = playersIdxs.map((pi) => ({ pi, v: netByPlayer[pi][holeIdx] }));
        const best = Math.min(...scores.map((s) => s.v));
        const winners = scores.filter((s) => s.v === best).map((s) => s.pi);
        const wolfIdx = holeIdx % players.length;

        if (winners.includes(wolfIdx)) {
          const losers = playersIdxs.filter((pi) => !winners.includes(pi));
          applyPot(stakePerHole, winners, due, losers);
        } else {
          // wolf pays stake to the hole winner(s)
          applyPot(stakePerHole, winners, due, [wolfIdx]);
        }
      }

      const topDue = Math.max(...due);
      const winnerIdxs = due
        .map((v, i) => (v === topDue ? i : null))
        .filter((x): x is number => x != null);

      return {
        formatLabel,
        due,
        winnerIdxs,
      };
    }

    if (format === "stableford") {
      const pointsForDelta = (delta: number) => {
        // Modified scoring relative to par: <= -3 => 5, -2 => 4, -1 => 3, 0 => 2, +1 => 1, +2+ => 0
        if (delta <= -3) return 5;
        if (delta === -2) return 4;
        if (delta === -1) return 3;
        if (delta === 0) return 2;
        if (delta === 1) return 1;
        return 0;
      };

      const points = new Array(players.length).fill(0);
      for (let holeIdx = 0; holeIdx < holeCount; holeIdx++) {
        const par = holes[holeIdx].par;
        for (let pi = 0; pi < players.length; pi++) {
          const net = netByPlayer[pi][holeIdx];
          const delta = net - par;
          points[pi] += pointsForDelta(delta);
        }
      }

      const bestPoints = Math.max(...points);
      const winnerIdxs = playersIdxs.filter((pi) => points[pi] === bestPoints);
      const losers = playersIdxs.filter((pi) => !winnerIdxs.includes(pi));
      applyPot(stakeOverall, winnerIdxs, due, losers);

      return { formatLabel, due, winnerIdxs };
    }

    if (format === "matchplay") {
      if (players.length !== 2) {
        return {
          formatLabel,
          due: new Array(players.length).fill(0),
          winnerIdxs: [0],
          warning: "Match play settlement supports 2 players in v1.",
        };
      }

      let winsA = 0;
      let winsB = 0;
      for (let holeIdx = 0; holeIdx < holeCount; holeIdx++) {
        const a = netByPlayer[0][holeIdx];
        const b = netByPlayer[1][holeIdx];
        if (a < b) winsA++;
        else if (b < a) winsB++;
      }

      const winnerIdxs = winsA === winsB ? [0, 1] : winsA > winsB ? [0] : [1];
      const losers = playersIdxs.filter((pi) => !winnerIdxs.includes(pi));
      applyPot(stakeOverall, winnerIdxs, due, losers);

      return { formatLabel, due, winnerIdxs };
    }

    return null;
  }, [
    canCompute,
    format,
    players,
    skinsCarryover,
    stakeBack9,
    stakeFront9,
    stakeOverall,
    stakePerHole,
    selectedCourse,
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-emerald-200 via-green-500 to-emerald-900 px-6 py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90">
            Betting tracker
          </p>
          <h1 className="font-display mt-1 text-3xl text-white sm:text-4xl">Game Tracker</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
            Set up a friendly wager and log strokes. (v1: prefill from your saved rounds.)
          </p>
        </div>
      </div>

      <section className="card">
        <h2 className="section-heading">Setup</h2>

        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-[var(--text)]">
            Course
            <select
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select course...</option>
              {knownCourses.map((c) => (
                <option key={c.courseId} value={c.courseId}>
                  {c.name} ({c.city}, {c.state})
                </option>
              ))}
            </select>
          </label>

          {selectedCourse && (
            <label className="block text-sm font-medium text-[var(--text)]">
              Tee
              <select
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
                value={selectedTeeId}
                onChange={(e) => {
                  setSelectedTeeId(e.target.value);
                  // Reset strokes since the tee might change hole set expectations
                  setPlayers((prev) =>
                    prev.map((p) => ({ ...p, selectedRoundId: null, holeStrokes: new Array(selectedCourse.holes.length).fill(null) })),
                  );
                }}
              >
                {selectedCourse.tees.map((t) => (
                  <option key={t.teeId} value={t.teeId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-sm font-medium text-[var(--text)]">
            Players
            <select
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
              value={playersCount}
              onChange={(e) => setPlayersCount(Math.max(2, Math.min(4, Number(e.target.value))))}
            >
              <option value={2}>2 players</option>
              <option value={3}>3 players</option>
              <option value={4}>4 players</option>
            </select>
          </label>

          {selectedCourse && (
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">
                Prefill from saved rounds ({roundsForSelectedCourse.length} found)
              </p>
              <div className="mt-3 space-y-4">
                {players.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-black/[0.08] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        className="w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm text-[var(--text)]"
                        value={p.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlayers((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], name: v };
                            return next;
                          });
                        }}
                      />
                    </div>

                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                        Use saved round (optional)
                      </label>
                      <select
                        className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm text-[var(--text)]"
                        value={p.selectedRoundId ?? ""}
                        onChange={(e) => setPlayerRound(idx, e.target.value ? (e.target.value as RoundId) : null)}
                      >
                        <option value="">Manual entry</option>
                        {roundsForSelectedCourse.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.teeName} • {r.totalStrokes}/{r.totalPar}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="mt-3 block text-xs font-semibold text-[var(--text-secondary)]">
                      Handicap (optional)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-sm text-[var(--text)]"
                        value={typeof p.handicap === "number" && Number.isFinite(p.handicap) ? p.handicap : ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const n = raw === "" ? undefined : Math.trunc(Number(raw));
                          if (raw !== "") {
                            if (n == null || !Number.isFinite(n) || n < 0) return;
                          }
                          setPlayers((prev) => {
                            const next = [...prev];
                            const player = next[idx];
                            if (!player) return prev;
                            next[idx] = { ...player, handicap: n };
                            return next;
                          });
                        }}
                      />
                    </label>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[var(--text-secondary)]">
                          Hole strokes
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Total:{" "}
                          {p.holeStrokes.reduce<number>(
                            (sum, v) => sum + (typeof v === "number" ? v : 0),
                            0,
                          )}
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-6 gap-2">
                        {selectedCourse.holes.map((h) => {
                          const v = p.holeStrokes[h.holeNumber - 1];
                          return (
                            <div key={h.holeNumber} className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-semibold text-[var(--section-label)]">
                                {h.holeNumber}
                              </span>
                              <input
                                inputMode="numeric"
                                type="number"
                                min={0}
                                className="w-[42px] rounded-lg border border-black/[0.12] bg-white px-2 py-2 text-sm outline-none focus:border-[var(--accent)]/50"
                                value={typeof v === "number" ? v : ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    setPlayerStroke(idx, h.holeNumber, null);
                                    return;
                                  }
                                  const n = Math.trunc(Number(raw));
                                  if (!Number.isFinite(n) || n < 0) {
                                    setPlayerStroke(idx, h.holeNumber, null);
                                    return;
                                  }
                                  setPlayerStroke(idx, h.holeNumber, n);
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2 className="section-heading">Game format</h2>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-[var(--text)]">
            Format
            <select
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
              value={format}
              onChange={(e) => setFormat(e.target.value as BettingFormat)}
              disabled={!selectedCourse}
            >
              <option value="nassau">Nassau</option>
              <option value="skins">Skins</option>
              <option value="wolf">Wolf</option>
              <option value="stableford">Stableford</option>
              <option value="matchplay">Match play</option>
            </select>
          </label>

          {format === "skins" && (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={skinsCarryover}
                onChange={(e) => setSkinsCarryover(e.target.checked)}
              />
              <span className="text-[var(--text-secondary)]">Skins carry-over</span>
            </label>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--text)]">
              Stake per hole
              <input
                type="number"
                min={0}
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
                value={stakePerHole}
                onChange={(e) => setStakePerHole(Math.max(0, Number(e.target.value)))}
              />
            </label>

            <label className="block text-sm font-medium text-[var(--text)]">
              Overall stake
              <input
                type="number"
                min={0}
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
                value={stakeOverall}
                onChange={(e) => setStakeOverall(Math.max(0, Number(e.target.value)))}
              />
            </label>

            {format === "nassau" && (
              <>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Nassau stake (Front 9)
                  <input
                    type="number"
                    min={0}
                    className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
                    value={stakeFront9}
                    onChange={(e) => setStakeFront9(Math.max(0, Number(e.target.value)))}
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--text)]">
                  Nassau stake (Back 9)
                  <input
                    type="number"
                    min={0}
                    className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
                    value={stakeBack9}
                    onChange={(e) => setStakeBack9(Math.max(0, Number(e.target.value)))}
                  />
                </label>
              </>
            )}
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Settlement appears below once every hole is entered for each player.
          </p>
        </div>
      </section>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      <section className="card">
        <h2 className="section-heading">Settlement</h2>
        {!selectedCourse ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Select a course to start.</p>
        ) : !canCompute ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Enter strokes for every hole for each player to compute settlement.
          </p>
        ) : settlement ? (
          <div className="mt-3 rounded-xl border border-black/[0.08] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{settlement.formatLabel}</p>
                <p className="mt-1 text-xs text-[var(--section-label)]">
                  {players.some((p) => typeof p.handicap === "number") ? "Using net scoring with handicap (entered per player)." : "Using gross scoring."}
                </p>
              </div>
              {selectedTee && (
                <p className="text-xs text-[var(--section-label)]">
                  Tee: {selectedTee.name}
                </p>
              )}
            </div>

            {"warning" in settlement && settlement.warning && (
              <p className="mt-3 text-xs text-[var(--warn)]">{settlement.warning}</p>
            )}

            <div className="mt-4 space-y-2">
              {players.map((p, idx) => {
                const v = settlement.due[idx] ?? 0;
                const isWinner = settlement.winnerIdxs.includes(idx);
                const sign = v > 0 ? "won" : v < 0 ? "owes" : "tied";
                const amount = Math.abs(v);
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border border-black/[0.08] bg-[var(--card)] px-3 py-2 ${
                      isWinner ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--text)]">{p.name}</p>
                      <p className="text-sm font-display text-[var(--text)]">
                        {sign === "tied" ? "—" : sign}{" "}
                        {sign === "tied" ? "" : `$${amount.toFixed(0)}`}
                      </p>
                    </div>
                    {sign !== "tied" && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Net payout: {v >= 0 ? "+" : "-"}${amount.toFixed(0)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No settlement available.</p>
        )}
      </section>
    </div>
  );
}

