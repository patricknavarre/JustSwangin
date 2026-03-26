import type {
  CameraAngle,
  Landmark,
  PoseFrame,
  SwingMetrics,
  SwingPhase,
  SwingPhaseName,
  MetricDeviation,
} from "@/types/swing";
import { SWING_BENCHMARKS as BENCH, metricStatus } from "@/lib/benchmarks";

const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleAtB(a: Landmark, b: Landmark, c: Landmark): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const d1 = Math.hypot(v1x, v1y);
  const d2 = Math.hypot(v2x, v2y);
  if (d1 < 1e-6 || d2 < 1e-6) return 0;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (d1 * d2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function lineAngleDeg(p: Landmark, q: Landmark): number {
  return (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
}

function hipLineRotationDeg(lm: Landmark[]): number {
  const lx = lm[LM.lHip].x;
  const rx = lm[LM.rHip].x;
  const ly = lm[LM.lHip].y;
  const ry = lm[LM.rHip].y;
  return (Math.atan2(ry - ly, rx - lx) * 180) / Math.PI;
}

function shoulderLineRotationDeg(lm: Landmark[]): number {
  return lineAngleDeg(lm[LM.lShoulder], lm[LM.rShoulder]);
}

/** Approximate hip–shoulder separation (degrees) in the image plane at a frame. */
function hipShoulderSeparationDeg(lm: Landmark[]): number {
  return Math.abs(shoulderLineRotationDeg(lm) - hipLineRotationDeg(lm));
}

function headLateralInches(frames: PoseFrame[], shoulderWidthInches = 14): number {
  let minX = 1;
  let maxX = 0;
  let shoulderW = 0.001;
  for (const f of frames) {
    const lm = f.landmarks;
    const nx = lm[LM.nose]?.x ?? 0.5;
    minX = Math.min(minX, nx);
    maxX = Math.max(maxX, nx);
    shoulderW = Math.max(shoulderW, dist(lm[LM.lShoulder], lm[LM.rShoulder]));
  }
  const headRangeNorm = maxX - minX;
  return (headRangeNorm / shoulderW) * shoulderWidthInches;
}

export function detectPhases(frames: PoseFrame[]): SwingPhase[] {
  if (frames.length < 8) {
    const end = frames.at(-1)?.t ?? 0;
    return [
      { name: "address", startMs: 0, endMs: end },
      { name: "followThrough", startMs: 0, endMs: end },
    ];
  }
  const leadWrist = LM.lWrist;

  let topIdx = 0;
  let minY = Infinity;
  const searchEnd = Math.floor(frames.length * 0.65);
  for (let i = 0; i < searchEnd; i++) {
    const y = frames[i].landmarks[leadWrist]?.y ?? 0.5;
    if (y < minY) {
      minY = y;
      topIdx = i;
    }
  }

  const addrEnd = Math.max(1, Math.floor(frames.length * 0.08));
  const takeawayEnd = Math.max(addrEnd + 1, Math.floor(topIdx * 0.85));
  const topStart = Math.max(takeawayEnd, topIdx - 2);
  const topEnd = Math.min(frames.length - 2, topIdx + 3);
  const impactIdx = Math.min(
    frames.length - 2,
    Math.floor(topIdx + (frames.length - topIdx) * 0.35),
  );
  const impactStart = Math.max(topEnd, impactIdx - 2);
  const impactEnd = Math.min(frames.length - 1, impactIdx + 3);
  const downStart = topEnd;
  const downEnd = impactStart;

  const phases: { name: SwingPhaseName; start: number; end: number }[] = [
    { name: "address", start: 0, end: addrEnd },
    { name: "takeaway", start: addrEnd, end: takeawayEnd },
    { name: "top", start: topStart, end: topEnd },
    { name: "downswing", start: downStart, end: downEnd },
    { name: "impact", start: impactStart, end: impactEnd },
    { name: "followThrough", start: impactEnd, end: frames.length - 1 },
  ];

  return phases.map((p) => ({
    name: p.name,
    startMs: frames[p.start].t,
    endMs: frames[p.end].t,
  }));
}

function frameAtPhase(frames: PoseFrame[], phases: SwingPhase[], name: SwingPhaseName): PoseFrame | undefined {
  const ph = phases.find((p) => p.name === name);
  if (!ph) return undefined;
  const mid = (ph.startMs + ph.endMs) / 2;
  let best = frames[0];
  let bestD = Infinity;
  for (const f of frames) {
    const d = Math.abs(f.t - mid);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

function avgPhaseFrames(frames: PoseFrame[], phases: SwingPhase[], name: SwingPhaseName): PoseFrame[] {
  const ph = phases.find((p) => p.name === name);
  if (!ph) return [];
  return frames.filter((f) => f.t >= ph.startMs && f.t <= ph.endMs);
}

export function computeSwingMetrics(
  frames: PoseFrame[],
  phases: SwingPhase[],
  cameraAngle: CameraAngle,
): SwingMetrics {
  const addressFrames = avgPhaseFrames(frames, phases, "address");
  const topFrame = frameAtPhase(frames, phases, "top");
  const impactFrame = frameAtPhase(frames, phases, "impact");
  const backFrames = avgPhaseFrames(frames, phases, "takeaway").concat(
    avgPhaseFrames(frames, phases, "top"),
  );
  const followFrames = avgPhaseFrames(frames, phases, "followThrough");

  const addrLm = addressFrames[0]?.landmarks ?? frames[0].landmarks;
  const kneeFlex =
    (angleAtB(addrLm[LM.lHip], addrLm[LM.lKnee], addrLm[LM.lAnkle]) +
      angleAtB(addrLm[LM.rHip], addrLm[LM.rKnee], addrLm[LM.rAnkle])) /
    2;

  const shoulderMid = {
    x: (addrLm[LM.lShoulder].x + addrLm[LM.rShoulder].x) / 2,
    y: (addrLm[LM.lShoulder].y + addrLm[LM.rShoulder].y) / 2,
  };
  const hipMid = {
    x: (addrLm[LM.lHip].x + addrLm[LM.rHip].x) / 2,
    y: (addrLm[LM.lHip].y + addrLm[LM.rHip].y) / 2,
  };
  const spineTilt = Math.abs(
    (Math.atan2(hipMid.y - shoulderMid.y, hipMid.x - shoulderMid.x) * 180) / Math.PI,
  );
  const spineTiltClamped = Math.min(55, Math.max(8, spineTilt));

  const topLm = topFrame?.landmarks ?? frames[Math.floor(frames.length * 0.3)].landmarks;
  const leadArmExt = angleAtB(
    topLm[LM.lShoulder],
    topLm[LM.lElbow],
    topLm[LM.lWrist],
  );
  const leadArmExtensionAtTopDeg = Math.min(180, 180 - leadArmExt + 5);

  const hipAtAddress = hipLineRotationDeg(addrLm);
  let maxHipBack = hipAtAddress;
  for (const f of backFrames) {
    const h = hipLineRotationDeg(f.landmarks);
    maxHipBack = cameraAngle === "face-on" ? Math.max(maxHipBack, h) : maxHipBack;
    maxHipBack = cameraAngle === "down-the-line" ? Math.max(maxHipBack, Math.abs(h - hipAtAddress)) : maxHipBack;
  }
  const hipRotBack = Math.abs(maxHipBack - hipAtAddress);

  let maxHipFt = hipAtAddress;
  for (const f of followFrames) {
    const h = hipLineRotationDeg(f.landmarks);
    maxHipFt = Math.max(maxHipFt, Math.abs(h - hipAtAddress));
  }

  const impactLm = impactFrame?.landmarks ?? frames[Math.floor(frames.length * 0.5)].landmarks;
  const hipSepImpact = hipShoulderSeparationDeg(impactLm);

  const tempoRatio = estimateTempo(frames, phases);

  const headLat = headLateralInches(frames);

  const deviations: MetricDeviation[] = [
    {
      name: "Hip–shoulder separation at impact",
      value: hipSepImpact,
      unit: "°",
      benchmarkMin: BENCH.hipShoulderSeparationAtImpact.min,
      benchmarkIdeal: BENCH.hipShoulderSeparationAtImpact.ideal,
      benchmarkMax: BENCH.hipShoulderSeparationAtImpact.max,
      status: metricStatus(
        hipSepImpact,
        BENCH.hipShoulderSeparationAtImpact.min,
        BENCH.hipShoulderSeparationAtImpact.ideal,
        BENCH.hipShoulderSeparationAtImpact.max,
      ),
    },
    {
      name: "Spine tilt at address",
      value: spineTiltClamped,
      unit: "°",
      benchmarkMin: BENCH.spineTiltAtAddress.min,
      benchmarkIdeal: BENCH.spineTiltAtAddress.ideal,
      benchmarkMax: BENCH.spineTiltAtAddress.max,
      status: metricStatus(
        spineTiltClamped,
        BENCH.spineTiltAtAddress.min,
        BENCH.spineTiltAtAddress.ideal,
        BENCH.spineTiltAtAddress.max,
      ),
    },
    {
      name: "Knee flex at address",
      value: kneeFlex,
      unit: "°",
      benchmarkMin: BENCH.kneeFlexAtAddress.min,
      benchmarkIdeal: BENCH.kneeFlexAtAddress.ideal,
      benchmarkMax: BENCH.kneeFlexAtAddress.max,
      status: metricStatus(
        kneeFlex,
        BENCH.kneeFlexAtAddress.min,
        BENCH.kneeFlexAtAddress.ideal,
        BENCH.kneeFlexAtAddress.max,
      ),
    },
    {
      name: "Lead arm extension at top",
      value: leadArmExtensionAtTopDeg,
      unit: "°",
      benchmarkMin: BENCH.leadArmExtensionAtTop.min,
      benchmarkIdeal: BENCH.leadArmExtensionAtTop.ideal,
      benchmarkMax: BENCH.leadArmExtensionAtTop.max,
      status: metricStatus(
        leadArmExtensionAtTopDeg,
        BENCH.leadArmExtensionAtTop.min,
        BENCH.leadArmExtensionAtTop.ideal,
        BENCH.leadArmExtensionAtTop.max,
      ),
    },
    {
      name: "Hip rotation (backswing)",
      value: hipRotBack,
      unit: "°",
      benchmarkMin: BENCH.hipRotationBackswing.min,
      benchmarkIdeal: BENCH.hipRotationBackswing.ideal,
      benchmarkMax: BENCH.hipRotationBackswing.max,
      status: metricStatus(
        hipRotBack,
        BENCH.hipRotationBackswing.min,
        BENCH.hipRotationBackswing.ideal,
        BENCH.hipRotationBackswing.max,
      ),
    },
    {
      name: "Hip rotation (follow-through)",
      value: maxHipFt,
      unit: "°",
      benchmarkMin: BENCH.hipRotationFollowThrough.min,
      benchmarkIdeal: BENCH.hipRotationFollowThrough.ideal,
      benchmarkMax: BENCH.hipRotationFollowThrough.max,
      status: metricStatus(
        maxHipFt,
        BENCH.hipRotationFollowThrough.min,
        BENCH.hipRotationFollowThrough.ideal,
        BENCH.hipRotationFollowThrough.max,
      ),
    },
    {
      name: "Swing tempo (back : down)",
      value: tempoRatio,
      unit: ":1",
      benchmarkMin: BENCH.tempoRatio.min,
      benchmarkIdeal: BENCH.tempoRatio.ideal,
      benchmarkMax: BENCH.tempoRatio.max,
      status: metricStatus(
        tempoRatio,
        BENCH.tempoRatio.min,
        BENCH.tempoRatio.ideal,
        BENCH.tempoRatio.max,
      ),
    },
    {
      name: "Head lateral movement",
      value: headLat,
      unit: "in",
      benchmarkMin: BENCH.headLateralMovement.min,
      benchmarkIdeal: BENCH.headLateralMovement.ideal,
      benchmarkMax: BENCH.headLateralMovement.max,
      status: metricStatus(
        headLat,
        BENCH.headLateralMovement.min,
        BENCH.headLateralMovement.ideal,
        BENCH.headLateralMovement.max,
        true,
      ),
    },
  ];

  return {
    hipShoulderSeparationAtImpactDeg: hipSepImpact,
    spineTiltAtAddressDeg: spineTiltClamped,
    kneeFlexAtAddressDeg: kneeFlex,
    leadArmExtensionAtTopDeg: leadArmExtensionAtTopDeg,
    hipRotationBackswingDeg: hipRotBack,
    hipRotationFollowThroughDeg: maxHipFt,
    tempoRatio,
    headLateralMovementIn: headLat,
    deviations,
  };
}

function estimateTempo(frames: PoseFrame[], phases: SwingPhase[]): number {
  const top = phases.find((p) => p.name === "top");
  const impact = phases.find((p) => p.name === "impact");
  if (!top || !impact) return BENCH.tempoRatio.ideal;
  const back = Math.max(1, top.endMs - frames[0].t);
  const down = Math.max(1, impact.startMs - top.endMs);
  const r = back / down;
  return Math.min(5, Math.max(1.5, Math.round(r * 10) / 10));
}
