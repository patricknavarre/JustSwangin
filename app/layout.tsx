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
  themeColor: "#ebedf0",
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
          <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[var(--nav-bg)]/95 pt-[env(safe-area-inset-top,0px)] shadow-sm backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
              <Link href="/" className="font-display text-xl text-[var(--text)]">
                JustSwangin
              </Link>
              <details className="relative">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-[var(--section-label)] transition hover:text-[var(--text)]">
                  Menu
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-black/[0.08] bg-white p-2 shadow-card">
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/scorecard"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Scorecard
                    </Link>
                    <Link
                      href="/swing"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Swing Lab
                    </Link>
                    <Link
                      href="/bat-lab"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Bat Lab
                    </Link>
                    <div className="my-1 border-t border-black/[0.06]" />
                    <Link
                      href="/betting-tracker"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Betting Tracker
                    </Link>
                    <Link
                      href="/club-averages"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Club Averages
                    </Link>
                    <Link
                      href="/strokes-gained"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Strokes Gained
                    </Link>
                    <Link
                      href="/analyze"
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
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
