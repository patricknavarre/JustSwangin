"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bearingDeltaDeg, distanceMeters, initialBearingDeg, type LatLng } from "@/lib/geo";

const RangeFinderMap = dynamic(() => import("@/components/RangeFinderMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[220px] items-center justify-center rounded-xl bg-[var(--pill-track)] text-sm text-[var(--text-secondary)]"
      aria-hidden
    >
      Loading map…
    </div>
  ),
});

type ElevSample = {
  t: number;
  lat: number;
  lng: number;
  elevationM: number | null;
};

type ElevPayload = {
  distanceM: number;
  samples: ElevSample[];
};

function metersToYards(m: number): number {
  return m * 1.0936133;
}

function metersToFeet(m: number): number {
  return m * 3.28084;
}

function ElevationProfile({
  samples,
  distanceM,
}: {
  samples: ElevSample[];
  distanceM: number;
}) {
  const vals = samples.map((s) => s.elevationM).filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length < 2) {
    return (
      <div className="flex h-20 items-center justify-center text-xs text-white/80">
        Elevation data unavailable for this path.
      </div>
    );
  }

  const minEl = Math.min(...vals);
  const maxEl = Math.max(...vals);
  const pad = Math.max(2, (maxEl - minEl) * 0.08);
  const y0 = minEl - pad;
  const y1 = maxEl + pad;
  const w = 100;
  const h = 36;
  const linePts = samples.filter(
    (s) => s.elevationM != null && Number.isFinite(s.elevationM),
  );
  const d = linePts
    .map((s, i) => {
      const x = s.t * w;
      const yn = (s.elevationM! - y0) / (y1 - y0);
      const y = h - yn * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const firstX = linePts[0] ? linePts[0].t * w : 0;
  const lastX = linePts[linePts.length - 1] ? linePts[linePts.length - 1].t * w : w;
  const areaD = `${d} L ${lastX.toFixed(2)} ${h} L ${firstX.toFixed(2)} ${h} Z`;

  return (
    <div className="w-full px-3 pb-2 pt-1">
      <svg
        viewBox={`0 0 ${w} ${h + 14}`}
        className="h-24 w-full"
        preserveAspectRatio="none"
        aria-label="Elevation along line of sight"
      >
        <defs>
          <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#elevFill)" />
        <path d={d} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <text x="0" y={h + 10} fill="rgba(255,255,255,0.75)" fontSize="5" className="font-sans">
          0
        </text>
        <text x={w} y={h + 10} fill="rgba(255,255,255,0.75)" fontSize="5" textAnchor="end" className="font-sans">
          {Math.round(metersToYards(distanceM))} yds
        </text>
      </svg>
      <p className="text-center text-[10px] text-white/70">
        Terrain profile (SRTM) — {Math.round(metersToFeet(minEl))}–{Math.round(metersToFeet(maxEl))} ft MSL
        (approx.)
      </p>
    </div>
  );
}

export function RangeFinderClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [target, setTarget] = useState<LatLng | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);
  const [compassSupported, setCompassSupported] = useState(false);
  const [elevLoading, setElevLoading] = useState(false);
  const [elevData, setElevData] = useState<ElevPayload | null>(null);
  const [elevError, setElevError] = useState<string | null>(null);

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
        setCameraError("Camera access is needed for the rangefinder view. Allow camera in your browser settings.");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (videoEl) videoEl.srcObject = null;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Location is not supported in this browser.");
      return;
    }
    setGeoError(null);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setGeoError("Location permission denied or unavailable. Enable location to compute yardage.");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    const has =
      typeof window !== "undefined" &&
      ("DeviceOrientationEvent" in window || "ondeviceorientationabsolute" in window);
    setCompassSupported(!!has);
  }, []);

  useEffect(() => {
    const onOrient = (e: DeviceOrientationEvent) => {
      const oe = e as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof oe.webkitCompassHeading === "number" && Number.isFinite(oe.webkitCompassHeading)) {
        setHeadingDeg(oe.webkitCompassHeading);
        return;
      }
      if (e.alpha != null && Number.isFinite(e.alpha)) {
        setHeadingDeg((360 - e.alpha + 360) % 360);
      }
    };
    window.addEventListener("deviceorientation", onOrient, true);
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, []);

  useEffect(() => {
    if (!userPos || !target) {
      setElevData(null);
      setElevError(null);
      setElevLoading(false);
      return;
    }

    const q = (n: number) => n.toFixed(6);
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      void (async () => {
        setElevLoading(true);
        setElevError(null);
        try {
          const res = await fetch(
            `/api/elevation/profile?lat0=${q(userPos.lat)}&lng0=${q(userPos.lng)}&lat1=${q(target.lat)}&lng1=${q(target.lng)}&samples=48`,
            { signal: ctrl.signal },
          );
          const json = (await res.json()) as ElevPayload & { error?: string };
          if (!res.ok) {
            throw new Error(json.error ?? "Elevation request failed");
          }
          setElevData(json);
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
          setElevData(null);
          setElevError(e instanceof Error ? e.message : "Elevation failed");
        } finally {
          setElevLoading(false);
        }
      })();
    }, 450);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [userPos, target]);

  const shot = useMemo(() => {
    if (!userPos || !target) return null;
    const m = distanceMeters(userPos.lat, userPos.lng, target.lat, target.lng);
    const bearing = initialBearingDeg(userPos.lat, userPos.lng, target.lat, target.lng);
    return { meters: m, yards: metersToYards(m), bearing };
  }, [userPos, target]);

  const alignHint = useMemo(() => {
    if (shot == null || headingDeg == null) return null;
    const delta = bearingDeltaDeg(headingDeg, shot.bearing);
    if (Math.abs(delta) < 4) return "Aligned with target bearing";
    return delta > 0 ? `Turn right ~${Math.round(Math.abs(delta))}°` : `Turn left ~${Math.round(Math.abs(delta))}°`;
  }, [shot, headingDeg]);

  const requestCompassPermission = useCallback(async () => {
    setCompassError(null);
    try {
      const req = (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<PermissionState>;
        }
      ).requestPermission;
      if (typeof req === "function") {
        const r = await req();
        if (r !== "granted") {
          setCompassError("Compass permission was not granted.");
        }
      }
    } catch {
      setCompassError("Could not enable compass on this device.");
    }
  }, []);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-2 pt-4 sm:max-w-2xl sm:pt-6">
      <div className="card overflow-hidden p-0">
        <div className="page-hero page-hero--water">
          <p className="page-hero-eyebrow">Course tools</p>
          <h1 className="font-display page-hero-title">Range finder</h1>
          <p className="page-hero-lede max-w-lg">
            Point your phone at the target and use GPS + a map pin for yardage. The camera is a sight picture;
            distance comes from your position to the pin. Elevation is sampled along that line (approximate DEM).
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
          <svg width="200" height="200" viewBox="0 0 200 200" className="opacity-90" aria-hidden>
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
            />
            <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(255,255,255,0.65)" strokeWidth="1.25" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(255,255,255,0.65)" strokeWidth="1.25" />
            <circle cx="100" cy="100" r="4" className="fill-[var(--accent)]" />
          </svg>
        </div>

        <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-3 pb-10 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
          {cameraError ? (
            <p className="pointer-events-auto text-xs text-[var(--warn)]">{cameraError}</p>
          ) : null}
          {geoError ? <p className="pointer-events-auto text-xs text-[var(--warn)]">{geoError}</p> : null}
          {shot ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-2xl font-bold tabular-nums">{Math.round(shot.yards)} yds</p>
              <p className="text-xs text-white/85">
                Bearing {Math.round(shot.bearing)}° · {shot.meters < 1000 ? `${Math.round(shot.meters)} m` : `${(shot.meters / 1000).toFixed(2)} km`}
              </p>
              {alignHint ? <p className="text-xs text-emerald-200/95">{alignHint}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-white/90">
              {!userPos ? "Waiting for GPS…" : "Set a target on the map below."}
            </p>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
          {elevLoading ? (
            <p className="pointer-events-none px-3 pb-1 text-center text-xs text-white/80">Loading elevation…</p>
          ) : null}
          {elevError ? (
            <p className="pointer-events-none px-3 pb-2 text-center text-xs text-[var(--warn)]">{elevError}</p>
          ) : null}
          {elevData && elevData.samples.length > 1 ? (
            <ElevationProfile samples={elevData.samples} distanceM={elevData.distanceM} />
          ) : !elevLoading && shot && !elevError ? (
            <div className="h-16" />
          ) : null}
        </div>
      </div>

      <details className="card open:shadow-card" open>
        <summary className="cursor-pointer list-none text-sm font-bold text-[var(--text)]">
          Target on map
          <span className="mt-1 block text-xs font-normal text-[var(--text-secondary)]">
            Tap the map or drag the pin. Coordinates are only used to compute distance and terrain on this device.
          </span>
        </summary>
        <div className="mt-4 space-y-4">
          <RangeFinderMap
            userPos={userPos}
            target={target}
            onTargetChange={setTarget}
            onMapPick={setTarget}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-[var(--section-label)]">
              Target latitude
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm"
                value={target?.lat ?? ""}
                placeholder="e.g. 40.7128"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setTarget((t) => ({ lat: v, lng: t?.lng ?? userPos?.lng ?? 0 }));
                }}
              />
            </label>
            <label className="block text-xs font-semibold text-[var(--section-label)]">
              Target longitude
              <input
                type="number"
                step="any"
                className="mt-1 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-sm"
                value={target?.lng ?? ""}
                placeholder="e.g. -74.006"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  setTarget((t) => ({ lat: t?.lat ?? userPos?.lat ?? 0, lng: v }));
                }}
              />
            </label>
          </div>

          {compassSupported ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm"
                onClick={() => void requestCompassPermission()}
              >
                Enable compass (iOS)
              </button>
              {compassError ? <span className="text-xs text-[var(--bad)]">{compassError}</span> : null}
              <span className="text-xs text-[var(--text-secondary)]">
                Uses device orientation to help line up with bearing. Optional.
              </span>
            </div>
          ) : null}
        </div>
      </details>

      <p className="px-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
        Map data © OpenStreetMap contributors. Elevation:{" "}
        <a
          href="https://www.opentopodata.org/"
          className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
        >
          OpenTopoData
        </a>{" "}
        SRTM (approximate). Not a substitute for a laser or official yardage markers.
      </p>
    </div>
  );
}
