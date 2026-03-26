"use client";

import { Pose } from "@mediapipe/pose";
import type { Landmark, PoseFrame } from "@/types/swing";

function toLandmarks(raw: { x: number; y: number; z: number; visibility?: number }[]): Landmark[] {
  return raw.map((l) => ({
    x: l.x,
    y: l.y,
    z: l.z,
    visibility: l.visibility,
  }));
}

/**
 * Sample video with MediaPipe Pose (browser only). WASM/assets load from jsDelivr CDN.
 * Uses a static import so Next.js does not emit a separate lazy chunk (which can 404 in dev).
 */
export async function extractPoseFromVideo(
  objectUrl: string,
  sampleFps = 24,
): Promise<PoseFrame[]> {
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video"));
  });

  const duration = Math.max(0.1, video.duration);
  const canvas = document.createElement("canvas");
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  const pose = new Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  const frames: PoseFrame[] = [];
  let settle: ((lm: Landmark[] | null) => void) | null = null;

  pose.onResults((results) => {
    const lm = results.poseLandmarks
      ? toLandmarks(results.poseLandmarks as { x: number; y: number; z: number; visibility?: number }[])
      : null;
    const fn = settle;
    settle = null;
    fn?.(lm);
  });

  const step = 1 / sampleFps;
  for (let t = 0; t < duration; t += step) {
    video.currentTime = Math.min(t, duration - 0.04);
    await new Promise<void>((r) => {
      video.onseeked = () => r();
    });
    ctx.drawImage(video, 0, 0, w, h);

    const landmarks = await new Promise<Landmark[] | null>((resolve) => {
      const to = window.setTimeout(() => {
        settle = null;
        resolve(null);
      }, 8000);
      settle = (lm) => {
        window.clearTimeout(to);
        resolve(lm);
      };
      pose.send({ image: canvas });
    });

    if (landmarks && landmarks.length >= 29) {
      frames.push({ t: t * 1000, landmarks });
    }
  }

  return frames.length ? frames : [];
}
