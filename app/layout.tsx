import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "JustSwangin — Golf Swing Analysis",
  description: "Swing analysis with pose mapping, benchmarks, and AI coaching.",
  icons: {
    icon: [{ url: "/icon.jpg", sizes: "1024x1024", type: "image/jpeg" }],
    apple: [{ url: "/apple-icon.jpg", sizes: "1024x1024", type: "image/jpeg" }],
  },
  appleWebApp: {
    capable: true,
    title: "JustSwangin",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#F4F2EC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="touch-manipulation antialiased">
        <div className="app-canvas overflow-x-hidden">
          <header className="site-header sticky top-0 z-40 border-b border-[var(--header-border)] pt-[env(safe-area-inset-top,0px)] shadow-sm">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
              <Link href="/" className="font-display text-xl text-[var(--header-text)]">
                JustSwangin
              </Link>
              <details className="site-menu relative">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-[var(--header-text-muted)] transition hover:text-[var(--water-hazard)]">
                  Menu
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-black/[0.08] bg-white p-2 shadow-card">
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/scorecard"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Scorecard
                    </Link>
                    <Link
                      href="/swing"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Swing Lab
                    </Link>
                    <Link
                      href="/bat-lab"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Bat Lab
                    </Link>
                    <Link
                      href="/range-finder"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Range finder
                    </Link>
                    <div className="my-1 border-t border-black/[0.06]" />
                    <Link
                      href="/betting-tracker"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Betting Tracker
                    </Link>
                    <Link
                      href="/club-averages"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Club Averages
                    </Link>
                    <Link
                      href="/strokes-gained"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Strokes Gained
                    </Link>
                    <Link
                      href="/analyze"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--pill-track)]"
                    >
                      Results
                    </Link>
                  </div>
                </div>
              </details>
            </div>
          </header>
          <main className="pb-nav px-safe md:pb-10">{children}</main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
