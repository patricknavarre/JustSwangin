import courses from "./courses.json";
import type {
  CourseScorecard,
  NearbyCourseSuggestion,
  ScorecardCourseSummary,
} from "@/types/scorecard";

const courseData = courses as CourseScorecard[];

export function listScorecardCourses(): ScorecardCourseSummary[] {
  return courseData.map((c) => ({
    courseId: c.courseId,
    name: c.name,
    city: c.city,
    state: c.state,
    country: c.country,
    latitude: c.latitude,
    longitude: c.longitude,
  }));
}

export function getCourseScorecard(courseId: string): CourseScorecard | undefined {
  return courseData.find((c) => c.courseId === courseId);
}

export function normalizeCourseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(golf|course|club|country|resort|links|the|stadium|municipal)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findBestLocalCourseMatch(name: string): CourseScorecard | undefined {
  const normalized = normalizeCourseName(name);
  if (!normalized) return undefined;

  const exact = courseData.find((c) => normalizeCourseName(c.name) === normalized);
  if (exact) return exact;

  return courseData.find((c) => {
    const local = normalizeCourseName(c.name);
    return local.includes(normalized) || normalized.includes(local);
  });
}

export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function localCoursesAsNearbySuggestions(
  lat: number,
  lng: number,
): NearbyCourseSuggestion[] {
  return courseData
    .map((c) => ({
      courseId: c.courseId,
      name: c.name,
      city: c.city,
      state: c.state,
      country: c.country,
      latitude: c.latitude,
      longitude: c.longitude,
      distanceMiles: distanceMiles(lat, lng, c.latitude, c.longitude),
      source: "seed" as const,
      hasScorecard: true,
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
