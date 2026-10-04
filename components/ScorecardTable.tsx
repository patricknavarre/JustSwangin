"use client";

import type { CourseScorecard, ScorecardTee } from "@/types/scorecard";
import type { ScorecardPlayer } from "@/types/round";
import { computeRoundTotals } from "@/lib/rounds/storage";

type Props = {
  course: CourseScorecard;
  teeId: string;
  onTeeChange: (teeId: string) => void;
  players: ScorecardPlayer[];
  onHoleScoresStrokesChange: (
    playerId: string,
    holeNumber: number,
    strokes: number | null,
  ) => void;
};

function summarizeNine(holes: CourseScorecard["holes"], from: number, to: number) {
  const nine = holes.filter((h) => h.holeNumber >= from && h.holeNumber <= to);
  return {
    par: nine.reduce((sum, h) => sum + h.par, 0),
    yards: nine.reduce((sum, h) => sum + h.yardage, 0),
  };
}

function teeById(tees: ScorecardTee[], teeId: string): ScorecardTee {
  return tees.find((t) => t.teeId === teeId) ?? tees[0];
}

function nineStrokes(player: ScorecardPlayer, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i <= to; i++) {
    const v = player.holeScoresStrokes[i - 1];
    if (typeof v === "number") sum += v;
  }
  return sum;
}

export function ScorecardTable({
  course,
  teeId,
  onTeeChange,
  players,
  onHoleScoresStrokesChange,
}: Props) {
  const selectedTee = teeById(course.tees, teeId);
  const front = summarizeNine(course.holes, 1, 9);
  const back = summarizeNine(course.holes, 10, 18);
  const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);

  return (
    <div className="card">
      <h2 className="section-heading">Scorecard</h2>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-xl text-[var(--text)]">{course.name}</p>
        <label className="text-xs text-[var(--text-secondary)]">
          Tee
          <select
            className="ml-2 rounded-lg border border-black/[0.1] bg-white px-2 py-1 text-sm text-[var(--text)]"
            value={selectedTee.teeId}
            onChange={(e) => onTeeChange(e.target.value)}
          >
            {course.tees.map((tee) => (
              <option key={tee.teeId} value={tee.teeId}>
                {tee.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {course.city}, {course.state} • {selectedTee.name}
        {selectedTee.rating ? ` • ${selectedTee.rating.toFixed(1)}` : ""}
        {selectedTee.slope ? ` / ${selectedTee.slope}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => {
          const { totalStrokes, netToPar } = computeRoundTotals(p.holeScoresStrokes, totalPar);
          return (
            <div
              key={p.id}
              className="rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs"
            >
              <p className="font-semibold text-[var(--text)]">{p.name}</p>
              <p className="mt-0.5 text-[var(--text-secondary)]">
                {totalStrokes} ·{" "}
                <span
                  className={
                    netToPar <= 0 ? "font-bold text-[var(--good)]" : "font-bold text-[var(--accent)]"
                  }
                >
                  {netToPar > 0 ? `+${netToPar}` : netToPar}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.08] text-[var(--section-label)]">
              <th className="sticky left-0 z-10 bg-[var(--card)] px-2 py-2 text-left font-semibold">
                Hole
              </th>
              <th className="px-2 py-2 text-right font-semibold">Par</th>
              <th className="px-2 py-2 text-right font-semibold">Yds</th>
              <th className="px-2 py-2 text-right font-semibold">HCP</th>
              {players.map((p) => (
                <th
                  key={p.id}
                  className="min-w-[4.5rem] px-2 py-2 text-right font-semibold"
                  title={p.name}
                >
                  {p.name.length > 8 ? `${p.name.slice(0, 7)}…` : p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {course.holes.map((hole) => (
              <tr key={hole.holeNumber} className="border-b border-black/[0.05]">
                <td className="sticky left-0 z-10 bg-[var(--card)] px-2 py-2 font-medium text-[var(--text)]">
                  {hole.holeNumber}
                </td>
                <td className="px-2 py-2 text-right text-[var(--text)]">{hole.par}</td>
                <td className="px-2 py-2 text-right text-[var(--text)]">{hole.yardage}</td>
                <td className="px-2 py-2 text-right text-[var(--text-secondary)]">
                  {hole.handicap ?? "—"}
                </td>
                {players.map((p) => (
                  <td key={p.id} className="px-1 py-1 text-right">
                    <input
                      className="w-[64px] rounded-lg border border-black/[0.12] bg-white px-2 py-2 text-sm outline-none focus:border-[var(--accent)]/50"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      step={1}
                      aria-label={`${p.name} hole ${hole.holeNumber}`}
                      value={(() => {
                        const v = p.holeScoresStrokes[hole.holeNumber - 1];
                        return typeof v === "number" ? v : "";
                      })()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          onHoleScoresStrokesChange(p.id, hole.holeNumber, null);
                          return;
                        }
                        const n = Math.trunc(Number(raw));
                        if (!Number.isFinite(n) || n < 0) {
                          onHoleScoresStrokesChange(p.id, hole.holeNumber, null);
                          return;
                        }
                        onHoleScoresStrokesChange(p.id, hole.holeNumber, n);
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--pill-track)]/50 font-semibold text-[var(--text)]">
              <td className="sticky left-0 z-10 bg-[var(--pill-track)] px-2 py-2">Front 9</td>
              <td className="px-2 py-2 text-right">{front.par}</td>
              <td className="px-2 py-2 text-right">{front.yards}</td>
              <td className="px-2 py-2 text-right"> </td>
              {players.map((p) => (
                <td key={p.id} className="px-2 py-2 text-right">
                  {nineStrokes(p, 1, 9) || "—"}
                </td>
              ))}
            </tr>
            <tr className="bg-[var(--pill-track)]/50 font-semibold text-[var(--text)]">
              <td className="sticky left-0 z-10 bg-[var(--pill-track)] px-2 py-2">Back 9</td>
              <td className="px-2 py-2 text-right">{back.par}</td>
              <td className="px-2 py-2 text-right">{back.yards}</td>
              <td className="px-2 py-2 text-right"> </td>
              {players.map((p) => (
                <td key={p.id} className="px-2 py-2 text-right">
                  {nineStrokes(p, 10, 18) || "—"}
                </td>
              ))}
            </tr>
            <tr className="bg-[var(--accent-soft)] font-bold text-[var(--text)]">
              <td className="sticky left-0 z-10 bg-[var(--accent-soft)] px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right">{front.par + back.par}</td>
              <td className="px-2 py-2 text-right">{selectedTee.totalYards}</td>
              <td className="px-2 py-2 text-right"> </td>
              {players.map((p) => {
                const { totalStrokes } = computeRoundTotals(p.holeScoresStrokes, totalPar);
                return (
                  <td key={p.id} className="px-2 py-2 text-right">
                    {totalStrokes}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
