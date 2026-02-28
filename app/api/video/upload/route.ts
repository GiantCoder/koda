import { NextRequest, NextResponse } from "next/server";

/**
 * Mock video upload endpoint.
 * In production, this would integrate with tus or similar for chunked upload.
 * Returns a video ID for the processing flow.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 500));

    const videoId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    return NextResponse.json({
      id: videoId,
      title: title ?? file.name,
      description: description ?? null,
      filename: file.name,
      size: file.size,
    });
  } catch {
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
