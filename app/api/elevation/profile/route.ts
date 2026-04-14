import { NextResponse } from "next/server";
import { distanceMeters, interpolateGreatCircle, type LatLng } from "@/lib/geo";

const MIN_SAMPLES = 2;
const MAX_SAMPLES = 100;
const OPENTOPO_BATCH = "https://api.opentopodata.org/v1/srtm90m";

function validLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function validLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

type OpenTopoResult = {
  elevation: number | null;
  location?: { lat: number; lng: number };
};

type OpenTopoResponse = {
  results?: OpenTopoResult[];
  error?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat0 = Number(searchParams.get("lat0"));
  const lng0 = Number(searchParams.get("lng0"));
  const lat1 = Number(searchParams.get("lat1"));
  const lng1 = Number(searchParams.get("lng1"));
  const rawSamples = searchParams.get("samples");
  const samples = rawSamples == null ? 48 : Number(rawSamples);

  if (!validLat(lat0) || !validLat(lat1) || !validLng(lng0) || !validLng(lng1)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  if (!Number.isFinite(samples) || samples < MIN_SAMPLES || samples > MAX_SAMPLES) {
    return NextResponse.json(
      { error: `samples must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}` },
      { status: 400 },
    );
  }

  const a: LatLng = { lat: lat0, lng: lng0 };
  const b: LatLng = { lat: lat1, lng: lng1 };
  const distM = distanceMeters(lat0, lng0, lat1, lng1);
  const points = interpolateGreatCircle(a, b, samples - 1);

  const locParam = points.map((p) => `${p.lat},${p.lng}`).join("|");
  let ot: OpenTopoResponse;
  try {
    const res = await fetch(`${OPENTOPO_BATCH}?locations=${encodeURIComponent(locParam)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Elevation service error (${res.status})`, detail: text.slice(0, 200) },
        { status: 502 },
      );
    }
    ot = (await res.json()) as OpenTopoResponse;
  } catch {
    return NextResponse.json({ error: "Could not reach elevation service" }, { status: 502 });
  }

  if (ot.error || !ot.results?.length) {
    return NextResponse.json(
      { error: ot.error ?? "No elevation results" },
      { status: 502 },
    );
  }

  const outSamples = points.map((p, i) => {
    const elev = ot.results![i]?.elevation;
    const t = i / Math.max(1, points.length - 1);
    return {
      t,
      lat: p.lat,
      lng: p.lng,
      elevationM: elev == null || !Number.isFinite(elev) ? null : elev,
    };
  });

  return NextResponse.json({
    distanceM: distM,
    samples: outSamples,
  });
}
