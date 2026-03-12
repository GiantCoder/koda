import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { syncClubStatsFunction } from "@/inngest/functions/sync-club-stats";
import { syncMatchDetailFunction } from "@/inngest/functions/sync-match-detail";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [syncClubStatsFunction, syncMatchDetailFunction],
});
