import { NextResponse } from "next/server";
import type { AnalyzeApiRequest, AnalyzeApiResponse } from "@/types/swing";

export async function POST(request: Request) {
  let body: AnalyzeApiRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.frames?.length || !body.metrics || !body.phases) {
    return NextResponse.json(
      { error: "frames, metrics, and phases are required" },
      { status: 400 },
    );
  }

  const res: AnalyzeApiResponse = {
    frames: body.frames,
    metrics: body.metrics,
    phases: body.phases,
    annotatedVideoUrl: body.annotatedVideoUrl,
  };

  return NextResponse.json(res);
}
