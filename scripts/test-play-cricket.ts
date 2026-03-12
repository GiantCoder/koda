import { playCricketClient } from "../lib/play-cricket/client";

const apiToken = process.env.ECB_API_TOKEN; // or pass as first arg
if (!apiToken) {
  console.error("Set ECB_API_TOKEN or pass token as first arg");
  process.exit(1);
}

const siteId = process.argv[2] ?? "6247";

async function main() {
  const teams = await playCricketClient.getTeams(apiToken, siteId);
  if (!teams.ok) {
    console.error("Teams error:", teams.error);
    return;
  }
  console.log("Teams:", JSON.stringify(teams.data, null, 2));

  const stats = await playCricketClient.getPlayerStats(apiToken, siteId, "2024");
  if (!stats.ok) {
    console.error("Stats error:", stats.error);
    return;
  }
  console.log("Player count:", stats.data.length);
  console.log("Sample:", JSON.stringify(stats.data[0], null, 2));
}

main();