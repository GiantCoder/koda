import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";
import { MOCK_CLUBS, type ClubRecord } from "@/app/lib/club-data";

const createClubSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url(),
  playCricketUrl: z.string().url(),
  playCricketId: z.string().min(1).max(120),
  address: z.string().min(1).max(240),
  postcode: z.string().min(1).max(30),
  badgeFileName: z.string().max(200).optional(),
  bannerFileName: z.string().max(200).optional(),
});

let clubStore: ClubRecord[] = [...MOCK_CLUBS];

export async function GET() {
  return NextResponse.json({ clubs: clubStore });
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (authUser.role !== "COACH" && authUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createClubSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const createdClub: ClubRecord = {
    id: `club-${Date.now()}`,
    ...parsed.data,
    stats: {
      seniors: 0,
      juniors: 0,
      playersCoached: 0,
      averageRating: 0,
      sessionsThisMonth: 0,
    },
  };

  clubStore = [createdClub, ...clubStore];

  return NextResponse.json({ club: createdClub }, { status: 201 });
}
