import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { getSettings, setPointEarnSource } from "@/lib/gamification/settings";

const updateSchema = z.object({
  pointEarnSource: z.enum(["UPLOADS_ONLY", "SHADOW_BATTING_ONLY", "BOTH"]),
});

/**
 * GET /api/gamification/settings — Return platform gamification settings.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[GET /api/gamification/settings]", err);
    return NextResponse.json(
      { error: "Failed to load gamification settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/gamification/settings — Update point earn source (COACH/ADMIN only).
 */
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "COACH" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const settings = await setPointEarnSource(parsed.data.pointEarnSource);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[PATCH /api/gamification/settings]", err);
    return NextResponse.json(
      { error: "Failed to update gamification settings" },
      { status: 500 }
    );
  }
}
