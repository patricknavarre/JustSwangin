"use client";

import { useEffect, useMemo, useState } from "react";
import { clearSgLogs, loadSgLogs, saveSgLogs, type SgLogEntry, type SgOutcome } from "@/lib/strokesGained/storage";

const outcomeOptions: {
  key: "offTee" | "approach" | "aroundGreen" | "putting";
  label: string;
  options: { value: SgOutcome; label: string; sg: number }[];
}[] = [
  {
    key: "offTee",
    label: "Off the tee",
    options: [
      { value: "fairway", label: "Fairway/Center", sg: 0.3 },
      { value: "rough", label: "Rough", sg: -0.2 },
      { value: "longRough", label: "Long rough", sg: -0.4 },
      { value: "hazardRecovery", label: "Hazard/Recovery", sg: -1.0 },
      { value: "penalty", label: "OB/Penalty", sg: -2.0 },
    ],
  },
  {
    key: "approach",
    label: "Approach",
    options: [
      { value: "greenInReg", label: "Green in regulation", sg: 0.2 },
      { value: "nearGreen", label: "Near green (chip distance)", sg: 0.1 },
      { value: "missApproach", label: "Missed approach", sg: -0.3 },
      { value: "bunkerApproach", label: "Bunker/hazard approach", sg: -0.8 },
      { value: "approachPenalty", label: "Penalty / unplayable", sg: -1.2 },
    ],
  },
  {
    key: "aroundGreen",
    label: "Around the green",
    options: [
      { value: "upAndDown", label: "Up-and-down", sg: 0.3 },
      { value: "proximity", label: "Left 1–2 putts", sg: 0.1 },
      { value: "chipToFringe", label: "Chip to fringe", sg: 0.0 },
      { value: "missAround", label: "Missed/left difficult", sg: -0.3 },
      { value: "approachPenalty", label: "Penalty after chip", sg: -1.0 },
    ],
  },
  {
    key: "putting",
    label: "Putting",
    options: [
      { value: "onePutts", label: "1-putt", sg: 0.6 },
      { value: "twoPutts", label: "2-putts", sg: 0.1 },
      { value: "threePlusPutts", label: "3+ putts", sg: -0.6 },
      { value: "missedShortPutt", label: "Missed short", sg: -0.2 },
    ],
  },
];

function outcomeToSg(categoryKey: (typeof outcomeOptions)[number]["key"], outcome?: SgOutcome): number {
  if (!outcome) return 0;
  const group = outcomeOptions.find((g) => g.key === categoryKey);
  const hit = group?.options.find((o) => o.value === outcome);
  return hit?.sg ?? 0;
}

function makeDefaultLog(): Omit<SgLogEntry, "id" | "createdAtISO"> {
  return {
    offTeeOutcome: undefined,
    approachOutcome: undefined,
    aroundGreenOutcome: undefined,
    puttingOutcome: undefined,
    note: "",
  };
}

