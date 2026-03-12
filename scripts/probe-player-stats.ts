/**
 * Probe possible Play-Cricket player stats endpoints.
 * Run: ECB_API_TOKEN=xxx npx tsx scripts/probe-player-stats.ts 6247
 */
const apiToken = process.env.ECB_API_TOKEN;
const siteId = process.argv[2] ?? "6247";
const season = "2024";

if (!apiToken) {
  console.error("Set ECB_API_TOKEN");
  process.exit(1);
}

const BASE = "https://play-cricket.com/api/v2";
const candidates = [
  `/sites/${siteId}/team_player_statistics.json`,
  `/sites/${siteId}/player_statistics.json`,
  `/sites/${siteId}/player_stats.json`,
  `/sites/${siteId}/batting.json`,
  `/sites/${siteId}/bowling.json`,
  `/sites/${siteId}/statistics.json`,
  `/team_player_statistics.json?site_id=${siteId}&season=${season}`,
  `/player_statistics.json?site_id=${siteId}&season=${season}`,
  `/batting.json?site_id=${siteId}&season=${season}`,
  `/clubs/${siteId}/team_player_statistics.json`,
  `/clubs/${siteId}/player_statistics.json`,
  `/clubs/${siteId}/batting.json`,
];

async function probe(path: string): Promise<{ status: number; ok: boolean }> {
  const hasQuery = path.includes("?");
  const q = hasQuery ? "&" : "?";
  const seasonParam = hasQuery ? "" : `&season=${season}`;
  const url = `${BASE}${path}${q}api_token=${apiToken}${seasonParam}`;
  try {
    const res = await fetch(url);
    return { status: res.status, ok: res.ok };
  } catch {
    return { status: 0, ok: false };
  }
}

async function main() {
  console.log(`Probing site_id=${siteId} season=${season}\n`);
  for (const path of candidates) {
    const { status, ok } = await probe(path);
    const mark = ok ? "✓" : "✗";
    console.log(`${mark} ${path} → ${status}`);
  }
}

main();
