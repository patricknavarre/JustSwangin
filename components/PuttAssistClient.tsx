"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estimateAimOffset, formatAimCallout } from "@/lib/putt/aim";
import {
  averageGravity,
  formatSlopeShort,
  slopeFromGravity,
  type GravitySample,
  type SlopeReading,
} from "@/lib/putt/slope";

const FREEZE_WINDOW_MS = 800;
const DEFAULT_DISTANCE_FT = 12;
const DEFAULT_STIMP = 10;

type MotionStatus = "idle" | "listening" | "denied" | "unsupported";

function needsMotionPermission(): boolean {
  if (typeof window === "undefined") return false;
  const req = (
    DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    }
  ).requestPermission;
  return typeof req === "function";
}

export function PuttAssistClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const samplesRef = useRef<GravitySample[]>([]);
  const freezeBufRef = useRef<GravitySample[]>([]);
  const freezeUntilRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [motionStatus, setMotionStatus] = useState<MotionStatus>("idle");
  const [motionError, setMotionError] = useState<string | null>(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [liveReading, setLiveReading] = useState<SlopeReading | null>(null);
  const [frozenReading, setFrozenReading] = useState<SlopeReading | null>(null);
  const [freezing, setFreezing] = useState(false);
  const [distanceFeet, setDistanceFeet] = useState(DEFAULT_DISTANCE_FT);
  const [stimp, setStimp] = useState(DEFAULT_STIMP);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const videoEl = videoRef.current;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }
      } catch {
        setCameraError(
          "Camera access helps with the putt sight picture. Allow camera in your browser settings, or continue with slope-only.",
        );
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("DeviceMotionEvent" in window)) {
      setMotionStatus("unsupported");
      setMotionError("Motion sensors are not available in this browser. Use a phone on the green.");
      return;
    }
    setNeedsGesture(needsMotionPermission());
    if (!needsMotionPermission()) {
      setMotionStatus("listening");
    }
  }, []);

  useEffect(() => {
    if (motionStatus !== "listening") return;

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      if (![a.x, a.y, a.z].every((v) => Number.isFinite(v))) return;
      const sample: GravitySample = { x: a.x, y: a.y, z: a.z };

      const until = freezeUntilRef.current;
      if (until != null) {
        freezeBufRef.current.push(sample);
        if (Date.now() >= until) {
          const avg = averageGravity(freezeBufRef.current);
          freezeUntilRef.current = null;
          freezeBufRef.current = [];
          setFreezing(false);
          if (avg) setFrozenReading(slopeFromGravity(avg));
        }
        return;
      }

      samplesRef.current.push(sample);
      if (samplesRef.current.length > 12) samplesRef.current.shift();
      const avg = averageGravity(samplesRef.current);
      if (avg) setLiveReading(slopeFromGravity(avg));
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [motionStatus]);

  const enableMotion = useCallback(async () => {
    setMotionError(null);
    if (!("DeviceMotionEvent" in window)) {
      setMotionStatus("unsupported");
      setMotionError("Motion sensors are not available in this browser.");
      return;
    }
    try {
      const req = (
        DeviceMotionEvent as unknown as {
          requestPermission?: () => Promise<PermissionState>;
        }
      ).requestPermission;
      if (typeof req === "function") {
        const r = await req();
        if (r !== "granted") {
          setMotionStatus("denied");
          setMotionError("Motion permission was not granted. Enable it to read green slope.");
          return;
        }
      }
      setNeedsGesture(false);
      setMotionStatus("listening");
    } catch {
      setMotionStatus("denied");
      setMotionError("Could not enable motion sensors on this device.");
    }
  }, []);

  const displayReading = frozenReading ?? liveReading;

  const aim = useMemo(() => {
    if (!displayReading) return null;
    return estimateAimOffset(displayReading, distanceFeet, stimp);
  }, [displayReading, distanceFeet, stimp]);

  const slopeText = displayReading ? formatSlopeShort(displayReading) : null;
  const aimText = aim ? formatAimCallout(aim) : null;

  // Aim tick: map |offset| inches to px offset from center (cap ~72px).
  const aimTickPx = useMemo(() => {
    if (!aim || aim.aimLabel === "straight") return 0;
    const sign = aim.offsetInches >= 0 ? 1 : -1;
    const mag = Math.min(72, Math.abs(aim.offsetInches) * 3.5);
    return sign * mag;
  }, [aim]);

  function startFreeze() {
    if (motionStatus !== "listening") return;
    freezeBufRef.current = [];
    freezeUntilRef.current = Date.now() + FREEZE_WINDOW_MS;
    setFreezing(true);
    setFrozenReading(null);
    window.setTimeout(() => {
      if (freezeUntilRef.current == null) return;
      const avg =
        averageGravity(freezeBufRef.current) ?? averageGravity(samplesRef.current);
      freezeUntilRef.current = null;
      freezeBufRef.current = [];
      setFreezing(false);
      if (avg) setFrozenReading(slopeFromGravity(avg));
    }, FREEZE_WINDOW_MS + 50);
  }

  function clearFreeze() {
    freezeUntilRef.current = null;
    freezeBufRef.current = [];
    setFreezing(false);
    setFrozenReading(null);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-2 pt-4 sm:max-w-2xl sm:pt-6">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--mist">
          <p className="page-hero-eyebrow">Course tools</p>
          <h1 className="font-display page-hero-title">Putt assist</h1>
          <p className="page-hero-lede max-w-lg">
            Lay your phone face-up on the green with the top toward the hole. Slope comes from motion
            sensors; enter putt length for an approximate aim offset. Not LiDAR—confirm critical reads
            with your eyes.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-black/[0.08] bg-black shadow-card">
        <video
          ref={videoRef}
          className="aspect-[3/4] max-h-[min(72vh,640px)] w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg width="220" height="280" viewBox="0 0 220 280" className="opacity-95" aria-hidden>
            {/* Putt line */}
            <line
              x1="110"
              y1="36"
              x2="110"
              y2="244"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.5"
              strokeDasharray="4 5"
            />
            {/* Cup */}
            <circle
              cx="110"
              cy="72"
              r="14"
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="1.75"
            />
            <circle cx="110" cy="72" r="3" className="fill-[var(--accent)]" />
            {/* Ball start */}
            <circle
              cx="110"
              cy="228"
              r="7"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="1.5"
            />
            {/* Aim tick */}
            {aim && Math.abs(aimTickPx) > 1 ? (
              <g transform={`translate(${aimTickPx}, 0)`}>
                <line
                  x1="110"
                  y1="52"
                  x2="110"
                  y2="92"
                  stroke="rgba(250, 204, 21, 0.95)"
                  strokeWidth="2.25"
                />
                <circle cx="110" cy="72" r="5" fill="rgba(250, 204, 21, 0.95)" />
              </g>
            ) : null}
            {/* Side slope wedge hint */}
            {displayReading && Math.abs(displayReading.sideDeg) >= 0.15 ? (
              <path
                d={
                  displayReading.sideDeg > 0
                    ? "M 110 160 L 150 190 L 110 190 Z"
                    : "M 110 160 L 70 190 L 110 190 Z"
                }
                fill="rgba(255,255,255,0.18)"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1"
              />
            ) : null}
          </svg>
        </div>

        <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/60 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          {cameraError ? (
            <p className="pointer-events-auto text-xs text-[var(--warn)]">{cameraError}</p>
          ) : null}
          {motionError ? (
            <p className="pointer-events-auto mt-1 text-xs text-[var(--warn)]">{motionError}</p>
          ) : null}
          {displayReading && slopeText ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-lg font-bold tabular-nums">{slopeText.side}</p>
              <p className="text-sm text-white/90">{slopeText.along}</p>
              {aimText ? (
                <p className="text-sm font-semibold text-amber-200/95">{aimText}</p>
              ) : null}
              {frozenReading ? (
                <p className="text-[11px] uppercase tracking-wide text-emerald-200/90">Frozen read</p>
              ) : freezing ? (
                <p className="text-[11px] uppercase tracking-wide text-white/80">Sampling…</p>
              ) : (
                <p className="text-[11px] text-white/70">Live · hold still for a steadier freeze</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/90">
              {motionStatus === "listening"
                ? "Place phone on the green — top toward the hole."
                : "Enable motion sensors to read slope."}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-12">
          <p className="text-center text-[11px] text-white/75">
            Face-up · top of phone toward hole · enter distance below
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="section-heading">Putt setup</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Distance is manual. Aim offset is an approximate model from sidehill and Stimp—not a
            guarantee.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[var(--section-label)]">
            Distance (ft)
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={80}
              step={0.5}
              value={distanceFeet}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setDistanceFeet(n);
              }}
              className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
            />
          </label>
          <label className="text-xs font-semibold text-[var(--section-label)]">
            Stimp
            <input
              type="number"
              inputMode="decimal"
              min={6}
              max={14}
              step={0.5}
              value={stimp}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                setStimp(n);
              }}
              className="mt-1.5 w-full rounded-xl border border-black/[0.1] bg-white px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]/50"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          {(needsGesture || motionStatus === "idle" || motionStatus === "denied") &&
          motionStatus !== "unsupported" ? (
            <button
              type="button"
              onClick={() => void enableMotion()}
              className="btn-primary rounded-2xl px-6 py-4 text-sm font-bold"
            >
              Enable motion sensors
            </button>
          ) : null}

          {motionStatus === "listening" ? (
            <>
              <button
                type="button"
                onClick={startFreeze}
                disabled={freezing}
                className="btn-primary rounded-2xl px-6 py-4 text-sm font-bold disabled:opacity-45"
              >
                {freezing ? "Sampling…" : "Freeze read"}
              </button>
              {frozenReading ? (
                <button
                  type="button"
                  onClick={clearFreeze}
                  className="rounded-2xl border border-black/[0.12] bg-white px-6 py-4 text-sm font-semibold text-[var(--text)]"
                >
                  Resume live
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {aim && displayReading ? (
          <div className="rounded-xl border border-black/[0.08] bg-[var(--pill-track)]/60 px-4 py-3 text-sm text-[var(--text)]">
            <p className="font-semibold">{aimText}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Sidehill {Math.abs(displayReading.sideDeg).toFixed(1)}° ·{" "}
              {displayReading.alongLabel === "level"
                ? "level"
                : `${Math.abs(displayReading.alongDeg).toFixed(1)}° ${displayReading.alongLabel}`}{" "}
              · Stimp {stimp.toFixed(1)} · {distanceFeet.toFixed(1)} ft
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
