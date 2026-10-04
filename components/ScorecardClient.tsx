"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScorecardTable } from "@/components/ScorecardTable";
import { CaddyModePanel } from "@/components/CaddyModePanel";
import type {
  CourseScorecard,
  NearbyCourseSuggestion,
  ScorecardCourseSummary,
} from "@/types/scorecard";
import type { SavedRound } from "@/types/round";
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

type NearbyResponse = {
  courses: NearbyCourseSuggestion[];
  source: string;
  warning?: string;
};

type CoursesResponse = {
  courses: ScorecardCourseSummary[];
};

function emptyScores(holeCount: number): Array<number | null> {
  return new Array(holeCount).fill(null);
}

export function ScorecardClient() {
  const [knownCourses, setKnownCourses] = useState<ScorecardCourseSummary[]>([]);
  const [nearbyCourses, setNearbyCourses] = useState<NearbyCourseSuggestion[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<CourseScorecard | null>(null);
  const [selectedTeeId, setSelectedTeeId] = useState<string>("");
  const [savedRounds, setSavedRounds] = useState<SavedRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [holeScoresStrokes, setHoleScoresStrokes] = useState<Array<number | null>>([]);
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
      setHoleScoresStrokes(session.holeScoresStrokes ?? []);
      skipNextTeeReset.current = true;
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
      scores: Array<number | null>;
      roundId: string | null;
      inProgress?: boolean;
    }) => {
      const { course, teeId, scores, roundId } = opts;
      const tee = course.tees.find((t) => t.teeId === teeId);
      const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
      const padded =
        scores.length === course.holes.length
          ? scores
          : emptyScores(course.holes.length).map((_, i) => scores[i] ?? null);
      const { totalStrokes, netToPar, holesEntered } = computeRoundTotals(padded, totalPar);
      const inProgress =
        opts.inProgress ?? holesEntered < course.holes.length;

      saveScorecardSession({
        courseId: course.courseId,
        teeId,
        activeRoundId: roundId,
        holeScoresStrokes: padded,
      });

      if (holesEntered === 0 && !roundId) {
        setSaveHint("Select a course and enter scores — they save automatically.");
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
        holeScoresStrokes: padded,
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
          holeScoresStrokes: padded,
        });
        setSavedRounds(sortRoundsNewestFirst(loadRoundsLocal()));
        setSaveHint(
          inProgress
            ? `Autosaved (${holesEntered}/${course.holes.length} holes)`
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
      scores: Array<number | null>,
      roundId: string | null,
    ) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        persistEverything({ course, teeId, scores, roundId });
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

      const session = loadScorecardSession();
      const sameCourse = session?.courseId === course.courseId;
      const teeFromSession =
        sameCourse && course.tees.some((t) => t.teeId === session.teeId)
          ? session.teeId
          : null;

      if (skipNextTeeReset.current && teeFromSession) {
        setSelectedTeeId(teeFromSession);
        const scores =
          session!.holeScoresStrokes?.length === course.holes.length
            ? session!.holeScoresStrokes
            : emptyScores(course.holes.length);
        setHoleScoresStrokes(scores);
        setActiveRoundId(session!.activeRoundId);
        skipNextTeeReset.current = false;
      } else if (sameCourse && teeFromSession) {
        setSelectedTeeId(teeFromSession);
        const scores =
          session!.holeScoresStrokes?.length === course.holes.length
            ? session!.holeScoresStrokes
            : emptyScores(course.holes.length);
        setHoleScoresStrokes(scores);
        setActiveRoundId(session!.activeRoundId);
      } else {
        const teeId = course.tees[0]?.teeId ?? "";
        setSelectedTeeId(teeId);
        const rounds = loadRoundsLocal();
        const latest = sortRoundsNewestFirst(rounds).find(
          (r) => r.courseId === course.courseId && r.teeId === teeId && r.inProgress !== false,
        );
        if (latest) {
          const next = emptyScores(course.holes.length);
          for (const hole of course.holes) {
            const idx = hole.holeNumber - 1;
            const v = latest.holeScoresStrokes[idx];
            if (typeof v === "number" && Number.isFinite(v)) next[idx] = v;
          }
          setHoleScoresStrokes(next);
          setActiveRoundId(latest.id);
        } else {
          setHoleScoresStrokes(emptyScores(course.holes.length));
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
    const scores = emptyScores(selectedCourse.holes.length);
    let roundId: string | null = null;
    if (latest) {
      for (const hole of selectedCourse.holes) {
        const idx = hole.holeNumber - 1;
        const v = latest.holeScoresStrokes[idx];
        if (typeof v === "number" && Number.isFinite(v)) scores[idx] = v;
      }
      roundId = latest.id;
    }
    setHoleScoresStrokes(scores);
    setActiveRoundId(roundId);
    schedulePersist(selectedCourse, teeId, scores, roundId);
  }

  function onHoleScoreChange(holeNumber: number, strokes: number | null) {
    if (!selectedCourse || !selectedTeeId) return;
    setHoleScoresStrokes((prev) => {
      const next =
        prev.length === selectedCourse.holes.length
          ? [...prev]
          : emptyScores(selectedCourse.holes.length);
      next[holeNumber - 1] = strokes;
      schedulePersist(selectedCourse, selectedTeeId, next, activeRoundId);
      return next;
    });
    setError(null);
  }

  function startNewRound() {
    if (!selectedCourse || !selectedTeeId) return;
    const scores = emptyScores(selectedCourse.holes.length);
    setHoleScoresStrokes(scores);
    setActiveRoundId(null);
    setError(null);
    setSaveHint("New round started — scores autosave as you enter them.");
    saveScorecardSession({
      courseId: selectedCourse.courseId,
      teeId: selectedTeeId,
      activeRoundId: null,
      holeScoresStrokes: scores,
    });
  }

  function finalizeRound() {
    if (!selectedCourse || !selectedTeeId) return;
    const filled = holeScoresStrokes.every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
    );
    if (!filled) {
      setError("Enter strokes for every hole before marking the round complete.");
      return;
    }
    persistEverything({
      course: selectedCourse,
      teeId: selectedTeeId,
      scores: holeScoresStrokes,
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
            Find nearby courses from your location and load a hole-by-hole scorecard with par and
            yardage. Scores and course selection autosave on this device when you navigate away.
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
                setHoleScoresStrokes([]);
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
            Hole scores autosave on this device as you type.
          </p>
        )}
      </section>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      {loadingScorecard && (
        <p className="text-sm text-[var(--text-secondary)]">Loading scorecard...</p>
      )}

      {selectedCourse && !loadingScorecard && (
        <ScorecardTable
          course={selectedCourse}
          teeId={selectedTeeId}
          onTeeChange={onTeeChange}
          holeScoresStrokes={holeScoresStrokes}
          onHoleScoresStrokesChange={onHoleScoreChange}
        />
      )}

      {selectedCourse && !loadingScorecard && <CaddyModePanel course={selectedCourse} />}

      {selectedCourse && !loadingScorecard && (
        <div className="card">
          <h2 className="section-heading">Round</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Your current card is kept when you leave this page. Mark complete when every hole is
            filled, or start a fresh card anytime.
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
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => {
                      const next = emptyScores(selectedCourse.holes.length);
                      for (const hole of selectedCourse.holes) {
                        const idx = hole.holeNumber - 1;
                        const v = r.holeScoresStrokes[idx];
                        if (typeof v === "number" && Number.isFinite(v)) next[idx] = v;
                      }
                      setActiveRoundId(r.id);
                      setHoleScoresStrokes(next);
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
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{r.teeName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[var(--text)]">
                          {r.totalStrokes} / {r.totalPar}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[var(--accent)]">
                          {scoreLabel} to par
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
