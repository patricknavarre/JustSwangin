import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_MB ?? "100");

export async function POST(request: Request) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error: "Uploads disabled",
        detail: "Set BLOB_READ_WRITE_TOKEN for cloud storage, or analyze a local file without uploading.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_MB) {
    return NextResponse.json({ error: `File exceeds ${MAX_MB} MB` }, { status: 400 });
  }

  const name = (form.get("filename") as string) || "swing.mp4";
  const blob = await put(name, file, {
    access: "public",
    token,
  });

  return NextResponse.json({
    videoUrl: blob.url,
    videoId: blob.pathname ?? blob.url,
  });
}
