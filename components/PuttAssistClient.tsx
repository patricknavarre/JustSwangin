"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { estimateAimOffset, formatAimCallout } from "@/lib/putt/aim";
import {
  averageGravity,
  formatSlopeShort,
  slopeFromGravityCameraRig,
  type GravitySample,
  type SlopeReading,
} from "@/lib/putt/slope";

const FREEZE_WINDOW_MS = 800;
const DEFAULT_DISTANCE_FT = 12;
const DEFAULT_STIMP = 10;

/** View overlay: cup near top, ball near bottom (phone bottom on ground). */
const CUP_Y = 16;
const BALL_Y = 90;
const CENTER_X = 50;

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

function aimOffsetPercent(aimInches: number, distanceFeet: number): number {
  if (distanceFeet < 0.5) return 0;
  const ft = Math.abs(aimInches) / 12;
  const ratio = ft / distanceFeet;
  const pct = ratio * 55;
  const sign = aimInches >= 0 ? 1 : -1;
  return sign * Math.min(22, Math.max(0, pct));
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
          "Allow camera access to see the hole and overlay the putt line on the live view.",
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
          if (avg) setFrozenReading(slopeFromGravityCameraRig(avg));
        }
        return;
      }

      samplesRef.current.push(sample);
      if (samplesRef.current.length > 12) samplesRef.current.shift();
      const avg = averageGravity(samplesRef.current);
      if (avg) setLiveReading(slopeFromGravityCameraRig(avg));
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

  const aimX = useMemo(() => {
    if (!aim) return CENTER_X;
    return CENTER_X + aimOffsetPercent(aim.offsetInches, distanceFeet);
  }, [aim, distanceFeet]);

  const breakCurve = useMemo(() => {
    const midY = (BALL_Y + CUP_Y) / 2;
    const midX = CENTER_X + (aimX - CENTER_X) * 0.55;
    return `M ${CENTER_X} ${BALL_Y} Q ${midX} ${midY} ${aimX} ${CUP_Y}`;
  }, [aimX]);

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
      if (avg) setFrozenReading(slopeFromGravityCameraRig(avg));
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
            Rest the bottom of your phone on the ground behind the ball and point the camera at the
            hole. The live view shows the cup with a putt line and aim overlay; slope comes from
            motion sensors while the phone stays still.
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

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="puttLineGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(250,204,21,0.95)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.85)" />
            </linearGradient>
          </defs>

          {/* Ground line at phone base */}
          <line
            x1="8"
            y1={BALL_Y + 2}
            x2="92"
            y2={BALL_Y + 2}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.35"
            vectorEffect="non-scaling-stroke"
          />

          {/* Putt path */}
          <path
            d={breakCurve}
            fill="none"
            stroke="url(#puttLineGlow)"
            strokeWidth="0.55"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={aim && aim.aimLabel !== "straight" ? "1.2 0.8" : "none"}
          />

          {/* Center line to cup (subtle) */}
          <line
            x1={CENTER_X}
            y1={BALL_Y}
            x2={CENTER_X}
            y2={CUP_Y}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />

          {/* Aim point at hole */}
          <circle
            cx={aimX}
            cy={CUP_Y}
            r="2.2"
            fill="rgba(250,204,21,0.95)"
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="0.25"
            vectorEffect="non-scaling-stroke"
          />

          {/* Cup ring */}
          <circle
            cx={CENTER_X}
            cy={CUP_Y}
            r="3.5"
            fill="none"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="0.45"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={CENTER_X}
            cy={CUP_Y}
            r="0.8"
            fill="rgba(255,255,255,0.95)"
            vectorEffect="non-scaling-stroke"
          />

          {/* Ball */}
          <circle
            cx={CENTER_X}
            cy={BALL_Y}
            r="1.8"
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="0.3"
            vectorEffect="non-scaling-stroke"
          />

          {displayReading && Math.abs(displayReading.sideDeg) >= 0.15 ? (
            <text
              x={displayReading.sideDeg > 0 ? 78 : 22}
              y={48}
              fill="rgba(255,255,255,0.75)"
              fontSize="3.2"
              textAnchor="middle"
              className="font-sans font-semibold"
            >
              {displayReading.sideLabel === "flat" ? "" : displayReading.sideLabel.toUpperCase()}
            </text>
          ) : null}
        </svg>

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
                <p className="text-[11px] text-white/70">Live · keep phone still on the ground</p>
              )}
            </div>
          ) : (
            <p className="mt-1 text-sm text-white/90">
              {motionStatus === "listening"
                ? "Frame the cup at the top — bottom of phone on the ground at the ball."
                : "Enable motion sensors to read slope."}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-3 pt-12">
          <p className="text-center text-[11px] text-white/75">
            Yellow dot = aim · white ring = cup · line from ball
          </p>
        </div>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="section-heading">Putt setup</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Stand the phone on its bottom edge behind the ball, tilt until the cup is centered in
            view, then enter distance. Aim offset is approximate—trust your read on must-makes.
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
