"use client";

import type { ScorecardPlayer } from "@/types/round";
import { MAX_SCORECARD_PLAYERS } from "@/lib/rounds/players";

type Props = {
  players: ScorecardPlayer[];
  onAddPlayer: () => void;
  onRenamePlayer: (playerId: string, name: string) => void;
  onRemovePlayer: (playerId: string) => void;
};

export function ScorecardPlayersPanel({
  players,
  onAddPlayer,
  onRenamePlayer,
  onRemovePlayer,
}: Props) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-heading">Players</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Add playing partners (up to {MAX_SCORECARD_PLAYERS}). Each gets a column on the
            scorecard.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddPlayer}
          disabled={players.length >= MAX_SCORECARD_PLAYERS}
          className="btn-primary shrink-0 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-45"
        >
          Add player
        </button>
      </div>

      <ul className="mt-4 space-y-3">
        {players.map((p, index) => (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2"
          >
            <span className="w-6 shrink-0 text-xs font-semibold text-[var(--section-label)]">
              {index + 1}
            </span>
            <input
              type="text"
              className="min-w-0 flex-1 rounded-lg border border-black/[0.1] bg-white px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
              value={p.name}
              maxLength={24}
              aria-label={`Player ${index + 1} name`}
              onChange={(e) => onRenamePlayer(p.id, e.target.value)}
            />
            {players.length > 1 ? (
              <button
                type="button"
                onClick={() => onRemovePlayer(p.id)}
                className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-[var(--bad)] transition hover:bg-red-50"
              >
                Remove
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
