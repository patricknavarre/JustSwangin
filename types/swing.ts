export type CameraAngle = "face-on" | "down-the-line";
export type SwingSport = "golf" | "baseball-softball";

/** MediaPipe-compatible landmark (normalized 0–1 image space). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseFrame {
  t: number;
  landmarks: Landmark[];
}

export type SwingPhaseName =
  | "address"
  | "takeaway"
  | "top"
  | "downswing"
  | "impact"
  | "followThrough";

export interface SwingPhase {
  name: SwingPhaseName;
  startMs: number;
  endMs: number;
}

export interface MetricDeviation {
  name: string;
  value: number;
  unit: string;
  benchmarkMin: number;
  benchmarkIdeal: number;
  benchmarkMax: number;
  status: "good" | "borderline" | "needsWork";
}

export interface SwingMetrics {
  hipShoulderSeparationAtImpactDeg: number;
  spineTiltAtAddressDeg: number;
  kneeFlexAtAddressDeg: number;
  leadArmExtensionAtTopDeg: number;
  hipRotationBackswingDeg: number;
  hipRotationFollowThroughDeg: number;
  tempoRatio: number;
  headLateralMovementIn: number;
  deviations: MetricDeviation[];
}

export interface Drill {
  title: string;
  description: string;
  relatedMetric?: string;
}

export interface CoachingReportData {
  criticalFixes: {
    issue: string;
    whyItMatters: string;
    drill: string;
    launchDataNote?: string;
  }[];
  secondaryAdjustments: { issue: string; suggestion: string }[];
  positives: string[];
  lessonFocusSummary: string;
}

export interface CoachingApiResponse {
  report: CoachingReportData;
  summary: string;
  drills: Drill[];
}

export interface AnalyzeApiRequest {
  videoId?: string;
  cameraAngle: CameraAngle;
  frames: PoseFrame[];
  metrics: SwingMetrics;
  phases: SwingPhase[];
  annotatedVideoUrl?: string;
}

export interface AnalyzeApiResponse {
  frames: PoseFrame[];
  metrics: SwingMetrics;
  phases: SwingPhase[];
  annotatedVideoUrl?: string;
}

export type ShotShape =
  | "draw"
  | "fade"
  | "straight"
  | "pull"
  | "push";

export interface LaunchMonitorShot {
  club: string;
  clubSpeedMph: number;
  ballSpeedMph: number;
  smashFactor: number;
  launchAngleDeg: number;
  spinRateRpm: number;
  clubPathDeg: number;
  faceAngleDeg: number;
  attackAngleDeg: number;
  carryYards: number;
  shotShape: ShotShape;
}
