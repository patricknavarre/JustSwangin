import { NextResponse } from "next/server";
import { listScorecardCourses } from "@/lib/scorecards";

export async function GET() {
  return NextResponse.json({ courses: listScorecardCourses() });
}
