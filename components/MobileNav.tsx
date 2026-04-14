"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="mb-0.5 flex h-7 w-7 items-center justify-center">{children}</span>;
}

export function MobileNav() {
  const path = usePathname();
  const home = path === "/";
  const results = path === "/analyze";
  const swing = path === "/swing";
  const batLab = path === "/bat-lab" || path === "/bat-analyze";
  const scorecard = path === "/scorecard";
  const betting = path === "/betting-tracker";
  const clubAverages = path === "/club-averages";
  const strokesGained = path === "/strokes-gained";
  const rangeFinder = path === "/range-finder";
  const moreActive = betting || clubAverages || strokesGained || results || batLab;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/[0.06] bg-[var(--nav-bg)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden"
      aria-label="Main"
    >
      <div className="relative mx-auto grid max-w-lg grid-cols-5 items-end px-4 pt-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <Link
          href="/"
          className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-end pb-2 text-[11px] font-semibold active:opacity-70 ${
            home ? "text-[var(--text)]" : "text-[var(--section-label)]"
          }`}
        >
          <NavIcon>
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </NavIcon>
          Home
        </Link>

        <Link
          href="/scorecard"
          className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-end pb-2 text-[11px] font-semibold active:opacity-70 ${
            scorecard ? "text-[var(--text)]" : "text-[var(--section-label)]"
          }`}
        >
          <NavIcon>
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5A1.5 1.5 0 014.5 4h15A1.5 1.5 0 0121 5.5v13a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18.5v-13zM7 9.5h10M7 13h10M7 16.5h4" />
            </svg>
          </NavIcon>
          Scorecard
        </Link>

        <div className="relative flex flex-col items-center">
          <Link
            href="/range-finder"
            className={`nav-fab-feature flex h-[56px] w-[56px] min-h-[48px] min-w-[48px] items-center justify-center rounded-full text-white transition active:scale-95 active:opacity-90 ${
              rangeFinder ? "ring-2 ring-[var(--fab-feature)] ring-offset-2 ring-offset-[var(--nav-bg)]" : ""
            }`}
            aria-label="Open range finder"
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
              <path
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                d="M12 5v2M12 17v2M5 12h2M17 12h2"
              />
            </svg>
          </Link>
          <span className="mt-2 text-[11px] font-semibold text-[var(--section-label)]">Range</span>
        </div>

        <Link
          href="/swing"
          className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-end pb-2 text-[11px] font-semibold active:opacity-70 ${
            swing ? "text-[var(--text)]" : "text-[var(--section-label)]"
          }`}
        >
          <NavIcon>
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                d="M12 5v14M9 20h6"
              />
              <circle cx="12" cy="8" r="3.25" fill="currentColor" stroke="none" />
            </svg>
          </NavIcon>
          Swing
        </Link>

        <div className="relative">
          <details className="site-menu group">
            <summary
              className={`flex cursor-pointer min-h-[48px] min-w-[56px] flex-col items-center justify-end pb-2 text-[11px] font-semibold active:opacity-70 ${
                moreActive ? "text-[var(--text)]" : "text-[var(--section-label)]"
              }`}
            >
              <NavIcon>
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </NavIcon>
              More
            </summary>
            <div className="absolute bottom-[4.25rem] right-0 w-56 rounded-2xl border border-black/[0.08] bg-white p-2 shadow-card">
              <div className="flex flex-col gap-1">
                <Link
                  href="/bat-lab"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] ${
                    batLab ? "text-[var(--water-hazard)]" : "text-[var(--text)]"
                  }`}
                >
                  Bat Lab
                </Link>
                <Link
                  href="/analyze"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] ${
                    results ? "text-[var(--accent)]" : "text-[var(--text)]"
                  }`}
                >
                  Results
                </Link>
                <Link
                  href="/betting-tracker"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] ${
                    betting ? "text-[var(--accent)]" : "text-[var(--text)]"
                  }`}
                >
                  Betting Tracker
                </Link>
                <Link
                  href="/club-averages"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] ${
                    clubAverages ? "text-[var(--accent)]" : "text-[var(--text)]"
                  }`}
                >
                  Club Averages
                </Link>
                <Link
                  href="/strokes-gained"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent-soft)] ${
                    strokesGained ? "text-[var(--accent)]" : "text-[var(--text)]"
                  }`}
                >
                  Strokes Gained
                </Link>
              </div>
            </div>
          </details>
        </div>
      </div>
    </nav>
  );
}
