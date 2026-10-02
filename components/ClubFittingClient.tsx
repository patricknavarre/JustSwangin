"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { LaunchMonitorImport } from "@/components/LaunchMonitorImport";
import { ClubFittingReportView } from "@/components/ClubFittingReport";
import { buildClubFittingReport } from "@/lib/clubFitting/recommend";
import { loadAnalysis, saveAnalysis, type StoredAnalysis } from "@/lib/sessionStorage";
import type { LaunchMonitorShot } from "@/types/swing";

export function ClubFittingClient() {
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [ready, setReady] = useState(false);
  const [importLabel, setImportLabel] = useState<string | null>(null);

  useEffect(() => {
    setAnalysis(loadAnalysis());
    setReady(true);
  }, []);

  const report = useMemo(
    () => (analysis ? buildClubFittingReport(analysis) : null),
    [analysis],
  );

  const onLaunchData = useCallback((shots: LaunchMonitorShot[], deviceLabel: string) => {
    const current = loadAnalysis();
    if (!current) return;
    const next: StoredAnalysis = { ...current, launchData: shots };
    saveAnalysis(next);
    setAnalysis(next);
    setImportLabel(`${deviceLabel} · ${shots.length} shots`);
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-[var(--text-secondary)]">
        Loading…
      </div>
    );
  }

  if (!analysis || !report) {
    return (
      <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
        <div className="card overflow-hidden p-0">
          <div className="page-hero page-hero--gold">
            <p className="page-hero-eyebrow">Equipment</p>
            <h1 className="font-display page-hero-title">Club fitting</h1>
            <p className="page-hero-lede max-w-md">
              Spec bands and example models from your Swing Lab session — like a fitting conversation
              starter, not a final build sheet.
            </p>
          </div>
        </div>
        <div className="card text-center">
          <p className="font-display text-2xl text-[var(--text)]">No swing loaded</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Run Swing Lab first (optionally import a launch-monitor CSV), then return here for shaft,
            loft, and head suggestions.
          </p>
          <NavLink
            href="/swing"
            className="btn-primary mt-6 inline-flex min-h-[52px] items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold"
          >
            Go to Swing Lab
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--gold">
          <p className="page-hero-eyebrow">Equipment</p>
          <h1 className="font-display page-hero-title">Club fitting</h1>
          <p className="page-hero-lede max-w-md">
            Recommendations from your latest analysis. Add launch data anytime to unlock flex, loft,
            and head-bias bands.
          </p>
        </div>
      </div>

      <ClubFittingReportView report={report} />

      <section>
        <LaunchMonitorImport onData={onLaunchData} />
        {importLabel ? (
          <p className="mt-2 text-center text-xs text-[var(--text-secondary)]">
            Updated session: {importLabel}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <NavLink
          href="/analyze"
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-black/[0.08] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] shadow-card"
        >
          Back to results
        </NavLink>
        <NavLink
          href="/swing"
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-black/[0.08] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] shadow-card"
        >
          New swing
        </NavLink>
      </div>
    </div>
  );
}
