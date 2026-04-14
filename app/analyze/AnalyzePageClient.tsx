"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SwingPlayer } from "@/components/SwingPlayer";
import { MetricsPanel } from "@/components/MetricsPanel";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { CoachingReport } from "@/components/CoachingReport";
import { loadAnalysis, type StoredAnalysis } from "@/lib/sessionStorage";
import { GOLF_SHOT_LABELS, type CoachingApiResponse, type GolfShotType } from "@/types/swing";

export function AnalyzePageClient() {
  const [data, setData] = useState<StoredAnalysis | null>(null);
  const [coaching, setCoaching] = useState<CoachingApiResponse | null>(null);
  const [coachingError, setCoachingError] = useState<string | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);

  useEffect(() => {
    const s = loadAnalysis();
    setData(s);
    if (!s) {
      setLoadingCoach(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const golfShotType: GolfShotType = s.golfShotType ?? "driver";
        const res = await fetch("/api/coaching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metrics: s.metrics,
            cameraAngle: s.cameraAngle,
            launchData: s.launchData,
            golfShotType,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as {
            error?: string;
            detail?: string;
          };
          const parts = [err.error, err.detail].filter(Boolean);
          throw new Error(parts.length ? parts.join(" — ") : res.statusText);
        }
        const json = (await res.json()) as CoachingApiResponse;
        if (!cancelled) setCoaching(json);
      } catch (e) {
        if (!cancelled)
          setCoachingError(e instanceof Error ? e.message : "Coaching unavailable.");
      } finally {
        if (!cancelled) setLoadingCoach(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display text-2xl text-[var(--text)]">No swing loaded</p>
        <p className="mt-3 text-[var(--text-secondary)]">
          Upload a video from the home page to see analysis.
        </p>
        <Link
          href="/"
          className="btn-primary mt-8 inline-block rounded-2xl px-8 py-3 text-sm font-bold"
        >
          Return home
        </Link>
      </div>
    );
  }

  const durationMs =
    data.frames.length > 0
      ? data.frames[data.frames.length - 1].t - data.frames[0].t
      : 0;

  const resolvedShot: GolfShotType = data.golfShotType ?? "driver";

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-heading mb-0">Session</p>
          <h1 className="font-display text-3xl text-[var(--text)]">Your swing</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {data.cameraAngle === "face-on" ? "Face-on" : "Down-the-line"}
            {" · "}
            Scored as {GOLF_SHOT_LABELS[resolvedShot]}
          </p>
        </div>
        <Link
          href="/swing"
          className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-white px-5 py-2.5 text-center text-base font-semibold text-[var(--text)] shadow-card transition active:opacity-80 sm:text-sm"
        >
          New analysis
        </Link>
      </div>

      <SwingPlayer videoUrl={data.videoUrl} frames={data.frames} metrics={data.metrics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MetricsPanel metrics={data.metrics} />
        <PhaseTimeline phases={data.phases} durationMs={durationMs} />
      </div>

      <section>
        <p className="mb-4 text-center text-xs text-[var(--text-secondary)]">
          Metrics and video overlay run on your device. The section below calls Anthropic only for the
          written coaching report.
        </p>
        {loadingCoach && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Calling Claude with your metrics…
          </p>
        )}
        {coachingError && (
          <div className="card border-[var(--warn)]/35 bg-[#faf6ec] text-sm text-[var(--deep-pine)]">
            <p className="font-semibold">Coaching report unavailable</p>
            <p className="mt-2 whitespace-pre-wrap text-[var(--text)]">{coachingError}</p>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Your swing numbers above did not use this API — only the coaching text does. If the error
              mentions the model, set{" "}
              <code className="rounded bg-[var(--pill-track)] px-1 font-mono">ANTHROPIC_MODEL</code> in{" "}
              <code className="rounded bg-[var(--pill-track)] px-1 font-mono">.env.local</code> (see
              Anthropic&apos;s current model list), then restart{" "}
              <code className="rounded bg-[var(--pill-track)] px-1 font-mono">npm run dev</code>.
            </p>
          </div>
        )}
        {coaching && !loadingCoach && <CoachingReport data={coaching} />}
      </section>

      <footer className="border-t border-black/[0.06] pt-8 text-center text-[11px] leading-relaxed text-[var(--section-label)]">
        Pose is processed in your browser. Cloud uploads follow your provider&apos;s policy.
        JustSwangin only sends metrics (and optional launch data) to the AI coach for your report.
      </footer>
    </div>
  );
}
