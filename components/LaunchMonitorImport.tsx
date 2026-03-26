"use client";

import { useState } from "react";
import { parseLaunchMonitorCsv } from "@/lib/csvImport";
import type { LaunchMonitorShot } from "@/types/swing";

type Props = {
  onData: (shots: LaunchMonitorShot[], deviceLabel: string) => void;
};

export function LaunchMonitorImport({ onData }: Props) {
  const [name, setName] = useState<string | null>(null);

  return (
    <div className="card">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--section-label)]">
        Optional
      </p>
      <p className="font-display mt-1 text-xl text-[var(--text)]">Launch monitor</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        TrackMan, Garmin R10, or Rapsodo CSV — format is auto-detected.
      </p>
      <label className="mt-5 inline-block">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setName(f.name);
            const reader = new FileReader();
            reader.onload = () => {
              const text = String(reader.result ?? "");
              const { device, shots } = parseLaunchMonitorCsv(text);
              const label =
                device === "unknown"
                  ? "Unknown format (best-effort parse)"
                  : device.charAt(0).toUpperCase() + device.slice(1);
              onData(shots, label);
            };
            reader.readAsText(f);
          }}
        />
        <span className="cursor-pointer text-sm font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4 hover:decoration-[var(--accent)]">
          Import session CSV
        </span>
      </label>
      {name && <p className="mt-3 text-xs text-[var(--text-secondary)]">Loaded: {name}</p>}
    </div>
  );
}
