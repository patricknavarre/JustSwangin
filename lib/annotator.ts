import type { Landmark } from "@/types/swing";

/** Subset of MediaPipe pose topology for limbs (avoid importing WASM package in shared code). */
const BODY_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [24, 26],
  [25, 27],
  [26, 28],
];

const COLORS = {
  good: "#6B9E7A",
  borderline: "#C4A962",
  bad: "#B85C5C",
  bone: "rgba(245, 241, 232, 0.85)",
} as const;

function statusColor(status: "good" | "borderline" | "needsWork"): string {
  if (status === "good") return COLORS.good;
  if (status === "borderline") return COLORS.borderline;
  return COLORS.bad;
}

/** Draw pose skeleton; optional per-connection tint from aggregate metric health. */
export function drawPoseOnCanvas(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  width: number,
  height: number,
  options?: { metricHealth?: "good" | "borderline" | "needsWork" },
): void {
  const tint = options?.metricHealth ? statusColor(options.metricHealth) : COLORS.bone;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = tint;
  ctx.fillStyle = tint;

  for (const conn of BODY_CONNECTIONS) {
    const a = landmarks[conn[0]];
    const b = landmarks[conn[1]];
    if (!a || !b || (a.visibility ?? 1) < 0.3 || (b.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }

  for (const lm of landmarks) {
    if ((lm.visibility ?? 1) < 0.3) continue;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
