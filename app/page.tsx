import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-amber-200 via-orange-400 to-amber-900 px-6 py-10">
          <p className="section-heading !mb-0 !text-[10px] text-white/90">
            JustSwangin
          </p>
          <h1 className="font-display mt-3 text-4xl text-white sm:text-5xl">
            Luxury-grade swing analysis
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/85">
            Pose mapping + research benchmarks + Claude coaching. Built to feel private club,
            not clinical.
          </p>

          <div className="mt-7">
            <Link
              href="/swing"
              className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
            >
              Start swing analysis
            </Link>
          </div>
        </div>
      </div>

      <section>
        <h2 className="section-heading">Technology behind the app</h2>
        <ol className="mt-4 space-y-3 text-sm text-[var(--text-secondary)]">
          <li>
            <strong className="text-[var(--text)]">MediaPipe Pose in your browser</strong> extracts
            body landmarks from video frames.
          </li>
          <li>
            <strong className="text-[var(--text)]">Angles + timing from landmarks</strong> compute
            swing phases and biomechanics metrics, then score them against research benchmark
            ranges.
          </li>
          <li>
            <strong className="text-[var(--text)]">Annotated playback</strong> draws a skeleton
            overlay and phase timeline so you can see what changed and when.
          </li>
          <li>
            <strong className="text-[var(--text)]">Claude coaching report</strong> calls your
            Anthropic API only for the written coaching (prioritized fixes + drills).
          </li>
        </ol>
      </section>

      <div className="card">
        <h2 className="section-heading">Privacy note</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Pose landmark processing happens on-device in the browser. The app sends your computed
          metrics (and optional launch-monitor CSV averages) to Claude to generate the coaching
          report.
        </p>
      </div>

      <div className="card">
        <h2 className="section-heading">Next step</h2>
        <p className="font-display mt-2 text-2xl text-[var(--text)]">Let’s map your swing.</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Upload a clip that clearly shows your full body, choose camera angle, and run analysis.
        </p>
        <div className="mt-5">
          <Link
            href="/swing"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Go to Swing
          </Link>
        </div>
      </div>
    </div>
  );
}
