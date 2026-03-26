import type { CameraAngle, LaunchMonitorShot, SwingMetrics, SwingSport } from "@/types/swing";

export function buildCoachingPrompt(params: {
  cameraAngle: CameraAngle;
  handicap?: number;
  metrics: SwingMetrics;
  launchData?: LaunchMonitorShot[];
  sport?: SwingSport;
}): string {
  const { cameraAngle, handicap, metrics, launchData, sport } = params;
  const isBat = sport === "baseball-softball";
  const coachRole = isBat ? "baseball and softball hitting biomechanics coach" : "golf biomechanics coach";
  const intro = isBat
    ? "Analyze the following hitting swing metrics and provide a prioritized coaching report."
    : "Analyze the following swing metrics and provide a prioritized coaching report.";
  const launchLabel = isBat
    ? "OPTIONAL BALL-FLIGHT DATA (if provided, session summary):"
    : "LAUNCH MONITOR DATA (TrackMan/Garmin/Rapsodo CSV — session summary):";
  const metricsJson = JSON.stringify(metrics, null, 2);
  const launchDataJson =
    launchData && launchData.length
      ? JSON.stringify(
          {
            shotCount: launchData.length,
            averages: averageLaunchShots(launchData),
          },
          null,
          2,
        )
      : "Not provided";

  return `You are an expert ${coachRole}. ${intro}

Camera angle: ${cameraAngle}
Sport: ${isBat ? "Baseball/Softball" : "Golf"}
Player handicap: ${handicap ?? "unknown"}

SWING METRICS (deviation from research benchmarks):
${metricsJson}

${launchLabel}
${launchDataJson}

Respond with valid JSON only (no markdown fences), matching this TypeScript shape:
{
  "report": {
    "criticalFixes": [
      { "issue": string, "whyItMatters": string, "drill": string, "launchDataNote"?: string }
    ],
    "secondaryAdjustments": [{ "issue": string, "suggestion": string }],
    "positives": string[],
    "lessonFocusSummary": string
  },
  "summary": string,
  "drills": [{ "title": string, "description": string, "relatedMetric"?: string }]
}

Rules:
- Top 3 priority fixes (most impact first), each with issue, why it matters, one drill, and if launch data exists reference numbers (e.g. "your -4.2° club path confirms...").
- Two secondary adjustments.
- Two things the player is doing well.
- summary: one paragraph overview.
- drills: 3–5 actionable drills aligned to issues.
Be specific, encouraging, and practical. Avoid unexplained jargon.`;
}

function averageLaunchShots(shots: LaunchMonitorShot[]) {
  const n = shots.length || 1;
  const sum = (k: keyof LaunchMonitorShot) =>
    shots.reduce((a, s) => a + (typeof s[k] === "number" ? (s[k] as number) : 0), 0) / n;
  return {
    clubSpeedMph: sum("clubSpeedMph"),
    ballSpeedMph: sum("ballSpeedMph"),
    smashFactor: sum("smashFactor"),
    launchAngleDeg: sum("launchAngleDeg"),
    spinRateRpm: sum("spinRateRpm"),
    clubPathDeg: sum("clubPathDeg"),
    faceAngleDeg: sum("faceAngleDeg"),
    attackAngleDeg: sum("attackAngleDeg"),
    carryYards: sum("carryYards"),
  };
}
