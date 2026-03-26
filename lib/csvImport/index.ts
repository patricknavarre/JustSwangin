import Papa from "papaparse";
import type { LaunchMonitorShot } from "@/types/swing";
import { parseTrackManRows } from "./trackman";
import { parseGarminRows } from "./garmin";
import { parseRapsodoRows } from "./rapsodo";

export function detectDeviceFormat(headers: string[]): "trackman" | "garmin" | "rapsodo" | "unknown" {
  const h = new Set(headers.map((x) => x.trim()));
  if (h.has("Smash Factor") && h.has("Club Path")) return "trackman";
  if (h.has("Smash Factor") && h.has("HLA")) return "garmin";
  if (h.has("Ball Speed") && h.has("V-Launch")) return "rapsodo";
  return "unknown";
}

export function parseLaunchMonitorCsv(text: string): {
  device: "trackman" | "garmin" | "rapsodo" | "unknown";
  shots: LaunchMonitorShot[];
} {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const headers = parsed.meta.fields ?? [];
  const device = detectDeviceFormat(headers);
  const rows = parsed.data.filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));

  let shots: LaunchMonitorShot[] = [];
  if (device === "trackman") shots = parseTrackManRows(rows);
  else if (device === "garmin") shots = parseGarminRows(rows);
  else if (device === "rapsodo") shots = parseRapsodoRows(rows);
  else shots = parseTrackManRows(rows);

  return { device, shots };
}
