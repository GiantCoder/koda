import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { assertCanViewProgress } from "@/lib/progress-rbac";
import { z } from "zod";

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * GET /api/progress/:userId/achievements
 * MVP placeholder: UserAchievement and Achievement tables not in schema.
 * Returns empty array; full implementation when schema extended.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paramResult = userIdParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: "Invalid user ID", details: paramResult.error.flatten() },
      { status: 400 }
    );
  }

  const { userId: targetUserId } = paramResult.data;

  const allowed = await assertCanViewProgress(
    user.id,
    user.role,
    targetUserId
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    userId: targetUserId,
    achievements: [],
    _meta: {
      message:
        "Achievement system not yet implemented. Add UserAchievement and Achievement models when available.",
    },
  });
}
