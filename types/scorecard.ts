export interface ScorecardHole {
  holeNumber: number;
  par: number;
  yardage: number;
  handicap?: number;
}

export interface ScorecardTee {
  teeId: string;
  name: string;
  color?: string;
  rating?: number;
  slope?: number;
  front9Yards: number;
  back9Yards: number;
  totalYards: number;
}

export interface CourseScorecard {
  courseId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  holes: ScorecardHole[];
  tees: ScorecardTee[];
}

export interface ScorecardCourseSummary {
  courseId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface NearbyCourseSuggestion extends ScorecardCourseSummary {
  distanceMiles: number;
  source: "seed" | "osm";
  hasScorecard: boolean;
}
