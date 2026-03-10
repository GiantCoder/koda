import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/get-auth-user";

const generateBackgroundSchema = z.object({
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "ELITE"]),
  role: z.enum(["BAT", "BWL", "ALL", "WKT"]),
  sportIcon: z.enum(["BAT_ICON", "BALL_ICON", "GLOVES_ICON"]),
});

const generatedResponseSchema = z.object({
  css: z.string().min(1),
});

type UserRateLimitEntry = {
  timestamps: number[];
};

const inMemoryRateLimit = new Map<string, UserRateLimitEntry>();
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const existing = inMemoryRateLimit.get(userId);
  const validTimestamps = (existing?.timestamps ?? []).filter((timestamp) => now - timestamp < ONE_HOUR_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    inMemoryRateLimit.set(userId, { timestamps: validTimestamps });
    return true;
  }

  validTimestamps.push(now);
  inMemoryRateLimit.set(userId, { timestamps: validTimestamps });
  return false;
}

function getSportIconDescription(icon: "BAT_ICON" | "BALL_ICON" | "GLOVES_ICON"): string {
  if (icon === "BALL_ICON") return "Bowler";
  if (icon === "GLOVES_ICON") return "Wicket Keeper";
  return "Batsman";
}

function buildPrompt(input: z.infer<typeof generateBackgroundSchema>): string {
  return `You are a CSS design expert creating dramatic backgrounds for a cricket player card app.

Card details:
- Tier: ${input.tier}
- Role: ${input.role}
- Player icon: ${input.sportIcon} (${getSportIconDescription(input.sportIcon)})

Return ONLY valid JSON with a single key "css" whose value is a CSS background shorthand using multiple gradients and/or repeating patterns. Make it dramatic and tier-appropriate:
- bronze: warm rust, copper, burnt sienna, earthy streaks
- silver: cool indigo, steel blue, ethereal shafts of light
- gold: deep forest green, emerald, gold luminescence, stadium atmosphere
- elite: deep cosmic navy, teal plasma beams, luxury darkness

The CSS value must be valid in a CSS background property.
Rules:
- No explanation
- No markdown fences
- No url()
- Return only raw JSON object like {"css":"radial-gradient(...), linear-gradient(...)"}`
    .trim();
}

function extractJsonObject(rawText: string): string | null {
  const withoutFences = rawText.replace(/```json|```/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return withoutFences.slice(start, end + 1);
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isRateLimited(authUser.id)) {
    return NextResponse.json(
      {
        error:
          "Rate limit exceeded. Please wait and try again. (MVP uses in-memory limiting; production should use Redis.)",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = generateBackgroundSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: buildPrompt(validation.data) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const rawText = textBlock?.type === "text" ? textBlock.text.trim() : "";
    const jsonPayload = extractJsonObject(rawText);
    if (!jsonPayload) {
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    const parsedJson = JSON.parse(jsonPayload) as unknown;
    const parsed = generatedResponseSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return NextResponse.json({ error: "Generation failed" }, { status: 500 });
    }

    return NextResponse.json({ css: parsed.data.css });
  } catch {
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
