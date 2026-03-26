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
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
  ];

  let lastError: string | null = null;
  let list: NearbyCourseSuggestion[] = [];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "JustSwangin/1.0 (scorecard-nearby)",
          "Accept-Language": "en",
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = `Overpass ${endpoint} error: ${response.status}`;
        continue;
      }

      const payload = (await response.json()) as { elements?: OverpassElement[] };
      list = (payload.elements ?? [])
        .map((el) => mapOsmToSuggestion(el, lat, lng))
        .filter((x): x is NearbyCourseSuggestion => Boolean(x));

      if (list.length > 0) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Overpass request failed";
    }
  }

  if (list.length === 0 && lastError) {
    throw new Error(lastError);
  }

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

type NominatimItem = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
};

async function fetchNominatimNearby(
  lat: number,
  lng: number,
): Promise<NearbyCourseSuggestion[]> {
  // Approximate ~0.35 deg box around user location (~20-25mi, depends on latitude)
  const latDelta = 0.35;
  const lngDelta = 0.45;
  const left = lng - lngDelta;
  const right = lng + lngDelta;
  const top = lat + latDelta;
  const bottom = lat - latDelta;

  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: "golf course",
      format: "jsonv2",
      bounded: "1",
      limit: "20",
      viewbox: `${left},${top},${right},${bottom}`,
      addressdetails: "0",
    }).toString();

  const response = await fetch(url, {
    headers: {
      "User-Agent": "JustSwangin/1.0 (scorecard-nearby)",
      "Accept-Language": "en",
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);
  const items = (await response.json()) as NominatimItem[];

  const mapped = items
    .map((it) => {
      const nlat = Number(it.lat);
      const nlng = Number(it.lon);
      if (!Number.isFinite(nlat) || !Number.isFinite(nlng)) return null;

      const name = (it.name || it.display_name.split(",")[0] || "Golf Course").trim();
      const local = findBestLocalCourseMatch(name);
      return {
        courseId: local?.courseId ?? `nominatim-${it.place_id}`,
        name,
        city: local?.city ?? "",
        state: local?.state ?? "",
        country: local?.country ?? "",
        latitude: nlat,
        longitude: nlng,
        distanceMiles: distanceMiles(lat, lng, nlat, nlng),
        source: local ? ("seed" as const) : ("osm" as const),
        hasScorecard: Boolean(local),
      } satisfies NearbyCourseSuggestion;
    })
    .filter((x): x is NearbyCourseSuggestion => Boolean(x))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);

  return mapped;
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
    let osm: NearbyCourseSuggestion[] = [];
    try {
      osm = await fetchOverpassNearby(lat, lng, radiusMeters);
    } catch {
      // try second free source before falling back to seeds
      osm = await fetchNominatimNearby(lat, lng);
    }
    const fallbackLocal = localCoursesAsNearbySuggestions(lat, lng);

    const combined = [...osm, ...fallbackLocal]
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .filter((item, idx, arr) => idx === arr.findIndex((x) => x.courseId === item.courseId))
      .slice(0, maxItems);

    return NextResponse.json({
      courses: combined,
      source: osm.length ? "osm+seed" : "seed-fallback",
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
