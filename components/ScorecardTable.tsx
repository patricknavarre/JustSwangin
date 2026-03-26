"use client";

import type { CourseScorecard, ScorecardTee } from "@/types/scorecard";

type Props = {
  course: CourseScorecard;
  teeId: string;
  onTeeChange: (teeId: string) => void;
  holeScoresStrokes: Array<number | null>;
  onHoleScoresStrokesChange: (holeNumber: number, strokes: number | null) => void;
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

export function ScorecardTable({
  course,
  teeId,
  onTeeChange,
  holeScoresStrokes,
  onHoleScoresStrokesChange,
}: Props) {
  const selectedTee = teeById(course.tees, teeId);
  const front = summarizeNine(course.holes, 1, 9);
  const back = summarizeNine(course.holes, 10, 18);
  const totalStrokesPartial = course.holes.reduce((sum, h) => {
    const v = holeScoresStrokes[h.holeNumber - 1];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
  const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0);
  const netToParPartial = totalStrokesPartial - totalPar;

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

      <p className="mt-3 text-sm text-[var(--text-secondary)]">
        Par {totalPar} • Strokes {Number.isFinite(totalStrokesPartial) ? totalStrokesPartial : "—"} •{" "}
        <span className={netToParPartial <= 0 ? "font-bold text-[var(--good)]" : "font-bold text-[var(--accent)]"}>
          {netToParPartial > 0 ? `+${netToParPartial}` : netToParPartial}
        </span>{" "}
        to par
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.08] text-[var(--section-label)]">
              <th className="px-2 py-2 text-left font-semibold">Hole</th>
              <th className="px-2 py-2 text-right font-semibold">Par</th>
              <th className="px-2 py-2 text-right font-semibold">Yds</th>
              <th className="px-2 py-2 text-right font-semibold">HCP</th>
              <th className="px-2 py-2 text-right font-semibold">Strokes</th>
            </tr>
          </thead>
          <tbody>
            {course.holes.map((hole) => (
              <tr key={hole.holeNumber} className="border-b border-black/[0.05]">
                <td className="px-2 py-2 font-medium text-[var(--text)]">{hole.holeNumber}</td>
                <td className="px-2 py-2 text-right text-[var(--text)]">{hole.par}</td>
                <td className="px-2 py-2 text-right text-[var(--text)]">{hole.yardage}</td>
                <td className="px-2 py-2 text-right text-[var(--text-secondary)]">
                  {hole.handicap ?? "—"}
                </td>
                <td className="px-2 py-1 text-right">
                  <input
                    className="w-[72px] rounded-lg border border-black/[0.12] bg-white px-2 py-2 text-sm outline-none focus:border-[var(--accent)]/50"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    step={1}
                    value={(() => {
                      const v = holeScoresStrokes[hole.holeNumber - 1];
                      return typeof v === "number" ? v : "";
                    })()}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        onHoleScoresStrokesChange(hole.holeNumber, null);
                        return;
                      }
                      const n = Math.trunc(Number(raw));
                      if (!Number.isFinite(n) || n < 0) {
                        onHoleScoresStrokesChange(hole.holeNumber, null);
                        return;
                      }
                      onHoleScoresStrokesChange(hole.holeNumber, n);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--pill-track)]/50 font-semibold text-[var(--text)]">
              <td className="px-2 py-2">Front 9</td>
              <td className="px-2 py-2 text-right">{front.par}</td>
              <td className="px-2 py-2 text-right">{front.yards}</td>
              <td className="px-2 py-2 text-right"> </td>
              <td className="px-2 py-2 text-right">{/* computed in body */} </td>
            </tr>
            <tr className="bg-[var(--pill-track)]/50 font-semibold text-[var(--text)]">
              <td className="px-2 py-2">Back 9</td>
              <td className="px-2 py-2 text-right">{back.par}</td>
              <td className="px-2 py-2 text-right">{back.yards}</td>
              <td className="px-2 py-2 text-right"> </td>
              <td className="px-2 py-2 text-right"> </td>
            </tr>
            <tr className="bg-[var(--accent-soft)] font-bold text-[var(--text)]">
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right">{front.par + back.par}</td>
              <td className="px-2 py-2 text-right">{selectedTee.totalYards}</td>
              <td className="px-2 py-2 text-right"> </td>
              <td className="px-2 py-2 text-right">{totalStrokesPartial}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
