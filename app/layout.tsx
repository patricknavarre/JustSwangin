import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "JustSwangin — Golf Swing Analysis",
  description: "Swing analysis with pose mapping, benchmarks, and AI coaching.",
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
              <div className="flex items-center gap-4">
                <Link
                  href="/scorecard"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--section-label)] transition hover:text-[var(--text)]"
                >
                  Scorecard
                </Link>
                <Link
                  href="/swing"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--section-label)] transition hover:text-[var(--text)]"
                >
                  Swing Lab
                </Link>
                <Link
                  href="/bat-lab"
                  className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--section-label)] transition hover:text-[var(--text)]"
                >
                  Bat Lab
                </Link>
              </div>
            </div>
          </header>
          <main className="pb-nav px-safe md:pb-10">{children}</main>
          <MobileNav />
        </div>
      </body>
    </html>
  );
}
