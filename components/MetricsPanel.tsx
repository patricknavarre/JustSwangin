"use client";

import type { SwingMetrics } from "@/types/swing";

type Props = { metrics: SwingMetrics };

export function MetricsPanel({ metrics }: Props) {
  return (
    <div className="card">
      <h3 className="section-heading">Biomechanics</h3>
      <p className="font-display text-xl text-[var(--text)]">Metrics</p>
      <ul className="mt-4 space-y-3 text-sm">
        {metrics.deviations.map((d) => (
          <li
            key={d.name}
            className="flex items-start justify-between gap-4 border-b border-black/[0.06] pb-3 last:border-0"
          >
            <span className="text-[var(--text-secondary)]">{d.name}</span>
            <span className="shrink-0 text-right font-semibold tabular-nums text-[var(--text)]">
              {d.value.toFixed(1)}
              {d.unit}
              <span
                className={`ml-2 text-[10px] font-bold uppercase tracking-wide ${
                  d.status === "good"
                    ? "text-[var(--good)]"
                    : d.status === "borderline"
                      ? "text-[var(--warn)]"
                      : "text-[var(--bad)]"
                }`}
              >
                {d.status === "good"
                  ? "On track"
                  : d.status === "borderline"
                    ? "Borderline"
                    : "Focus"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
