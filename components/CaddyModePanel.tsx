"use client";

import { useEffect, useMemo, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { getClubAverages } from "@/lib/clubAverages/storage";
import { recommendClubFromDistance } from "@/lib/caddy/recommend";
import type { CourseScorecard } from "@/types/scorecard";

type Props = {
  course: CourseScorecard;
};

export function CaddyModePanel({ course }: Props) {
  const [open, setOpen] = useState(false);
  const [holeNumber, setHoleNumber] = useState(1);
  const [distanceYards, setDistanceYards] = useState(course.holes[0]?.yardage ?? 150);
  const [averagesTick, setAveragesTick] = useState(0);

  const hole = course.holes.find((h) => h.holeNumber === holeNumber) ?? course.holes[0];

  const teeYardage = hole?.yardage ?? 150;

  useEffect(() => {
    setDistanceYards(teeYardage);
  }, [course.courseId, holeNumber, teeYardage]);

  useEffect(() => {
    if (!open) return;
    setAveragesTick((t) => t + 1);
  }, [open]);

  const recommendation = useMemo(() => {
    void averagesTick;
    return recommendClubFromDistance(distanceYards, getClubAverages());
  }, [distanceYards, averagesTick]);

  if (!hole) return null;

  return (
    <div className="card overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-[var(--pill-track)]/40"
        aria-expanded={open}
      >
        <div>
          <p className="section-heading !mb-0">Caddy mode</p>
          <p className="font-display mt-1 text-xl text-[var(--text)]">
            {open ? "Club for the number" : "Tap to expand club advice"}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)] transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="space-y-5 border-t border-black/[0.06] px-6 py-5">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            Distance defaults to this hole&apos;s scorecard yardage to green center from the tee.
            Adjust the number after you&apos;ve played (approach remaining).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[var(--section-label)]">
              Hole
              <select
                className="mt-1 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)]"
                value={holeNumber}
                onChange={(e) => setHoleNumber(Number(e.target.value))}
              >
                {course.holes.map((h) => (
                  <option key={h.holeNumber} value={h.holeNumber}>
                    {h.holeNumber} · Par {h.par} · {h.yardage} yd
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-[var(--section-label)]">
              Yards to green (center)
              <input
                type="number"
                min={1}
                max={600}
                step={1}
                className="mt-1 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)]"
                value={distanceYards}
                onChange={(e) => setDistanceYards(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-xs font-semibold text-[var(--text)]"
              onClick={() => setDistanceYards(hole.yardage)}
            >
              Reset to tee yardage ({hole.yardage})
            </button>
            {([10, 25, 50] as const).map((n) => (
              <button
                key={n}
                type="button"
                className="rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-xs font-semibold text-[var(--text)]"
                onClick={() => setDistanceYards((d) => Math.max(1, d - n))}
              >
                −{n} yd
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--section-label)]">
              Suggested club
            </p>
            {recommendation.primary ? (
              <>
                <p className="font-display mt-2 text-3xl text-[var(--text)]">
                  {recommendation.primary.clubName}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Avg carry ~{Math.round(recommendation.primary.avgCarryYards)} yd · target{" "}
                  {recommendation.targetYards} yd
                  {recommendation.primary.sampleCount
                    ? ` · ${recommendation.primary.sampleCount} shots`
                    : null}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-secondary)]">No suggestion yet.</p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              {recommendation.note}
            </p>
          </div>

          {(recommendation.longer || recommendation.shorter) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendation.longer ? (
                <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--section-label)]">
                    One longer
                  </p>
                  <p className="mt-1 font-semibold text-[var(--text)]">
                    {recommendation.longer.clubName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ~{Math.round(recommendation.longer.avgCarryYards)} yd
                  </p>
                </div>
              ) : null}
              {recommendation.shorter ? (
                <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--section-label)]">
                    One shorter
                  </p>
                  <p className="mt-1 font-semibold text-[var(--text)]">
                    {recommendation.shorter.clubName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    ~{Math.round(recommendation.shorter.avgCarryYards)} yd
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {!recommendation.usedPersonalAverages ? (
            <p className="text-xs leading-relaxed text-[var(--section-label)]">
              Tip:{" "}
              <NavLink href="/club-averages" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                import launch-monitor CSVs
              </NavLink>{" "}
              so Caddy Mode uses your real carry distances.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
