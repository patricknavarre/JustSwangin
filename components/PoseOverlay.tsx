"use client";

import { useEffect, useRef } from "react";
import type { PoseFrame } from "@/types/swing";
import { drawPoseOnCanvas } from "@/lib/annotator";
import type { SwingMetrics } from "@/types/swing";

type Props = {
  frames: PoseFrame[];
  currentMs: number;
  width: number;
  height: number;
  metrics: SwingMetrics;
};

function frameForTime(frames: PoseFrame[], t: number): PoseFrame | undefined {
  if (!frames.length) return undefined;
  let best = frames[0];
  let bestD = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.t - t);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

function overallHealth(m: SwingMetrics): "good" | "borderline" | "needsWork" {
  const bad = m.deviations.filter((d) => d.status === "needsWork").length;
  const border = m.deviations.filter((d) => d.status === "borderline").length;
  if (bad >= 3) return "needsWork";
  if (bad >= 1 || border >= 4) return "borderline";
  return "good";
}

export function PoseOverlay({ frames, currentMs, width, height, metrics }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !width || !height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const f = frameForTime(frames, currentMs);
    if (!f?.landmarks?.length) return;
    drawPoseOnCanvas(ctx, f.landmarks, width, height, {
      metricHealth: overallHealth(metrics),
    });
  }, [frames, currentMs, width, height, metrics]);

  if (!frames.length) return null;

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 h-full w-full"
      style={{ objectFit: "contain" }}
    />
  );
}
