"use client";

import type { SwingPhase } from "@/types/swing";

const LABELS: Record<string, string> = {
  address: "Address",
  takeaway: "Takeaway",
  top: "Top",
  downswing: "Downswing",
  impact: "Impact",
  followThrough: "Follow-through",
};

type Props = { phases: SwingPhase[]; durationMs: number };

export function PhaseTimeline({ phases, durationMs }: Props) {
  const total = Math.max(durationMs, 1);
  return (
    <div className="card">
      <h3 className="section-heading">Timeline</h3>
      <p className="font-display text-xl text-[var(--text)]">Phases</p>
      <div className="mt-4 flex h-11 w-full overflow-hidden rounded-xl bg-[var(--pill-track)] p-0.5">
        {phases.map((p) => {
          const w = ((p.endMs - p.startMs) / total) * 100;
          return (
            <div
              key={p.name}
              title={LABELS[p.name] ?? p.name}
              className="flex items-center justify-center border-r border-black/[0.04] text-[9px] font-semibold text-[var(--text-secondary)] last:border-r-0"
              style={{
                width: `${Math.max(w, 4)}%`,
                background:
                  p.name === "impact"
                    ? "linear-gradient(180deg, rgba(255,90,31,0.2), rgba(255,90,31,0.08))"
                    : "transparent",
              }}
            >
              <span className="truncate px-0.5">{LABELS[p.name] ?? p.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
