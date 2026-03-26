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

/** Rapsodo MLM2PRO-style: V-Launch, etc. */
export function parseRapsodoRows(rows: Record<string, string>[]): LaunchMonitorShot[] {
  return rows.map((row) => ({
    club: row["Club"] ?? row["Club Type"] ?? "—",
    clubSpeedMph: parseNum(row["Club Speed"] ?? row["Club Speed (mph)"]),
    ballSpeedMph: parseNum(row["Ball Speed"] ?? row["Ball Speed (mph)"]),
    smashFactor: parseNum(row["Smash Factor"]),
    launchAngleDeg: parseNum(row["V-Launch"] ?? row["Launch Angle"]),
    spinRateRpm: parseNum(row["Backspin"] ?? row["Spin Rate"]),
    clubPathDeg: parseNum(row["Club Path"] ?? row["Path"]),
    faceAngleDeg: parseNum(row["Face Angle"] ?? row["Face to Target"]),
    attackAngleDeg: parseNum(row["Attack Angle"] ?? row["Angle of Attack"]),
    carryYards: parseNum(row["Carry"] ?? row["Carry Yds"]),
    shotShape: mapShotShape(row["Shot Shape"] ?? row["Shape"]),
  }));
}
