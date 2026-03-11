import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { getAuthUser } from "@/lib/get-auth-user";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * GET /api/gamification/points/history
 * Paginated point transaction log. Query: limit (default 20, max 100), cursor (transaction id).
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let limit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  const cursor = searchParams.get("cursor") ?? undefined;

  const transactions = await prisma.pointTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = transactions.length > limit;
  const items = hasMore ? transactions.slice(0, limit) : transactions;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({
    transactions: items,
    nextCursor,
  });
}
