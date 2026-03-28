import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildCoachingPrompt } from "@/lib/claudeCoach";
import type {
  CameraAngle,
  GolfShotType,
  LaunchMonitorShot,
  SwingMetrics,
  SwingSport,
} from "@/types/swing";
import type { CoachingApiResponse } from "@/types/swing";

export const runtime = "nodejs";
/** Vercel: allow time for Claude; capped by your plan (Hobby max 10s, Pro up to 60s). */
export const maxDuration = 60;

/**
 * Default model (Anthropic API id). Older ids like claude-3-5-haiku-20241022 may return 404.
 * Override with ANTHROPIC_MODEL. See https://docs.anthropic.com/en/docs/about-claude/models
 */
const DEFAULT_MODEL = "claude-haiku-4-5";

function parseCoachingJson(text: string): CoachingApiResponse | null {
  let raw = text.trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  const tryParse = (s: string): CoachingApiResponse | null => {
    try {
      return JSON.parse(s) as CoachingApiResponse;
    } catch {
      return null;
    }
  };

  let out = tryParse(raw);
  if (out) return out;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    out = tryParse(raw.slice(start, end + 1));
  }
  return out;
}

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        error: "Missing ANTHROPIC_API_KEY",
        detail: "Add it to .env.local in the project root (no quotes) and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  let body: {
    metrics: SwingMetrics;
    cameraAngle?: CameraAngle;
    launchData?: LaunchMonitorShot[];
    playerInfo?: { handicap?: number; height?: number };
    sport?: SwingSport;
    golfShotType?: GolfShotType;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.metrics) {
    return NextResponse.json({ error: "metrics required" }, { status: 400 });
  }

  const cameraAngle = body.cameraAngle ?? "down-the-line";
  const golfShotType = body.golfShotType ?? "driver";
  const prompt = buildCoachingPrompt({
    cameraAngle,
    handicap: body.playerInfo?.handicap,
    metrics: body.metrics,
    launchData: body.launchData,
    sport: body.sport,
    golfShotType: body.sport === "baseball-softball" ? undefined : golfShotType,
  });

  const model = (process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL).trim();
  const client = new Anthropic({ apiKey: key });

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const block = msg.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return NextResponse.json({ error: "No text from model" }, { status: 502 });
    }

    const parsed = parseCoachingJson(block.text);
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Could not parse coaching JSON",
          detail: "The model did not return valid JSON. Try again or switch ANTHROPIC_MODEL.",
          raw: block.text.slice(0, 2000),
        },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed);
  } catch (e) {
    if (e instanceof APIError) {
      const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 502;
      return NextResponse.json(
        {
          error: e.message || "Anthropic API error",
          detail:
            status === 401
              ? "Invalid API key or missing billing. Check console.anthropic.com."
              : status === 404
                ? `Model "${model}" is not available (retired name or wrong id). Set ANTHROPIC_MODEL in .env.local — try claude-haiku-4-5, claude-sonnet-4-20250514, or an id from Anthropic's models doc.`
                : undefined,
          status: e.status,
        },
        { status: status === 401 || status === 404 ? status : 502 },
      );
    }

    console.error("[api/coaching]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        detail: "Check the terminal where `npm run dev` is running for a stack trace.",
      },
      { status: 500 },
    );
  }
}
