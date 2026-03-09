import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";
import { z } from "zod";

const childParamSchema = z.object({
  childId: z.string().uuid(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "PARENT" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsedParams = childParamSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid child id" }, { status: 400 });
  }

  const deleted = await prisma.guardianLink.deleteMany({
    where: {
      parentId: authUser.id,
      childId: parsedParams.data.childId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Child link not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Child link removed" });
}
