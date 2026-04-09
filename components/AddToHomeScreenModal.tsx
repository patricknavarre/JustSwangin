"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type DisplayMode = "checking" | "standalone" | "browser";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function getIOSHelpVariant(): "safari" | "ios-other" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  if (!iOS) return "other";
  if (/CriOS/.test(ua) || /FxiOS/.test(ua) || /EdgiOS/.test(ua)) return "ios-other";
  return "safari";
}

function SafariSteps() {
  return (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
      <li>
        Tap the <strong className="text-[var(--text)]">⋯</strong> (three dots) menu in the{" "}
        <strong className="text-[var(--text)]">lower-right corner</strong>.
      </li>
      <li>
        Tap <strong className="text-[var(--text)]">Share</strong>.
      </li>
      <li>
        Tap <strong className="text-[var(--text)]">View More</strong> if you see it.
      </li>
      <li>
        Tap <strong className="text-[var(--text)]">Add to Home Screen</strong>.
      </li>
      <li>
        Make sure <strong className="text-[var(--text)]">Open as Web App</strong> is selected, then
        tap <strong className="text-[var(--text)]">Add</strong>.
      </li>
    </ol>
  );
}

export function AddToHomeScreenModal() {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("checking");
  const [open, setOpen] = useState(false);
  const [helpVariant, setHelpVariant] = useState<"safari" | "ios-other" | "other">("other");

  useEffect(() => {
    setDisplayMode(isStandaloneDisplay() ? "standalone" : "browser");
    setHelpVariant(getIOSHelpVariant());
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  if (displayMode === "checking" || displayMode === "standalone") {
    return null;
  }

  return (
    <>
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border-2 border-white/80 bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
        >
          Add this site to your Home Screen
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dialog"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="card relative z-10 max-h-[min(90dvh,32rem)] w-full max-w-md overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={titleId} className="section-heading">
              Add to Home Screen (iPhone)
            </p>

            {helpVariant === "safari" && (
              <>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  In Safari you can add JustSwangin as an app on your Home Screen. That gives you a
                  tap-to-open icon like a native app.
                </p>
                <SafariSteps />
              </>
            )}

            {helpVariant === "ios-other" && (
              <>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Open this page in <strong className="text-[var(--text)]">Safari</strong>, then
                  follow these steps:
                </p>
                <SafariSteps />
              </>
            )}

            {helpVariant === "other" && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                On iPhone, open this site in <strong className="text-[var(--text)]">Safari</strong>,
                then use Share → Add to Home Screen and choose to open as a web app when
                prompted—after that, you&apos;ll have a Home Screen icon for quick access.
              </p>
            )}

            <div className="mt-6">
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary min-h-[48px] w-full rounded-2xl px-6 py-3 text-sm font-bold"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
