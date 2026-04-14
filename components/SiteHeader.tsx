"use client";

import { NavLink } from "@/components/NavLink";

function closeHeaderMenu() {
  const d = document.getElementById("site-header-menu");
  if (d instanceof HTMLDetailsElement) d.open = false;
}

export function SiteHeader() {
  return (
    <header className="site-header sticky top-0 z-40 border-b border-[var(--header-border)] pt-[env(safe-area-inset-top,0px)] shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <NavLink href="/" className="font-display text-xl text-[var(--header-text)]">
          JustSwangin
        </NavLink>
        <details id="site-header-menu" className="site-menu relative">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-[var(--header-text-muted)] transition hover:text-[var(--water-hazard)]">
            Menu
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-black/[0.08] bg-white p-2 shadow-card">
            <div className="flex flex-col gap-1">
              <NavLink
                href="/scorecard"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Scorecard
              </NavLink>
              <NavLink
                href="/swing"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Swing Lab
              </NavLink>
              <NavLink
                href="/bat-lab"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Bat Lab
              </NavLink>
              <NavLink
                href="/range-finder"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Range finder
              </NavLink>
              <div className="my-1 border-t border-black/[0.06]" />
              <NavLink
                href="/betting-tracker"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Betting Tracker
              </NavLink>
              <NavLink
                href="/club-averages"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Club Averages
              </NavLink>
              <NavLink
                href="/strokes-gained"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Strokes Gained
              </NavLink>
              <NavLink
                href="/analyze"
                onClick={closeHeaderMenu}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
              >
                Results
              </NavLink>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
