import { z } from "zod";

/** POST /api/analysis - trigger analysis for a video */
export const analysisCreateSchema = z.object({
  videoId: z.string().uuid("Invalid video ID"),
});

export type AnalysisCreateInput = z.infer<typeof analysisCreateSchema>;
