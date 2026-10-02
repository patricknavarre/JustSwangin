import { GOLF_SHOT_LABELS } from "@/types/swing";
import type { ClubFittingReport } from "@/lib/clubFitting/types";

function confidenceLabel(c: ClubFittingReport["confidence"]): string {
  switch (c) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "limited":
      return "Limited confidence";
  }
}

function confidenceClass(c: ClubFittingReport["confidence"]): string {
  switch (c) {
    case "high":
      return "text-[var(--good)]";
    case "medium":
      return "text-[var(--warn)]";
    case "limited":
      return "text-[var(--section-label)]";
  }
}

type Props = { report: ClubFittingReport };

export function ClubFittingReportView({ report }: Props) {
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="text-[var(--section-label)]">
            {GOLF_SHOT_LABELS[report.golfShotType]}
          </span>
          <span className={confidenceClass(report.confidence)}>
            {confidenceLabel(report.confidence)}
          </span>
          <span className="text-[var(--text-secondary)] normal-case tracking-normal">
            {report.hasLaunchData
              ? `${report.shotCount} launch shot${report.shotCount === 1 ? "" : "s"}`
              : "Pose only — no launch CSV"}
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{report.summary}</p>
        {!report.hasLaunchData && (
          <p className="mt-3 rounded-xl border border-[var(--warn)]/30 bg-[#faf6ec] px-3 py-2 text-xs leading-relaxed text-[var(--deep-pine)]">
            Without launch-monitor averages we can only speak to tempo and feel. Attach a CSV below
            for flex, loft, spin, and head-bias bands.
          </p>
        )}
      </div>

      <section className="card">
        <h2 className="section-heading">Spec bands</h2>
        <ul className="mt-2 space-y-4">
          {report.specs.map((s) => (
            <li key={s.id} className="border-b border-black/[0.06] pb-4 last:border-b-0 last:pb-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--section-label)]">
                {s.title}
                {s.requiresLaunch && !report.hasLaunchData ? (
                  <span className="ml-2 font-normal normal-case tracking-normal text-[var(--warn)]">
                    needs launch data
                  </span>
                ) : null}
              </p>
              <p className="font-display mt-1 text-lg text-[var(--text)]">{s.value}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{s.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-heading">Example models</h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Illustrative starting points that match your tags — not a purchase recommendation or live
          inventory.
        </p>
        <ul className="space-y-3">
          {report.models.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-black/[0.08] bg-[var(--card)] px-4 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--section-label)]">
                {m.category}
              </p>
              <p className="font-display mt-0.5 text-lg text-[var(--text)]">
                {m.brand} {m.model}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{m.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="section-heading">What would improve this fit</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {report.improveChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-[var(--section-label)]">
        Educational only. Not a substitute for a professional club fitting on a launch monitor.
        Brand and model names are examples; specs and availability change. Confirm everything with a
        fitter before you buy.
      </p>
    </div>
  );
}
