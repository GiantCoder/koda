import { NextResponse } from "next/server";
import { MOCK_PLAY_CRICKET_TEAMS } from "@/app/lib/club-data";

export async function GET() {
  return NextResponse.json({ teams: MOCK_PLAY_CRICKET_TEAMS });
}
