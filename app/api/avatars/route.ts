import { NextResponse } from "next/server";
import { resolveAvatarCategories } from "@/app/lib/avatars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const categories = await resolveAvatarCategories();

    return NextResponse.json({
      categories,
    });
  } catch {
    return NextResponse.json(
      {
        categories: [],
        error: "Avatar directory not found",
      },
      { status: 200 }
    );
  }
}
