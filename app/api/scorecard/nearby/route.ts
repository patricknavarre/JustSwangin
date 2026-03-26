import { NextResponse } from "next/server";
import {
  findBestLocalCourseMatch,
  localCoursesAsNearbySuggestions,
  distanceMiles,
} from "@/lib/scorecards";
import type { NearbyCourseSuggestion } from "@/types/scorecard";

export const runtime = "nodejs";

interface OverpassElement {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function toNumber(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function locationFromElement(el: OverpassElement): { lat: number; lng: number } | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return { lat: el.lat, lng: el.lon };
  }
  if (el.center && typeof el.center.lat === "number" && typeof el.center.lon === "number") {
    return { lat: el.center.lat, lng: el.center.lon };
  }
  return null;
}

function mapOsmToSuggestion(
  el: OverpassElement,
  userLat: number,
  userLng: number,
): NearbyCourseSuggestion | null {
  const loc = locationFromElement(el);
  if (!loc) return null;

  const name = el.tags?.name?.trim();
  if (!name) return null;

  const local = findBestLocalCourseMatch(name);
  const city = el.tags?.["addr:city"] ?? local?.city ?? "";
  const state = el.tags?.["addr:state"] ?? local?.state ?? "";
  const country = el.tags?.["addr:country"] ?? local?.country ?? "";

  return {
    courseId: local?.courseId ?? `osm-${el.type}-${el.id}`,
    name,
    city,
    state,
    country,
    latitude: loc.lat,
    longitude: loc.lng,
    distanceMiles: distanceMiles(userLat, userLng, loc.lat, loc.lng),
    source: local ? "seed" : "osm",
    hasScorecard: Boolean(local),
  };
}

async function fetchOverpassNearby(
  lat: number,
  lng: number,
  radiusMeters: number,
): Promise<NearbyCourseSuggestion[]> {
  const query = `[out:json][timeout:15];(node[\"leisure\"=\"golf_course\"](around:${radiusMeters},${lat},${lng});way[\"leisure\"=\"golf_course\"](around:${radiusMeters},${lat},${lng});relation[\"leisure\"=\"golf_course\"](around:${radiusMeters},${lat},${lng}););out center tags;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "JustSwangin/1.0 (scorecard-nearby)",
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const list = (payload.elements ?? [])
    .map((el) => mapOsmToSuggestion(el, lat, lng))
    .filter((x): x is NearbyCourseSuggestion => Boolean(x));

  const dedup = new Map<string, NearbyCourseSuggestion>();
  for (const item of list) {
    const key = `${item.name.toLowerCase()}-${Math.round(item.latitude * 1000)}-${Math.round(item.longitude * 1000)}`;
    const existing = dedup.get(key);
    if (!existing || item.hasScorecard) {
      dedup.set(key, item);
    }
  }

  return Array.from(dedup.values()).sort((a, b) => a.distanceMiles - b.distanceMiles);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = toNumber(searchParams.get("lat"));
  const lng = toNumber(searchParams.get("lng"));
  const radiusMiles = toNumber(searchParams.get("radiusMiles")) ?? 15;
  const limit = toNumber(searchParams.get("limit")) ?? 8;

  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "invalid lat/lng range" }, { status: 400 });
  }

  const radiusMeters = Math.max(2000, Math.min(80000, Math.round(radiusMiles * 1609.34)));
  const maxItems = Math.max(1, Math.min(20, Math.round(limit)));

  try {
    const osm = await fetchOverpassNearby(lat, lng, radiusMeters);
    const fallbackLocal = localCoursesAsNearbySuggestions(lat, lng);

    const combined = [...osm, ...fallbackLocal]
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .filter((item, idx, arr) => idx === arr.findIndex((x) => x.courseId === item.courseId))
      .slice(0, maxItems);

    return NextResponse.json({
      courses: combined,
      source: "osm+seed",
      radiusMiles,
    });
  } catch (error) {
    const local = localCoursesAsNearbySuggestions(lat, lng).slice(0, maxItems);
    return NextResponse.json({
      courses: local,
      source: "seed-fallback",
      warning: error instanceof Error ? error.message : "Failed to fetch OSM courses",
    });
  }
}
