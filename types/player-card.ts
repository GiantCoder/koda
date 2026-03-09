import { z } from "zod";
import type { BgMode, CardRole, CardTier, SportIcon } from "@prisma/client";

export interface PlayerCardDto {
  id: string | null;
  userId: string;
  displayName: string;
  tier: CardTier;
  role: CardRole;
  sportIcon: SportIcon;
  statTec: number;
  statPow: number;
  statTim: number;
  statCon: number;
  statPac: number;
  statFie: number;
  profilePhotoUrl: string | null;
  backgroundUrl: string | null;
  backgroundMode: BgMode;
  overall: number;
}

export const updatePlayerCardSchema = z.object({
  displayName: z.string().min(1).max(20),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "ELITE"]),
  role: z.enum(["BAT", "BWL", "ALL", "WKT"]),
  sportIcon: z.enum(["BAT_ICON", "BALL_ICON", "GLOVES_ICON"]),
  statTec: z.number().int().min(1).max(99),
  statPow: z.number().int().min(1).max(99),
  statTim: z.number().int().min(1).max(99),
  statCon: z.number().int().min(1).max(99),
  statPac: z.number().int().min(1).max(99),
  statFie: z.number().int().min(1).max(99),
  profilePhotoUrl: z.string().url().nullable().optional(),
  backgroundUrl: z.string().url().nullable().optional(),
  backgroundMode: z.enum(["DEFAULT", "UPLOAD", "AI"]),
});

export type UpdatePlayerCardInput = z.infer<typeof updatePlayerCardSchema>;
