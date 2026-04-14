"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { VideoUploader } from "@/components/VideoUploader";
import { extractPoseFromVideo } from "@/lib/mediapipe";
import { saveAnalysisForKey } from "@/lib/sessionStorage";
import { detectPhases, computeSwingMetrics } from "@/lib/swingMetrics";
import type { CameraAngle } from "@/types/swing";

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_MB ?? "100");
export const BAT_STORAGE_KEY = "justswangin-bat-analysis";

export function BatLabClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [angle, setAngle] = useState<CameraAngle>("face-on");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onAnalyze = useCallback(async () => {
    if (!file) {
      setError("Choose a hitting video first.");
      return;
    }
    setError(null);
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      setStep("Extracting pose from video...");
      const frames = await extractPoseFromVideo(url, 20);
      if (frames.length < 5) {
        throw new Error(
          "Not enough pose data. Try a clearer full-body clip with better lighting.",
        );
      }
      setStep("Computing swing metrics...");
      const phases = detectPhases(frames);
      const metrics = computeSwingMetrics(frames, phases, angle);

      saveAnalysisForKey(BAT_STORAGE_KEY, {
        sport: "baseball-softball",
        cameraAngle: angle,
        videoUrl: url,
        frames,
        metrics,
        phases,
      });

      setStep("Opening bat analysis...");
      router.push("/bat-analyze");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
      setStep(null);
    }
  }, [angle, file, router]);

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="relative hero-water px-6 py-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/90">
            Baseball + Softball
          </p>
          <h1 className="font-display mt-1 text-3xl text-white sm:text-4xl">Bat Lab</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
            Upload your swing clip to map motion timing and get practical hitting coaching.
          </p>
        </div>
      </div>

      <section>
        <h2 className="section-heading">Your swing</h2>
        <VideoUploader maxMb={MAX_MB} file={file} onFile={setFile} disabled={busy} />
      </section>

      <section>
        <h2 className="section-heading">Camera</h2>
        <div className="card py-2">
          <p className="mb-3 px-2 text-sm text-[var(--text-secondary)]">
            Face-on usually works best for hitting clips.
          </p>
          <div className="flex gap-0 rounded-full bg-[var(--pill-track)] p-1.5">
            {(
              [
                { id: "face-on" as const, label: "Face-on" },
                { id: "down-the-line" as const, label: "Down-the-line" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setAngle(opt.id)}
                className={`min-h-[48px] flex-1 rounded-full px-2 py-3 text-center text-base font-semibold transition-all sm:text-sm ${
                  angle === opt.id
                    ? "bg-white text-[var(--text)] shadow-[var(--shadow-pill-active)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={busy || !file}
          onClick={onAnalyze}
          className="btn-primary w-full max-w-sm min-h-[52px] px-6 py-4 text-base"
        >
          {busy ? "Working..." : "Run bat analysis"}
        </button>
        {step && <p className="text-sm text-[var(--text-secondary)]">{step}</p>}
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      </div>
    </div>
  );
}
