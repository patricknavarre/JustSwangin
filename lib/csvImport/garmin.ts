import type { LaunchMonitorShot, ShotShape } from "@/types/swing";

function parseNum(v: string | undefined): number {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function mapShotShape(raw: string | undefined): ShotShape {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("draw")) return "draw";
  if (s.includes("fade")) return "fade";
  if (s.includes("pull")) return "pull";
  if (s.includes("push")) return "push";
  return "straight";
}

/** Garmin R10 export: HLA ~ face angle, path for club path — column names vary; we map common fields. */
export function parseGarminRows(rows: Record<string, string>[]): LaunchMonitorShot[] {
  return rows.map((row) => ({
    club: row["Club"] ?? row["Club Type"] ?? "—",
    clubSpeedMph: parseNum(row["Club Speed"] ?? row["Club Speed (mph)"]),
    ballSpeedMph: parseNum(row["Ball Speed"] ?? row["Ball Speed (mph)"]),
    smashFactor: parseNum(row["Smash Factor"]),
    launchAngleDeg: parseNum(row["Launch Angle"] ?? row["VLA"]),
    spinRateRpm: parseNum(row["Spin Rate"] ?? row["Total Spin"]),
    clubPathDeg: parseNum(row["Club Path"] ?? row["Path"]),
    faceAngleDeg: parseNum(row["Face Angle"] ?? row["HLA"]),
    attackAngleDeg: parseNum(row["Attack Angle"] ?? row["AOA"]),
    carryYards: parseNum(row["Carry"] ?? row["Carry Distance"]),
    shotShape: mapShotShape(row["Shape"] ?? row["Shot Shape"]),
  }));
}
