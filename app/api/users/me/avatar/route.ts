import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { avatarUpdateSchema } from "../../schema";

/**
 * PUT /api/users/me/avatar
 * MVP placeholder: accepts avatarUrl in JSON body.
 * Full implementation would use multipart/form-data and S3/MinIO upload.
 */
export async function PUT(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = avatarUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  // MVP: Schema has no avatarUrl. Return 202 Accepted as placeholder.
  // Full impl would: upload to S3/MinIO, update User.avatarUrl
  return NextResponse.json(
    {
      message:
        "Avatar upload queued. MVP placeholder - full upload not yet implemented.",
      avatarUrl: validation.data.avatarUrl ?? null,
    },
    { status: 202 }
  );
}
