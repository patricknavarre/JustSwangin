import type { GolfShotType, ShotShape } from "@/types/swing";

export type FittingConfidence = "high" | "medium" | "limited";

export type HeadBias = "neutral" | "draw-biased" | "fade-biased";

export type ShaftFlex = "senior" | "regular" | "stiff" | "x-stiff";

export type CatalogCategory = "driver" | "iron" | "wedge" | "shaft";

export type CatalogTag =
  | ShaftFlex
  | HeadBias
  | "lightweight"
  | "midweight"
  | "heavy"
  | "high-launch"
  | "mid-launch"
  | "low-spin"
  | "mid-spin"
  | "game-improvement"
  | "players"
  | "players-distance";

export interface LaunchAverages {
  clubSpeedMph: number;
  ballSpeedMph: number;
  smashFactor: number;
  launchAngleDeg: number;
  spinRateRpm: number;
  clubPathDeg: number;
  faceAngleDeg: number;
  attackAngleDeg: number;
  carryYards: number;
  dominantShape: ShotShape | null;
  shotCount: number;
}

export interface SpecRecommendation {
  id: string;
  title: string;
  value: string;
  detail: string;
  /** Whether this row used launch-monitor numbers. */
  requiresLaunch: boolean;
}

export interface ModelSuggestion {
  id: string;
  brand: string;
  model: string;
  category: CatalogCategory;
  why: string;
}

export interface CatalogEntry {
  id: string;
  brand: string;
  model: string;
  category: CatalogCategory;
  tags: CatalogTag[];
  blurb: string;
}

export interface ClubFittingReport {
  golfShotType: GolfShotType;
  confidence: FittingConfidence;
  shotCount: number;
  hasLaunchData: boolean;
  summary: string;
  specs: SpecRecommendation[];
  models: ModelSuggestion[];
  improveChecklist: string[];
  averages: LaunchAverages | null;
}
