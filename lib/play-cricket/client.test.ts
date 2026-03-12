import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";
import { playCricketClient } from "./client";

let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

describe("playCricketClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClubs", () => {
    it("returns typed data on 200", async () => {
      const clubs = [{ id: 1, name: "Test Club", short_name: "TC", website: "", address: "", ground: "", play_cricket_url: "" }];
      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ clubs }),
      });

      const result = await playCricketClient.getClubs("token");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(clubs);
      }
    });

    it("returns ok false with status on 401", async () => {
      fetchMock.mockResolvedValueOnce({ status: 401, ok: false });
      const result = await playCricketClient.getClubs("token");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
        expect(result.error.message).toBe("invalid_key");
      }
    });

    it("returns ok false with status on 404", async () => {
      fetchMock.mockResolvedValueOnce({ status: 404, ok: false });
      const result = await playCricketClient.getClubs("token");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(404);
        expect(result.error.message).toBe("not_found");
      }
    });

    it("returns ok false status 0 on network error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));
      const result = await playCricketClient.getClubs("token");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(0);
        expect(result.error.message).toBe("unreachable");
      }
    });

    it("uses AbortController for timeout", async () => {
      let capturedSignal: AbortSignal | undefined;
      fetchMock.mockImplementationOnce((url: string, opts?: RequestInit) => {
        capturedSignal = opts?.signal;
        return new Promise(() => {});
      });
      playCricketClient.getClubs("token");
      await new Promise((r) => setTimeout(r, 50));
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(false);
    });
  });

  describe("getTeams", () => {
    it("returns typed data on 200", async () => {
      const raw = [{ id: 1, team_name: "1st XI", site_id: 123 }];
      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ teams: raw }),
      });

      const result = await playCricketClient.getTeams("token", "123");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([{ id: 1, name: "1st XI", club_id: 123, club_name: "" }]);
      }
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("sites/123/teams.json"),
        expect.any(Object)
      );
    });

    it("returns ok false on 403", async () => {
      fetchMock.mockResolvedValueOnce({ status: 403, ok: false });
      const result = await playCricketClient.getTeams("token", "123");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe("invalid_key");
      }
    });
  });

  describe("getPlayerStats", () => {
    it("returns typed data on 200 from Players API", async () => {
      const raw = [
        { member_id: 12345, name: "Bugs Bunny" },
        { member_id: 224466, name: "Roger Rabbit" },
      ];
      fetchMock.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: () => Promise.resolve({ players: raw }),
      });

      const result = await playCricketClient.getPlayerStats("token", "123", "2024");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toMatchObject({ id: 12345, first_name: "Bugs", last_name: "Bunny", batting_runs: 0, bowling_wickets: 0 });
        expect(result.data[1]).toMatchObject({ id: 224466, first_name: "Roger", last_name: "Rabbit" });
      }
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/sites\/123\/players/),
        expect.any(Object)
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/season=2024/),
        expect.any(Object)
      );
    });
  });
});
