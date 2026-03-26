"use client";

import { useMemo, useState } from "react";
import { LaunchMonitorImport } from "@/components/LaunchMonitorImport";
import { getClubAverages, saveClubAverages, mergeClubAveragesFromShots } from "@/lib/clubAverages/storage";
import type { LaunchMonitorShot } from "@/types/swing";

type Totals = {
  count: number;
  avgCarryYards: number;
  maxCarryYards: number;
  dispersionYards: number; // std dev
  minCarryYards: number;
};

export function ClubAveragesClient() {
  const [clubs, setClubs] = useState(() => getClubAverages());
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const totalsByClub = useMemo(() => {
    const out: Record<string, Totals> = {};
    for (const [clubName, s] of Object.entries(clubs)) {
      const count = s.count;
      const avgCarryYards = count ? s.sum / count : 0;
      const variance = count ? s.sumSq / count - avgCarryYards * avgCarryYards : 0;
      const dispersionYards = Math.sqrt(Math.max(0, variance));
      out[clubName] = {
        count,
        avgCarryYards,
        maxCarryYards: s.max,
        minCarryYards: s.min,
        dispersionYards,
      };
    }
    return out;
  }, [clubs]);

  const sortedClubs = useMemo(() => {
    return Object.entries(totalsByClub)
      .map(([clubName, t]) => ({ clubName, ...t }))
      .sort((a, b) => b.avgCarryYards - a.avgCarryYards);
  }, [totalsByClub]);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-sky-200 via-cyan-500 to-blue-900 px-6 py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90">
            Club Distances
          </p>
          <h1 className="font-display mt-1 text-3xl text-white sm:text-4xl">Club Averages</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
            Import your TrackMan / Garmin / Rapsodo CSVs to build a personal yardage card from real
            carry data.
          </p>
        </div>
      </div>

      <section className="card">
        <h2 className="section-heading">Import CSV session</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          We group shots by club and persist averages, max carry, and dispersion on this device.
        </p>
        <div className="mt-4">
          <LaunchMonitorImport
            onData={(shots: LaunchMonitorShot[], _deviceLabel: string) => {
              void _deviceLabel;
              setError(null);
              setImporting(true);
              try {
                const merged = mergeClubAveragesFromShots(clubs, shots);
                saveClubAverages(merged);
                setClubs(merged);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Import failed");
              } finally {
                setImporting(false);
              }
            }}
          />
        </div>
        {error && <p className="mt-3 text-sm text-[var(--bad)]">{error}</p>}
        {importing && <p className="mt-3 text-sm text-[var(--text-secondary)]">Processing...</p>}
      </section>

      <section className="card">
        <h2 className="section-heading">Your yardage card</h2>
        {sortedClubs.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Import a CSV to see club averages.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {sortedClubs.map((c) => (
              <div
                key={c.clubName}
                className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-white px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-[var(--text)]">{c.clubName}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {c.count} shots • min {Math.round(c.minCarryYards)}y • max {Math.round(c.maxCarryYards)}y
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl text-[var(--text)]">{Math.round(c.avgCarryYards)}y</p>
                  <p className="mt-1 text-xs text-[var(--accent)]">
                    dispersion {Math.round(c.dispersionYards)}y
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

