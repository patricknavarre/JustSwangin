"use client";

import { useEffect, useMemo, useState } from "react";
import { ScorecardTable } from "@/components/ScorecardTable";
import type {
  CourseScorecard,
  NearbyCourseSuggestion,
  ScorecardCourseSummary,
} from "@/types/scorecard";
import type { SavedRound } from "@/types/round";
import {
  loadRoundsLocal,
  saveRoundLocal,
  sortRoundsNewestFirst,
  formatDateShort,
} from "@/lib/rounds/storage";

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
  const [holeScoresStrokes, setHoleScoresStrokes] = useState<Array<number | null>>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingScorecard, setLoadingScorecard] = useState(false);
  const [nearbySource, setNearbySource] = useState<string | null>(null);
  const [nearbyWarning, setNearbyWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<
    "idle" | "locating" | "granted" | "denied" | "unsupported"
  >("idle");
  const [savingRound, setSavingRound] = useState(false);

  useEffect(() => {
    void fetchKnownCourses();
  }, []);

  useEffect(() => {
    try {
      const loaded = sortRoundsNewestFirst(loadRoundsLocal());
      setSavedRounds(loaded);
    } catch {
      // localStorage can fail in private browsing modes
      setSavedRounds([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedCourse(null);
      return;
    }
    void fetchScorecard(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (!selectedCourse || !selectedTeeId) return;

    const latestForCourseTee = savedRounds.find(
      (r) => r.courseId === selectedCourse.courseId && r.teeId === selectedTeeId,
    );

    if (!latestForCourseTee) {
      setActiveRoundId(null);
      setHoleScoresStrokes(new Array(selectedCourse.holes.length).fill(null));
      return;
    }

    const next = new Array(selectedCourse.holes.length).fill(null) as Array<
      number | null
    >;
    for (const hole of selectedCourse.holes) {
      const idx = hole.holeNumber - 1;
      const v = latestForCourseTee.holeScoresStrokes[idx];
      if (typeof v === "number" && Number.isFinite(v)) next[idx] = v;
    }
    setActiveRoundId(latestForCourseTee.id);
    setHoleScoresStrokes(next);
  }, [selectedCourse, selectedTeeId, savedRounds]);

  const suggestedWithScorecards = useMemo(
    () => nearbyCourses.filter((c) => c.hasScorecard),
    [nearbyCourses],
  );

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
      setSelectedCourse(json.course);
      setSelectedTeeId(json.course.tees[0]?.teeId ?? "");
    } catch (e) {
      setSelectedCourse(null);
      setError(e instanceof Error ? e.message : "Failed to load scorecard");
    } finally {
      setLoadingScorecard(false);
    }
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
          if (firstKnown) {
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

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-emerald-300 via-green-500 to-emerald-900 px-6 py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90">
            Digital
          </p>
          <h1 className="font-display mt-1 text-3xl text-white sm:text-4xl">Scorecard</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90">
            Find nearby courses from your location and load a hole-by-hole scorecard with par and
            yardage. Includes a full NJ / PA directory (Westfield-area public tracks) with
            scorecard data from the course guide — confirm yardages with the pro shop when in doubt.
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
                  course.hasScorecard ? setSelectedCourseId(course.courseId) : setError("Scorecard not available yet for this course. Pick a known course below.")
                }
                className="w-full rounded-xl border border-black/[0.08] bg-white px-4 py-3 text-left transition hover:border-[var(--accent)]/35"
              >
                <p className="font-semibold text-[var(--text)]">{course.name}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {(course.city || "Unknown city") + (course.state ? `, ${course.state}` : "")} • {course.distanceMiles.toFixed(1)} mi
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
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select course...</option>
            {knownCourses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.name} ({course.city}, {course.state})
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      {loadingScorecard && <p className="text-sm text-[var(--text-secondary)]">Loading scorecard...</p>}

      {selectedCourse && !loadingScorecard && (
        <ScorecardTable
          course={selectedCourse}
          teeId={selectedTeeId}
          onTeeChange={setSelectedTeeId}
          holeScoresStrokes={holeScoresStrokes}
          onHoleScoresStrokesChange={(holeNumber, strokes) => {
            setHoleScoresStrokes((prev) => {
              const next = [...prev];
              next[holeNumber - 1] = strokes;
              return next;
            });
            setActiveRoundId(null); // editing implies a new save action
          }}
        />
      )}

      {selectedCourse && !loadingScorecard && (
        <div className="card">
          <h2 className="section-heading">Round</h2>
          <div className="mt-2 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (!selectedCourse) return;
                if (!selectedTeeId) return;

                const filled =
                  holeScoresStrokes.length === selectedCourse.holes.length &&
                  holeScoresStrokes.every(
                    (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
                  );
                if (!filled) {
                  setError("Please enter strokes for every hole before saving.");
                  return;
                }

                const totalPar = selectedCourse.holes.reduce((sum, h) => sum + h.par, 0);
                const totalStrokes = holeScoresStrokes.reduce<number>(
                  (sum, v) => sum + (typeof v === "number" ? v : 0),
                  0,
                );
                const netToPar = totalStrokes - totalPar;
                const tee = selectedCourse.tees.find((t) => t.teeId === selectedTeeId);

                setSavingRound(true);
                try {
                  const id = saveRoundLocal({
                    courseId: selectedCourse.courseId,
                    courseName: selectedCourse.name,
                    city: selectedCourse.city,
                    state: selectedCourse.state,
                    country: selectedCourse.country,
                    teeId: selectedTeeId,
                    teeName: tee?.name ?? selectedTeeId,
                    holeScoresStrokes: holeScoresStrokes as number[],
                    totalPar,
                    totalStrokes,
                    netToPar,
                  });

                  const updated = sortRoundsNewestFirst(loadRoundsLocal());
                  setSavedRounds(updated);
                  setActiveRoundId(id);
                  setError(null);
                } finally {
                  setSavingRound(false);
                }
              }}
              disabled={savingRound}
              className="btn-primary rounded-2xl px-6 py-4 text-sm font-bold"
            >
              {savingRound ? "Saving..." : "Save round"}
            </button>

            {!!activeRoundId && (
              <button
                type="button"
                onClick={() => {
                  setActiveRoundId(null);
                  setHoleScoresStrokes(
                    new Array(selectedCourse.holes.length).fill(null),
                  );
                  setError(null);
                }}
                className="rounded-2xl border border-black/[0.12] bg-white px-6 py-4 text-sm font-semibold text-[var(--text)]"
              >
                Start new round
              </button>
            )}
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="card">
          <h2 className="section-heading">Previous rounds</h2>
          {savedRounds.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">No rounds saved yet on this device.</p>
          ) : (
            <div className="mt-2 space-y-3">
              {savedRounds
                .filter((r) => r.courseId === selectedCourse.courseId && r.teeId === selectedTeeId)
                .slice(0, 6)
                .map((r) => {
                  const scoreLabel =
                    r.netToPar <= 0 ? `${r.netToPar}` : `+${r.netToPar}`;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => {
                        const next = new Array(selectedCourse.holes.length).fill(null) as Array<
                          number | null
                        >;
                        for (const hole of selectedCourse.holes) {
                          const idx = hole.holeNumber - 1;
                          const v = r.holeScoresStrokes[idx];
                          if (typeof v === "number" && Number.isFinite(v)) next[idx] = v;
                        }
                        setActiveRoundId(r.id);
                        setHoleScoresStrokes(next);
                        setError(null);
                      }}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        activeRoundId === r.id
                          ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]"
                          : "border-black/[0.08] bg-white hover:border-[var(--accent)]/35"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--text)]">{formatDateShort(r.createdAtISO)}</p>
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
