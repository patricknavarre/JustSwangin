import Link from "next/link";
import { AddToHomeScreenModal } from "@/components/AddToHomeScreenModal";

export default function Home() {
  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--pine">
          <p className="page-hero-eyebrow">JustSwangin</p>
          <h1 className="font-display page-hero-title">Luxury-grade swing analysis</h1>
          <p className="page-hero-lede max-w-sm">
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
            <AddToHomeScreenModal />
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

      <div className="card">
        <h2 className="section-heading">Bat lab</h2>
        <p className="font-display mt-2 text-2xl text-[var(--text)]">
          Baseball + softball swing analysis
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Upload your hitting clip and use the same on-device pose mapping + Anthropic coaching flow
          tuned for baseball/softball language.
        </p>
        <div className="mt-5">
          <Link
            href="/bat-lab"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Open Bat Lab
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="section-heading">Priority Features</h2>
        <p className="font-display mt-2 text-2xl text-[var(--text)]">
          Build your friend-group favorites
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Three utility pages made for weekends: betting, club distances from TrackMan data, and a
          lightweight strokes gained calculator.
        </p>

        <div className="mt-5 space-y-3">
          <Link
            href="/betting-tracker"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Open Betting Tracker
          </Link>
          <Link
            href="/club-averages"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Open Club Averages
          </Link>
          <Link
            href="/strokes-gained"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Open Strokes Gained
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 className="section-heading">Digital scorecard</h2>
        <p className="font-display mt-2 text-2xl text-[var(--text)]">
          Track live rounds and review previous scores
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          <li>
            Uses your location to suggest nearby courses, with manual course selection always
            available.
          </li>
          <li>
            Shows hole-by-hole layout with par and yardage, plus stroke entry for each hole.
          </li>
          <li>
            Saves previous rounds on your device so you can reload and compare scores later.
          </li>
        </ul>
        <div className="mt-5">
          <Link
            href="/scorecard"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-8 py-4 text-sm font-bold sm:w-auto"
          >
            Open scorecard
          </Link>
        </div>
      </div>
    </div>
  );
}
