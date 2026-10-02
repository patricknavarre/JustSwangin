import type { GolfShotType, SwingMetrics } from "@/types/swing";
import type {
  CatalogTag,
  FittingConfidence,
  HeadBias,
  LaunchAverages,
  ShaftFlex,
  SpecRecommendation,
} from "@/lib/clubFitting/types";

export function shaftFlexFromSpeed(mph: number): ShaftFlex {
  if (mph < 85) return "senior";
  if (mph < 95) return "regular";
  if (mph < 105) return "stiff";
  return "x-stiff";
}

export function shaftWeightLabel(flex: ShaftFlex): string {
  switch (flex) {
    case "senior":
      return "lightweight (~40–55g driver / ~50–65g iron)";
    case "regular":
      return "midweight (~50–65g driver / ~70–90g iron)";
    case "stiff":
      return "mid-to-heavy (~60–75g driver / ~90–110g iron)";
    case "x-stiff":
      return "heavy (~70g+ driver / ~105g+ iron)";
  }
}

export function flexLabel(flex: ShaftFlex): string {
  switch (flex) {
    case "senior":
      return "Senior / A-flex";
    case "regular":
      return "Regular";
    case "stiff":
      return "Stiff";
    case "x-stiff":
      return "X-Stiff";
  }
}

/** Driver-style launch/spin windows by club speed (illustrative fitting bands). */
export function driverTargets(mph: number): {
  launchMin: number;
  launchMax: number;
  spinMin: number;
  spinMax: number;
  loftMin: number;
  loftMax: number;
} {
  if (mph < 90) {
    return { launchMin: 13, launchMax: 16, spinMin: 2400, spinMax: 3200, loftMin: 10.5, loftMax: 12.5 };
  }
  if (mph < 100) {
    return { launchMin: 12, launchMax: 15, spinMin: 2200, spinMax: 2800, loftMin: 9.5, loftMax: 11.5 };
  }
  if (mph < 110) {
    return { launchMin: 10, launchMax: 14, spinMin: 2000, spinMax: 2600, loftMin: 8.5, loftMax: 10.5 };
  }
  return { launchMin: 9, launchMax: 13, spinMin: 1800, spinMax: 2400, loftMin: 7.5, loftMax: 9.5 };
}

export function ironLoftNote(mph: number): string {
  if (mph < 80) {
    return "Stronger lofts with higher launch heads can help; prioritize forgiveness over blade workability.";
  }
  if (mph < 90) {
    return "Game-improvement or players-distance cavities with standard progressive lofts usually fit best.";
  }
  return "Players or players-distance heads; avoid ultra-strong loft jumps unless spin stays healthy.";
}

export function headBiasFromLaunch(av: LaunchAverages): HeadBias {
  const path = av.clubPathDeg;
  const face = av.faceAngleDeg;
  const shape = av.dominantShape;

  if (shape === "fade" || shape === "push" || (path < -1.5 && face <= path + 1)) {
    return "draw-biased";
  }
  if (shape === "draw" || shape === "pull" || (path > 1.5 && face >= path - 1)) {
    return "fade-biased";
  }
  return "neutral";
}

export function headBiasLabel(bias: HeadBias): string {
  switch (bias) {
    case "draw-biased":
      return "Draw-biased / higher MOI";
    case "fade-biased":
      return "Neutral-to-fade / lower CG options";
    case "neutral":
      return "Neutral bias";
  }
}

export function fittingConfidence(shotCount: number, hasLaunch: boolean): FittingConfidence {
  if (!hasLaunch) return "limited";
  if (shotCount >= 8) return "high";
  if (shotCount >= 3) return "medium";
  return "limited";
}

export function tempoNote(metrics: SwingMetrics): SpecRecommendation {
  const tempo = metrics.tempoRatio;
  const tempoDev = metrics.deviations.find((d) => /tempo/i.test(d.name));
  let detail: string;
  if (tempo >= 2.5 && tempo <= 3.5) {
    detail =
      "Your backswing-to-downswing timing sits near a classic ~3:1 window — that usually pairs well with midweight shafts that load without feeling whippy.";
  } else if (tempo < 2.5) {
    detail =
      "A quicker transition often prefers slightly firmer tips / stiffer flex than raw speed alone suggests, so you don’t over-load a soft shaft.";
  } else {
    detail =
      "A longer tempo can tolerate slightly softer flex or lighter weight for smoother loading — confirm with smash and launch on a monitor.";
  }
  if (tempoDev?.status === "needsWork") {
    detail += ` Pose also flagged tempo (${tempoDev.value.toFixed(2)} vs ideal ~${tempoDev.benchmarkIdeal}).`;
  }
  return {
    id: "tempo",
    title: "Tempo & shaft feel",
    value: `${tempo.toFixed(2)} : 1`,
    detail,
    requiresLaunch: false,
  };
}

