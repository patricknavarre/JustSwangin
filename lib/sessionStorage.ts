import type {
  CameraAngle,
  CoachingApiResponse,
  GolfShotType,
  LaunchMonitorShot,
  PoseFrame,
  SwingSport,
  SwingMetrics,
  SwingPhase,
} from "@/types/swing";

export const STORAGE_KEY = "justswangin-analysis";

export interface StoredAnalysis {
  sport?: SwingSport;
  /** Golf Swing Lab only; omitted in older saved sessions → treat as driver. */
  golfShotType?: GolfShotType;
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
  saveAnalysisForKey(STORAGE_KEY, data);
}

export function saveAnalysisForKey(storageKey: string, data: StoredAnalysis): void {
  try {
    const payload = {
      ...data,
      frames: thinFrames(data.frames, 100),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    const { frames, ...rest } = data;
    void frames;
    sessionStorage.setItem(storageKey, JSON.stringify({ ...rest, frames: [] }));
  }
}

export function loadAnalysis(): StoredAnalysis | null {
  return loadAnalysisForKey(STORAGE_KEY);
}

export function loadAnalysisForKey(storageKey: string): StoredAnalysis | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAnalysis;
  } catch {
    return null;
  }
}
