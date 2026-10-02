import type { StoredAnalysis } from "@/lib/sessionStorage";
import { GOLF_SHOT_LABELS, type GolfShotType } from "@/types/swing";
import { averageLaunchShots } from "@/lib/clubFitting/averages";
import { FITTING_CATALOG } from "@/lib/clubFitting/catalog";
import {
  buildSpecRecommendations,
  deriveCatalogTags,
  fittingConfidence,
  shaftFlexFromSpeed,
} from "@/lib/clubFitting/rules";
import type {
  CatalogCategory,
  CatalogEntry,
  CatalogTag,
  ClubFittingReport,
  ModelSuggestion,
} from "@/lib/clubFitting/types";

function categoriesForShot(golfShotType: GolfShotType): CatalogCategory[] {
  switch (golfShotType) {
    case "driver":
      return ["driver", "shaft"];
    case "iron":
      return ["iron", "shaft"];
    case "wedge":
    case "chip":
      return ["wedge", "iron"];
  }
}

function scoreEntry(entry: CatalogEntry, wanted: CatalogTag[]): number {
  let score = 0;
  for (const t of wanted) {
    if (entry.tags.includes(t)) score += 2;
  }
  return score;
}

function pickModels(
  golfShotType: GolfShotType,
  wanted: CatalogTag[],
  limit = 4,
): ModelSuggestion[] {
  const cats = new Set(categoriesForShot(golfShotType));
  const ranked = FITTING_CATALOG.filter((e) => cats.has(e.category))
    .map((e) => ({ e, score: scoreEntry(e, wanted) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const out: ModelSuggestion[] = [];
  const seenCats = new Set<string>();
  for (const { e } of ranked) {
    if (out.length >= limit) break;
    // Prefer diversity across categories when possible
    const key = `${e.category}:${e.brand}`;
    if (seenCats.has(key) && out.length < limit - 1) continue;
    seenCats.add(key);
    out.push({
      id: e.id,
      brand: e.brand,
      model: e.model,
      category: e.category,
      why: e.blurb,
    });
  }

  if (out.length < 2) {
    for (const e of FITTING_CATALOG.filter((x) => cats.has(x.category))) {
      if (out.some((m) => m.id === e.id)) continue;
      out.push({
        id: e.id,
        brand: e.brand,
        model: e.model,
        category: e.category,
        why: e.blurb,
      });
      if (out.length >= limit) break;
    }
  }

  return out.slice(0, limit);
}

function buildSummary(params: {
  golfShotType: GolfShotType;
  hasLaunch: boolean;
  shotCount: number;
  flexHint?: string;
}): string {
  const label = GOLF_SHOT_LABELS[params.golfShotType];
  if (!params.hasLaunch) {
    return `Pose-based notes for your ${label} session are ready, but shaft flex, loft windows, and head bias need launch-monitor averages. Import a CSV to unlock a fuller fitting-style report.`;
  }
  return `Based on ${params.shotCount} launch-monitor shot${
    params.shotCount === 1 ? "" : "s"
  } and your ${label} Swing Lab metrics, these are illustrative starting specs${
    params.flexHint ? ` (flex leaning ${params.flexHint})` : ""
  }. Treat them as a conversation starter with a fitter — not a final build sheet.`;
}

function improveChecklist(hasLaunch: boolean, shotCount: number): string[] {
  const items: string[] = [];
  if (!hasLaunch) {
    items.push("Import a TrackMan, Garmin, or Rapsodo CSV from Swing Lab or on this page.");
  } else if (shotCount < 8) {
    items.push("Capture more monitored shots (ideally 8+) so averages stabilize.");
  }
  items.push("Re-check recommendations after a solid center-face session — mishits skew loft and spin.");
  items.push("Bring these bands to a fitter with a launch monitor; lie angle still needs height and turf feedback.");
  items.push("Match shaft tip feel to your tempo, not speed alone.");
  return items;
}

export function buildClubFittingReport(analysis: StoredAnalysis): ClubFittingReport {
  const golfShotType: GolfShotType = analysis.golfShotType ?? "driver";
  const averages = averageLaunchShots(analysis.launchData ?? []);
  const hasLaunchData = Boolean(averages);
  const shotCount = averages?.shotCount ?? 0;
  const confidence = fittingConfidence(shotCount, hasLaunchData);
  const specs = buildSpecRecommendations({
    golfShotType,
    metrics: analysis.metrics,
    averages,
  });
  const tags = deriveCatalogTags({ golfShotType, averages });
  const models = pickModels(golfShotType, tags);
  const flexHint = averages ? shaftFlexFromSpeed(averages.clubSpeedMph) : undefined;

  return {
    golfShotType,
    confidence,
    shotCount,
    hasLaunchData,
    summary: buildSummary({
      golfShotType,
      hasLaunch: hasLaunchData,
      shotCount,
      flexHint,
    }),
    specs,
    models,
    improveChecklist: improveChecklist(hasLaunchData, shotCount),
    averages,
  };
}