export function buildSpecRecommendations(params: {
  golfShotType: GolfShotType;
  metrics: SwingMetrics;
  averages: LaunchAverages | null;
}): SpecRecommendation[] {
  const { golfShotType, metrics, averages } = params;
  const specs: SpecRecommendation[] = [tempoNote(metrics)];

  if (!averages) {
    specs.push({
      id: "shaft-flex",
      title: "Shaft flex / weight",
      value: "Need club speed",
      detail:
        "Import a launch-monitor CSV (or re-run Swing Lab with one) so we can map club speed to flex and weight bands.",
      requiresLaunch: true,
    });
    specs.push({
      id: "loft-launch",
      title: "Loft & launch window",
      value: "Need launch data",
      detail:
        "Loft, launch angle, and spin recommendations need session averages from TrackMan / Garmin / Rapsodo.",
      requiresLaunch: true,
    });
    specs.push({
      id: "head-bias",
      title: "Head profile",
      value: "Need path / face",
      detail: "Path, face, and shot-shape averages drive draw- vs fade-biased head suggestions.",
      requiresLaunch: true,
    });
    return specs;
  }

  const mph = averages.clubSpeedMph;
  const flex = shaftFlexFromSpeed(mph);
  specs.push({
    id: "shaft-flex",
    title: "Shaft flex / weight",
    value: `${flexLabel(flex)} · ${shaftWeightLabel(flex)}`,
    detail: `Based on ~${Math.round(mph)} mph club speed across ${averages.shotCount} shot${
      averages.shotCount === 1 ? "" : "s"
    }. Confirm on a board with tip stiffness and kick point — speed bands are a starting point.`,
    requiresLaunch: true,
  });

  if (golfShotType === "driver") {
    const t = driverTargets(mph);
    const loftHint =
      averages.launchAngleDeg < t.launchMin
        ? "Your launch is low vs this speed band — consider more loft or a higher-launch shaft."
        : averages.launchAngleDeg > t.launchMax
          ? "Your launch is high vs this speed band — consider less loft or a lower-launch/lower-spin shaft."
          : "Launch sits near the fitting window for this speed.";
    const spinHint =
      averages.spinRateRpm < t.spinMin
        ? " Spin looks low — avoid ultra-low-spin heads unless smash stays high."
        : averages.spinRateRpm > t.spinMax
          ? " Spin looks high — look for lower-spin heads / shafts or slightly less loft."
          : " Spin is in a productive window.";

    specs.push({
      id: "loft-launch",
      title: "Loft & launch / spin targets",
      value: `${t.loftMin}–${t.loftMax}° loft · launch ${t.launchMin}–${t.launchMax}° · spin ${t.spinMin}–${t.spinMax} rpm`,
      detail: `Your averages: launch ${averages.launchAngleDeg.toFixed(1)}°, spin ${Math.round(
        averages.spinRateRpm,
      )} rpm, AoA ${averages.attackAngleDeg.toFixed(1)}°. ${loftHint}${spinHint}`,
      requiresLaunch: true,
    });
  } else if (golfShotType === "iron" || golfShotType === "wedge") {
    const note = ironLoftNote(mph);
    specs.push({
      id: "loft-launch",
      title: golfShotType === "wedge" ? "Wedge / iron loft notes" : "Iron loft & profile",
      value: note.length > 56 ? `${note.slice(0, 56)}…` : note,
      detail: `${note} Session: ~${Math.round(mph)} mph, launch ${averages.launchAngleDeg.toFixed(
        1,
      )}°, spin ${Math.round(averages.spinRateRpm)} rpm, AoA ${averages.attackAngleDeg.toFixed(1)}°.`,
      requiresLaunch: true,
    });
  } else {
    specs.push({
      id: "loft-launch",
      title: "Short-game equipment",
      value: "Feel & bounce over loft charts",
      detail:
        "Chip/pitch sessions are about contact and bounce more than driver loft windows. Use a trusted wedge grind for your turf; launch CSV still helps verify spin.",
      requiresLaunch: true,
    });
  }

  const bias = headBiasFromLaunch(averages);
  specs.push({
    id: "head-bias",
    title: "Head profile",
    value: headBiasLabel(bias),
    detail: `Path ~${averages.clubPathDeg.toFixed(1)}°, face ~${averages.faceAngleDeg.toFixed(1)}°${
      averages.dominantShape ? `, dominant shape ${averages.dominantShape}` : ""
    }. Bias suggestions stabilize miss patterns — a fitter should verify on turf.`,
    requiresLaunch: true,
  });

  specs.push({
    id: "efficiency",
    title: "Energy transfer",
    value: `Smash ~${averages.smashFactor.toFixed(2)} · carry ~${Math.round(averages.carryYards)} yds`,
    detail:
      averages.smashFactor < 1.4 && golfShotType === "driver"
        ? "Smash is soft for a driver — prioritize centered strike and shaft that loads with your tempo before chasing exotic lofts."
        : "Smash and carry look usable as a baseline; keep them stable when you change loft or shaft.",
    requiresLaunch: true,
  });

  return specs;
}

/** Tags used to filter the static model catalog. */
export function deriveCatalogTags(params: {
  golfShotType: GolfShotType;
  averages: LaunchAverages | null;
}): CatalogTag[] {
  const { golfShotType, averages } = params;
  const tags: CatalogTag[] = [];

  if (golfShotType === "driver") tags.push("high-launch");
  if (golfShotType === "iron") tags.push("game-improvement");
  if (golfShotType === "wedge" || golfShotType === "chip") tags.push("mid-spin");

  if (!averages) {
    tags.push("regular", "midweight", "neutral", "mid-launch");
    return tags;
  }

  const flex = shaftFlexFromSpeed(averages.clubSpeedMph);
  tags.push(flex);
  if (flex === "senior" || flex === "regular") tags.push("lightweight");
  else if (flex === "stiff") tags.push("midweight");
  else tags.push("heavy");

  const bias = headBiasFromLaunch(averages);
  tags.push(bias);

  if (golfShotType === "driver") {
    const t = driverTargets(averages.clubSpeedMph);
    if (averages.launchAngleDeg < t.launchMin) tags.push("high-launch");
    else tags.push("mid-launch");
    if (averages.spinRateRpm > t.spinMax) tags.push("low-spin");
    else tags.push("mid-spin");
  }

  if (golfShotType === "iron") {
    if (averages.clubSpeedMph >= 90) {
      tags.push("players-distance");
    } else {
      tags.push("game-improvement");
    }
  }

  return Array.from(new Set(tags));
}
