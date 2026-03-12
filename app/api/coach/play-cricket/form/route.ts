import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/get-auth-user";
import { prisma } from "@/prisma/client";

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clubId = searchParams.get("clubId");
  const season = searchParams.get("season") ?? new Date().getFullYear().toString();
  const limit = Math.min(
    10,
    Math.max(1, parseInt(searchParams.get("limit") ?? "5", 10))
  );

  if (!clubId) {
    return NextResponse.json(
      { error: "clubId is required" },
      { status: 400 }
    );
  }

  const club = await prisma.club.findFirst({
    where: { id: clubId, coachId: authUser.id },
  });
  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const innings = await prisma.playCricketMatchInning.findMany({
    where: {
      match: {
        coachId: authUser.id,
        clubId,
        season,
      },
    },
    include: {
      match: { select: { matchDate: true, resultDescription: true } },
    },
  });

  const byPerson = new Map<
    string,
    Array<{
      battingRuns: number | null;
      bowlingWickets: number | null;
      result: string;
      matchDate: Date | null;
    }>
  >();

  for (const inn of innings) {
    const pid = inn.playCricketPersonId;
    if (!byPerson.has(pid)) byPerson.set(pid, []);
    const matchDate = inn.match.matchDate;
    byPerson.get(pid)!.push({
      battingRuns: inn.battingRuns,
      bowlingWickets: inn.bowlingWickets,
      result: inn.match.resultDescription ?? "—",
      matchDate,
    });
  }

  const formData = Array.from(byPerson.entries()).map(
    ([playCricketPersonId, list]) => {
      const sorted = [...list].sort(
        (a, b) =>
          (b.matchDate?.getTime() ?? 0) - (a.matchDate?.getTime() ?? 0)
      );
      const top = sorted.slice(0, limit);
      return {
        playCricketPersonId,
        formBattingRuns: top.map((t) => t.battingRuns).filter((r) => r != null) as number[],
        formBowlingWickets: top.map((t) => t.bowlingWickets).filter((w) => w != null) as number[],
        formMatchResults: top.map((t) => t.result),
      };
    }
  );

  return NextResponse.json({ formData });
}