export function StrokesGainedClient() {
  const [logs, setLogs] = useState<SgLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(makeDefaultLog());

  useEffect(() => {
    try {
      setLogs(loadSgLogs());
    } catch {
      setLogs([]);
    }
  }, []);

  const totals = useMemo(() => {
    let total = 0;
    const byCategory: Record<string, number> = {};
    byCategory.offTee = 0;
    byCategory.approach = 0;
    byCategory.aroundGreen = 0;
    byCategory.putting = 0;

    for (const l of logs) {
      const off = outcomeToSg("offTee", l.offTeeOutcome);
      const app = outcomeToSg("approach", l.approachOutcome);
      const ag = outcomeToSg("aroundGreen", l.aroundGreenOutcome);
      const putt = outcomeToSg("putting", l.puttingOutcome);
      total += off + app + ag + putt;
      byCategory.offTee += off;
      byCategory.approach += app;
      byCategory.aroundGreen += ag;
      byCategory.putting += putt;
    }

    const leakCategory =
      Math.min(byCategory.offTee, byCategory.approach, byCategory.aroundGreen, byCategory.putting);

    return {
      total,
      byCategory,
      leak: leakCategory,
    };
  }, [logs]);

  function commitDraft() {
    setError(null);
    const anySet =
      draft.offTeeOutcome || draft.approachOutcome || draft.aroundGreenOutcome || draft.puttingOutcome;
    if (!anySet) {
      setError("Choose at least one outcome to add a log entry.");
      return;
    }

    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const entry: SgLogEntry = {
      id,
      createdAtISO: new Date().toISOString(),
      offTeeOutcome: draft.offTeeOutcome,
      approachOutcome: draft.approachOutcome,
      aroundGreenOutcome: draft.aroundGreenOutcome,
      puttingOutcome: draft.puttingOutcome,
      note: draft.note?.trim() || undefined,
    };
    const next = [entry, ...logs];
    setLogs(next);
    saveSgLogs(next);
    setDraft(makeDefaultLog());
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 py-8 sm:max-w-2xl sm:py-10">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--mist">
          <p className="page-hero-eyebrow">Strokes gained</p>
          <h1 className="font-display page-hero-title">Calculator</h1>
          <p className="page-hero-lede max-w-sm">
            A lightweight v1: log outcomes by category and see where strokes are gained or lost.
          </p>
        </div>
      </div>

      <section className="card">
        <h2 className="section-heading">Session summary</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Total SG</p>
            <p className="mt-1 font-display text-3xl text-[var(--text)]">
              {totals.total >= 0 ? `+${totals.total.toFixed(1)}` : totals.total.toFixed(1)}
            </p>
          </div>
          <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">Biggest leak</p>
            <p className="mt-1 font-display text-3xl text-[var(--bad)]">{totals.leak.toFixed(1)}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="section-heading">Add a log entry</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Pick outcomes for each category for the shot/hole you’re logging.
        </p>

        <div className="mt-4 space-y-4">
          {outcomeOptions.map((group) => (
            <label key={group.key} className="block text-sm">
              <div className="font-semibold text-[var(--text)]">{group.label}</div>
              <select
                className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)]"
                value={
                  group.key === "offTee"
                    ? draft.offTeeOutcome ?? ""
                    : group.key === "approach"
                      ? draft.approachOutcome ?? ""
                      : group.key === "aroundGreen"
                        ? draft.aroundGreenOutcome ?? ""
                        : draft.puttingOutcome ?? ""
                }
                onChange={(e) => {
                  const v = e.target.value as SgOutcome;
                  const value = v ? (v as SgOutcome) : undefined;
                  setDraft((prev) => {
                    if (group.key === "offTee") return { ...prev, offTeeOutcome: value };
                    if (group.key === "approach") return { ...prev, approachOutcome: value };
                    if (group.key === "aroundGreen") return { ...prev, aroundGreenOutcome: value };
                    return { ...prev, puttingOutcome: value };
                  });
                }}
              >
                <option value="">Choose...</option>
                {group.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label} ({o.sg >= 0 ? "+" : ""}
                    {o.sg.toFixed(1)} SG)
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="block text-sm">
            <div className="font-semibold text-[var(--text)]">Note (optional)</div>
            <input
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)]"
              placeholder="e.g. wind left, tough lie, made a comeback..."
              value={draft.note ?? ""}
              onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            />
          </label>

          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

          <button type="button" onClick={commitDraft} className="btn-primary w-full rounded-2xl px-6 py-4 text-sm font-bold">
            Add log
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="section-heading">Recent entries</h2>
        {logs.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">No entries yet.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {logs.slice(0, 6).map((l) => (
              <div key={l.id} className="rounded-xl border border-black/[0.08] bg-white px-4 py-3">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {new Date(l.createdAtISO).toLocaleString()}
                </p>
                <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                  Off: {l.offTeeOutcome ?? "—"} • Approach: {l.approachOutcome ?? "—"} • Around:{" "}
                  {l.aroundGreenOutcome ?? "—"} • Put: {l.puttingOutcome ?? "—"}
                </p>
                {l.note && <p className="mt-2 text-sm text-[var(--text-secondary)]">{l.note}</p>}
              </div>
            ))}
          </div>
        )}

        {logs.length > 0 && (
          <button
            type="button"
            className="mt-5 w-full rounded-2xl border border-black/[0.12] bg-white px-6 py-4 text-sm font-semibold text-[var(--text)]"
            onClick={() => {
              clearSgLogs();
              setLogs([]);
              setDraft(makeDefaultLog());
            }}
          >
            Clear session logs
          </button>
        )}
      </section>
    </div>
  );
}

