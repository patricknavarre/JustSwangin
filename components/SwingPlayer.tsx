"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PoseFrame } from "@/types/swing";
import type { SwingMetrics } from "@/types/swing";
import { PoseOverlay } from "./PoseOverlay";

type Props = {
  videoUrl: string;
  frames: PoseFrame[];
  metrics: SwingMetrics;
};

export function SwingPlayer({ videoUrl, frames, metrics }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [dims, setDims] = useState({ w: 640, h: 360 });

  const onTime = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentMs(v.currentTime * 1000);
  }, []);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDims({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="card overflow-hidden p-0">
      <p className="section-heading px-5 pt-5">Playback</p>
      <div
        ref={wrapRef}
        className="relative mt-2 aspect-video w-full overflow-hidden bg-neutral-900"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="h-full w-full object-contain"
          controls
          playsInline
          onTimeUpdate={onTime}
          onLoadedMetadata={onTime}
        />
        <PoseOverlay
          frames={frames}
          currentMs={currentMs}
          width={dims.w}
          height={dims.h}
          metrics={metrics}
        />
      </div>
    </div>
  );
}
