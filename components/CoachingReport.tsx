"use client";

import type { CoachingApiResponse } from "@/types/swing";

type Props = { data: CoachingApiResponse };

export function CoachingReport({ data }: Props) {
  const { report, summary, drills } = data;
  const fixes = report?.criticalFixes ?? [];
  const secondary = report?.secondaryAdjustments ?? [];
  const positives = report?.positives ?? [];
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="section-heading">Overview</h3>
        <p className="font-display text-2xl text-[var(--text)]">Coaching report</p>
        <p className="mt-3 leading-relaxed text-[var(--text-secondary)]">{summary ?? ""}</p>
      </div>

      <div className="card border-[var(--accent)]/25 ring-1 ring-[var(--accent)]/15">
        <h4 className="section-heading">Priorities</h4>
        <p className="font-display text-lg text-[var(--accent)]">Top fixes</p>
        <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm text-[var(--text)]">
          {fixes.map((c, i) => (
            <li key={i} className="leading-relaxed">
              <strong>{c.issue}</strong>
              <p className="mt-1 text-[var(--text-secondary)]">{c.whyItMatters}</p>
              <p className="mt-2 text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--accent)]">Drill:</span> {c.drill}
              </p>
              {c.launchDataNote && (
                <p className="mt-2 text-xs italic text-[var(--text-secondary)]">{c.launchDataNote}</p>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <h4 className="section-heading">Fine-tuning</h4>
        <p className="font-display text-lg text-[var(--text)]">Secondary</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
          {secondary.map((s, i) => (
            <li key={i}>
              <span className="font-medium text-[var(--text)]">{s.issue}</span> — {s.suggestion}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h4 className="section-heading">Strengths</h4>
        <p className="font-display text-lg text-[var(--text)]">What&apos;s working</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--good)]">
          {positives.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-display text-[var(--text)]">Lesson focus:</span>{" "}
          {report?.lessonFocusSummary ?? ""}
        </p>
      </div>

      <div className="card">
        <h4 className="section-heading">Practice</h4>
        <p className="font-display text-lg text-[var(--text)]">Drills</p>
        <ul className="mt-4 space-y-4">
          {(drills ?? []).map((d, i) => (
            <li key={i} className="border-b border-black/[0.06] pb-4 last:border-0">
              <p className="font-semibold text-[var(--accent)]">{d.title}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{d.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
