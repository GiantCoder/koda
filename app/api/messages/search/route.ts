import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";

/**
 * GET /api/messages/search
 * Placeholder: search messages. Full implementation would use full-text search
 * (e.g. PostgreSQL tsvector) or Elasticsearch.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  return NextResponse.json({
    messages: [],
    query: q,
    message: "Search not implemented. Use GET /api/conversations/:id/messages for conversation messages.",
  });
}
