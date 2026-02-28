import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * POST /api/users/me/export
 * MVP placeholder: queues GDPR data export.
 * Full implementation would add job to BullMQ data-export queue.
 */
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // MVP: No BullMQ queue wired. Return 202 Accepted as placeholder.
  // Full impl would: queue.add({ userId: authUser.id, type: 'gdpr-export' })
  return NextResponse.json(
    {
      message:
        "Data export requested. You will receive an email when your export is ready. MVP placeholder - queue not yet implemented.",
      exportId: `export-${authUser.id}-${Date.now()}`,
    },
    { status: 202 }
  );
}
