import type { LaunchMonitorShot, ShotShape } from "@/types/swing";

function parseNum(v: string | undefined): number {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function mapShotType(raw: string | undefined): ShotShape {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("draw")) return "draw";
  if (s.includes("fade")) return "fade";
  if (s.includes("pull")) return "pull";
  if (s.includes("push")) return "push";
  return "straight";
}

export function parseTrackManRows(rows: Record<string, string>[]): LaunchMonitorShot[] {
  return rows.map((row) => ({
    club: row["Club"] ?? row["club"] ?? "—",
    clubSpeedMph: parseNum(row["Club Speed"]),
    ballSpeedMph: parseNum(row["Ball Speed"]),
    smashFactor: parseNum(row["Smash Factor"]),
    launchAngleDeg: parseNum(row["Launch Angle"]),
    spinRateRpm: parseNum(row["Spin Rate"]),
    clubPathDeg: parseNum(row["Club Path"]),
    faceAngleDeg: parseNum(row["Face Angle"]),
    attackAngleDeg: parseNum(row["Attack Angle"]),
    carryYards: parseNum(row["Carry Distance"] ?? row["Carry"]),
    shotShape: mapShotType(row["Shot Type"]),
  }));
}
