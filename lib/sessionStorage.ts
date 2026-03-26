import type {
  CameraAngle,
  CoachingApiResponse,
  LaunchMonitorShot,
  PoseFrame,
  SwingMetrics,
  SwingPhase,
} from "@/types/swing";

export const STORAGE_KEY = "justswangin-analysis";

export interface StoredAnalysis {
  cameraAngle: CameraAngle;
  videoUrl: string;
  frames: PoseFrame[];
  metrics: SwingMetrics;
  phases: SwingPhase[];
  coaching?: CoachingApiResponse;
  launchData?: LaunchMonitorShot[];
}

export function thinFrames(frames: PoseFrame[], max = 100): PoseFrame[] {
  if (frames.length <= max) return frames;
  const step = Math.ceil(frames.length / max);
  return frames.filter((_, i) => i % step === 0);
}

export function saveAnalysis(data: StoredAnalysis): void {
  try {
    const payload = {
      ...data,
      frames: thinFrames(data.frames, 100),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    const { frames, ...rest } = data;
    void frames;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, frames: [] }));
  }
}

export function loadAnalysis(): StoredAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAnalysis;
  } catch {
    return null;
  }
}
