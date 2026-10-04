"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScorecardTable } from "@/components/ScorecardTable";
import { ScorecardPlayersPanel } from "@/components/ScorecardPlayersPanel";
import { CaddyModePanel } from "@/components/CaddyModePanel";
import type {
  CourseScorecard,
  NearbyCourseSuggestion,
  ScorecardCourseSummary,
} from "@/types/scorecard";
import type { SavedRound, ScorecardPlayer } from "@/types/round";
import {
  computeRoundTotals,
  loadRoundsLocal,
  sortRoundsNewestFirst,
  formatDateShort,
  upsertRoundLocal,
} from "@/lib/rounds/storage";
import {
  clearScorecardSession,
  loadScorecardSession,
  saveScorecardSession,
} from "@/lib/rounds/session";
import {
  MAX_SCORECARD_PLAYERS,
  allPlayersComplete,
  anyScoresEntered,
  countEnteredHoles,
  createPlayer,
  defaultPlayers,
  padPlayerScores,
  playersFromRound,
} from "@/lib/rounds/players";

type NearbyResponse = {
  courses: NearbyCourseSuggestion[];
  source: string;
  warning?: string;
};

type CoursesResponse = {
  courses: ScorecardCourseSummary[];
};

export function ScorecardClient() {
  const [knownCourses, setKnownCourses] = useState<ScorecardCourseSummary[]>([]);
  const [nearbyCourses, setNearbyCourses] = useState<NearbyCourseSuggestion[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<CourseScorecard | null>(null);
  const [selectedTeeId, setSelectedTeeId] = useState<string>("");
  const [savedRounds, setSavedRounds] = useState<SavedRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [players, setPlayers] = useState<ScorecardPlayer[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [nearbySource, setNearbySource] = useState<string | null>(null);
  const [nearbyWarning, setNearbyWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unsupported"
  >("idle");
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextTeeReset = useRef(false);
  const activeRoundIdRef = useRef(activeRoundId);
  activeRoundIdRef.current = activeRoundId;

  useEffect(() => {
    void fetchKnownCourses();
    try {
      setSavedRounds(sortRoundsNewestFirst(loadRoundsLocal()));
    } catch {
      setSavedRounds([]);
    }
    const session = loadScorecardSession();
    if (session?.courseId) {
      setSelectedCourseId(session.courseId);
      setSelectedTeeId(session.teeId);
      setActiveRoundId(session.activeRoundId);
      setPlayers(session.players?.length ? session.players : defaultPlayers(18));
      skipNextTeeReset.current = true;
    } else {
      setPlayers(defaultPlayers(18));
    }
    setSessionHydrated(true);
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedCourse(null);
      return;
    }
    void fetchScorecard(selectedCourseId);
  }, [selectedCourseId]);

  const persistEverything = useCallback(
    (opts: {
      course: CourseScorecard;
      teeId: string;
      players: ScorecardPlayer[];
      roundId: string | null;
      inProgress?: boolean;
    }) => {
      const { course, teeId, roundId } = opts;
      const tee = course.tees.find((t) => t.teeId === teeId);
      const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
      const padded = padPlayerScores(opts.players, course.holes.length);
      const primary = padded[0]!;
      const { totalStrokes, netToPar } = computeRoundTotals(primary.holeScoresStrokes, totalPar);
      const holesEntered = Math.max(...padded.map((p) => countEnteredHoles(p.holeScoresStrokes)), 0);
      const inProgress = opts.inProgress ?? !allPlayersComplete(padded, course.holes.length);

      saveScorecardSession({
        courseId: course.courseId,
        teeId,
        activeRoundId: roundId,
        players: padded,
      });

      if (!anyScoresEntered(padded) && !roundId) {
        setSaveHint("Add players and enter scores — they save automatically.");
        return roundId;
      }

      const id = upsertRoundLocal({
        id: roundId,
        courseId: course.courseId,
        courseName: course.name,
        city: course.city,
        state: course.state,
        country: course.country,
        teeId,
        teeName: tee?.name ?? teeId,
        holeScoresStrokes: primary.holeScoresStrokes,
        players: padded,
        totalPar,
        totalStrokes,
        netToPar,
        inProgress,
      });

      if (id) {
        setActiveRoundId(id);
        saveScorecardSession({
          courseId: course.courseId,
          teeId,
          activeRoundId: id,
          players: padded,
        });
        setSavedRounds(sortRoundsNewestFirst(loadRoundsLocal()));
        setSaveHint(
          inProgress
            ? `Autosaved (${holesEntered}/${course.holes.length} holes · ${padded.length} player${
                padded.length === 1 ? "" : "s"
              })`
            : "Round saved",
        );
      }
      return id;
    },
    [],
  );

  const schedulePersist = useCallback(
    (
      course: CourseScorecard,
      teeId: string,
      nextPlayers: ScorecardPlayer[],
      roundId: string | null,
    ) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        persistEverything({ course, teeId, players: nextPlayers, roundId });
      }, 250);
    },
    [persistEverything],
  );

  useEffect(() => {
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, []);

  async function fetchKnownCourses() {
    try {
      const res = await fetch("/api/scorecard/courses", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load course list");
      const json = (await res.json()) as CoursesResponse;
      setKnownCourses(json.courses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load courses");
    }
  }

  function applyPlayersFromRound(course: CourseScorecard, round: SavedRound) {
    return playersFromRound(
      round.holeScoresStrokes,
      round.players,
      course.holes.length,
    );
  }

  async function fetchScorecard(courseId: string) {
    setLoadingScorecard(true);
    setError(null);
    try {
      const res = await fetch(`/api/scorecard/${courseId}`, { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Scorecard unavailable for that course");
      }
      const json = (await res.json()) as { course: CourseScorecard };
      const course = json.course;
      setSelectedCourse(course);

      const session = loadScorecardSession(course.holes.length);
      const sameCourse = session?.courseId === course.courseId;
      const teeFromSession =
        sameCourse && course.tees.some((t) => t.teeId === session.teeId)
          ? session.teeId
          : null;

      if ((skipNextTeeReset.current || sameCourse) && teeFromSession && session) {
        setSelectedTeeId(teeFromSession);
        setPlayers(padPlayerScores(session.players, course.holes.length));
        setActiveRoundId(session.activeRoundId);
        skipNextTeeReset.current = false;
      } else {
        const teeId = course.tees[0]?.teeId ?? "";
        setSelectedTeeId(teeId);
        const rounds = loadRoundsLocal();
        const latest = sortRoundsNewestFirst(rounds).find(
          (r) => r.courseId === course.courseId && r.teeId === teeId && r.inProgress !== false,
        );
        if (latest) {
          setPlayers(applyPlayersFromRound(course, latest));
          setActiveRoundId(latest.id);
        } else {
          setPlayers(defaultPlayers(course.holes.length));
          setActiveRoundId(null);
        }
      }
    } catch (e) {
      setSelectedCourse(null);
      setError(e instanceof Error ? e.message : "Failed to load scorecard");
    } finally {
      setLoadingScorecard(false);
    }
  }

  function onTeeChange(teeId: string) {
    if (!selectedCourse) return;
    setSelectedTeeId(teeId);
    const rounds = loadRoundsLocal();
    const latest = sortRoundsNewestFirst(rounds).find(
      (r) => r.courseId === selectedCourse.courseId && r.teeId === teeId,
    );
    let nextPlayers = defaultPlayers(selectedCourse.holes.length);
    let roundId: string | null = null;
    if (latest) {
      nextPlayers = applyPlayersFromRound(selectedCourse, latest);
      roundId = latest.id;
    }
    setPlayers(nextPlayers);
    setActiveRoundId(roundId);
    schedulePersist(selectedCourse, teeId, nextPlayers, roundId);
  }

  function onHoleScoreChange(playerId: string, holeNumber: number, strokes: number | null) {
    if (!selectedCourse || !selectedTeeId) return;
    setPlayers((prev) => {
      const next = padPlayerScores(prev, selectedCourse.holes.length).map((p) => {
        if (p.id !== playerId) return p;
        const scores = [...p.holeScoresStrokes];
        scores[holeNumber - 1] = strokes;
        return { ...p, holeScoresStrokes: scores };
      });
      schedulePersist(selectedCourse, selectedTeeId, next, activeRoundIdRef.current);
      return next;
    });
    setError(null);
  }

  function onAddPlayer() {
    if (!selectedCourse || !selectedTeeId) return;
    if (players.length >= MAX_SCORECARD_PLAYERS) return;
    const next = [
      ...padPlayerScores(players, selectedCourse.holes.length),
      createPlayer(`Player ${players.length + 1}`, selectedCourse.holes.length),
    ];
    setPlayers(next);
    schedulePersist(selectedCourse, selectedTeeId, next, activeRoundId);
  }

  function onRenamePlayer(playerId: string, name: string) {
    if (!selectedCourse || !selectedTeeId) return;
    const next = players.map((p) => (p.id === playerId ? { ...p, name } : p));
    setPlayers(next);
    schedulePersist(selectedCourse, selectedTeeId, next, activeRoundId);
  }

  function onRemovePlayer(playerId: string) {
    if (!selectedCourse || !selectedTeeId) return;
    if (players.length <= 1) return;
    const next = players.filter((p) => p.id !== playerId);
    setPlayers(next);
    schedulePersist(selectedCourse, selectedTeeId, next, activeRoundId);
  }

  function startNewRound() {
    if (!selectedCourse || !selectedTeeId) return;
    const names = players.map((p) => p.name);
    const next =
      names.length > 0
        ? names.map((name) => createPlayer(name, selectedCourse.holes.length))
        : defaultPlayers(selectedCourse.holes.length);
    setPlayers(next);
    setActiveRoundId(null);
    setError(null);
    setSaveHint("New round started — scores autosave as you enter them.");
    saveScorecardSession({
      courseId: selectedCourse.courseId,
      teeId: selectedTeeId,
      activeRoundId: null,
      players: next,
    });
  }

  function finalizeRound() {
    if (!selectedCourse || !selectedTeeId) return;
    const padded = padPlayerScores(players, selectedCourse.holes.length);
    if (!allPlayersComplete(padded, selectedCourse.holes.length)) {
      setError("Enter strokes for every hole for every player before marking complete.");
      return;
    }
    persistEverything({
      course: selectedCourse,
      teeId: selectedTeeId,
      players: padded,
      roundId: activeRoundId,
      inProgress: false,
    });
    setError(null);
  }

  function requestLocationAndNearby() {
    if (!navigator.geolocation) {
      setGeoStatus("unsupported");
      return;
    }

    setGeoStatus("locating");
    setLoadingNearby(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGeoStatus("granted");
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const res = await fetch(
            `/api/scorecard/nearby?lat=${lat}&lng=${lng}&radiusMiles=15&limit=8`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error("Could not fetch nearby courses");
          const json = (await res.json()) as NearbyResponse;
          setNearbyCourses(json.courses);
          setNearbySource(json.source ?? null);
          setNearbyWarning(json.warning ?? null);
          const firstKnown = json.courses.find((c) => c.hasScorecard);
          if (firstKnown && !selectedCourseId) {
            setSelectedCourseId(firstKnown.courseId);
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Nearby lookup failed");
        } finally {
          setLoadingNearby(false);
        }
      },
      () => {
        setGeoStatus("denied");
        setLoadingNearby(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 45000 },
    );
  }

  const suggestedWithScorecards = useMemo(
    () => nearbyCourses.filter((c) => c.hasScorecard),
    [nearbyCourses],
  );

  const courseRounds = useMemo(() => {
    if (!selectedCourse || !selectedTeeId) return [];
    return savedRounds
      .filter((r) => r.courseId === selectedCourse.courseId && r.teeId === selectedTeeId)
      .slice(0, 8);
  }, [savedRounds, selectedCourse, selectedTeeId]);

  if (!sessionHydrated) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--text-secondary)]">
        Loading scorecard…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--water">
          <p className="page-hero-eyebrow">Digital</p>
          <h1 className="font-display page-hero-title">Scorecard</h1>
          <p className="page-hero-lede max-w-md">
            Track a group round hole-by-hole. Course, players, and scores autosave on this device
            when you navigate away.
          </p>
        </div>
      </div>

      <section className="card">
        <h2 className="section-heading">Location</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          We use your location to suggest nearby courses. You can always choose manually.
        </p>
        <button
          type="button"
          onClick={requestLocationAndNearby}
          disabled={loadingNearby || geoStatus === "locating"}
          className="btn-primary mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl px-5 py-3 text-sm"
        >
          {loadingNearby || geoStatus === "locating" ? "Locating..." : "Find nearby courses"}
        </button>

        {geoStatus === "denied" && (
          <p className="mt-3 text-sm text-[var(--warn)]">
            Location permission denied. Use manual course selection below.
          </p>
        )}
        {geoStatus === "unsupported" && (
          <p className="mt-3 text-sm text-[var(--warn)]">
            Geolocation is not supported on this device/browser.
          </p>
        )}
      </section>

      {!!nearbyCourses.length && (
        <section className="card">
          <h2 className="section-heading">Nearby suggestions</h2>
          {nearbySource === "seed-fallback" && (
            <p className="mb-3 text-xs text-[var(--warn)]">
              Live nearby search is temporarily unavailable. Showing seeded courses sorted by your
              location distance.
            </p>
          )}
          {nearbyWarning && (
            <p className="mb-3 text-xs text-[var(--section-label)]">Source note: {nearbyWarning}</p>
          )}
          <div className="mt-2 space-y-3">
            {nearbyCourses.map((course) => (
              <button
                key={`${course.source}-${course.courseId}-${course.name}`}
                type="button"
                onClick={() =>
                  course.hasScorecard
                    ? setSelectedCourseId(course.courseId)
                    : setError(
                        "Scorecard not available yet for this course. Pick a known course below.",
                      )
                }
                className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-[var(--accent)]/35"
              >
                <p className="font-semibold text-[var(--text)]">{course.name}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {(course.city || "Unknown city") + (course.state ? `, ${course.state}` : "")} •{" "}
                  {course.distanceMiles.toFixed(1)} mi
                  {course.hasScorecard ? " • scorecard ready" : " • no local scorecard yet"}
                </p>
              </button>
            ))}
          </div>

          {!!suggestedWithScorecards.length && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              Are you at <strong>{suggestedWithScorecards[0].name}</strong>? Tap it to load the
              scorecard instantly.
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2 className="section-heading">Manual course pick</h2>
        <label className="block text-sm font-medium text-[var(--text)]">
          Choose a known course
          <select
            className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-[var(--text)]"
            value={selectedCourseId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedCourseId(id);
              if (!id) {
                clearScorecardSession();
                setSelectedCourse(null);
                setPlayers(defaultPlayers(18));
                setActiveRoundId(null);
              }
            }}
          >
            <option value="">Select course...</option>
            {knownCourses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.name} ({course.city}, {course.state})
              </option>
            ))}
          </select>
        </label>
        {saveHint ? (
          <p className="mt-3 text-xs text-[var(--good)]">{saveHint}</p>
        ) : (
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            Hole scores and players autosave on this device.
          </p>
        )}
      </section>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      {loadingScorecard && (
        <p className="text-sm text-[var(--text-secondary)]">Loading scorecard...</p>
      )}

      {selectedCourse && !loadingScorecard && (
        <ScorecardPlayersPanel
          players={players}
          onAddPlayer={onAddPlayer}
          onRenamePlayer={onRenamePlayer}
          onRemovePlayer={onRemovePlayer}
        />
      )}

      {selectedCourse && !loadingScorecard && players.length > 0 && (
        <ScorecardTable
          course={selectedCourse}
          teeId={selectedTeeId}
          onTeeChange={onTeeChange}
          players={players}
          onHoleScoresStrokesChange={onHoleScoreChange}
        />
      )}

      {selectedCourse && !loadingScorecard && <CaddyModePanel course={selectedCourse} />}

      {selectedCourse && !loadingScorecard && (
        <div className="card">
          <h2 className="section-heading">Round</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Your current card (including all players) is kept when you leave this page. Mark
            complete when every hole is filled for every player, or start a fresh card anytime.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={finalizeRound}
              className="btn-primary rounded-2xl px-6 py-4 text-sm font-bold"
            >
              Mark round complete
            </button>
            <button
              type="button"
              onClick={startNewRound}
              className="rounded-2xl border border-black/[0.12] bg-white px-6 py-4 text-sm font-semibold text-[var(--text)]"
            >
              Start new round
            </button>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="card">
          <h2 className="section-heading">Previous rounds</h2>
          {courseRounds.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              No rounds saved yet for this course and tee.
            </p>
          ) : (
            <div className="mt-2 space-y-3">
              {courseRounds.map((r) => {
                const scoreLabel = r.netToPar <= 0 ? `${r.netToPar}` : `+${r.netToPar}`;
                const playerCount = r.players?.length ?? 1;
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      const next = applyPlayersFromRound(selectedCourse, r);
                      setActiveRoundId(r.id);
                      setPlayers(next);
                      setError(null);
                      schedulePersist(selectedCourse, selectedTeeId, next, r.id);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      activeRoundId === r.id
                        ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                        : "border-black/[0.08] bg-white hover:border-[var(--accent)]/35"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--text)]">
                          {formatDateShort(r.updatedAtISO ?? r.createdAtISO)}
                          {r.inProgress !== false &&
                          r.holeScoresStrokes.some((v) => v == null) ? (
                            <span className="ml-2 text-xs font-semibold text-[var(--warn)]">
                              In progress
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {r.teeName}
                          {playerCount > 1 ? ` · ${playerCount} players` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--text)]">
                          {r.totalStrokes} / {r.totalPar}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                          {scoreLabel} to par
                          {playerCount > 1 ? " (You)" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
