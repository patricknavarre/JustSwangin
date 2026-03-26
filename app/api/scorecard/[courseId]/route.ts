import { NextResponse } from "next/server";
import { getCourseScorecard } from "@/lib/scorecards";

export async function GET(
  _request: Request,
  { params }: { params: { courseId: string } },
) {
  const course = getCourseScorecard(params.courseId);

  if (!course) {
    return NextResponse.json({ error: "Scorecard not found" }, { status: 404 });
  }

  return NextResponse.json({ course });
}
