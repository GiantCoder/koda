import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { z } from "zod";
import { getMockUser } from "@/app/lib/mock-auth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import type { PlayerCardDto, UpdatePlayerCardInput } from "@/types/player-card";

interface PlayerCardState {
  card: PlayerCardDto | null;
  loading: boolean;
  saving: boolean;
  generatingBg: boolean;
  error: string | null;
  aiBgCss: string | null;
}

const playerCardDtoSchema = z.object({
  id: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  displayName: z.string(),
  tier: z.enum(["BRONZE", "SILVER", "GOLD", "ELITE"]),
  role: z.enum(["BAT", "BWL", "ALL", "WKT"]),
  sportIcon: z.enum(["BAT_ICON", "BALL_ICON", "GLOVES_ICON"]),
  statTec: z.number().int(),
  statPow: z.number().int(),
  statTim: z.number().int(),
  statCon: z.number().int(),
  statPac: z.number().int(),
  statFie: z.number().int(),
  profilePhotoUrl: z.string().nullable(),
  backgroundUrl: z.string().nullable(),
  backgroundMode: z.enum(["DEFAULT", "UPLOAD", "AI"]),
  overall: z.number().int(),
});

const aiBgResponseSchema = z.object({
  css: z.string().min(1),
});

const initialState: PlayerCardState = {
  card: null,
  loading: false,
  saving: false,
  generatingBg: false,
  error: null,
  aiBgCss: null,
};

function getRequestHeaders(): HeadersInit {
  const mockUser = getMockUser();
  return {
    "Content-Type": "application/json",
    ...buildMockAuthHeaders(mockUser),
  };
}

export const fetchPlayerCard = createAsyncThunk<PlayerCardDto>(
  "playerCard/fetchPlayerCard",
  async (_, thunkApi) => {
    try {
      const response = await fetch("/api/player-card", {
        method: "GET",
        headers: getRequestHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch player card");
      }

      const raw = (await response.json()) as unknown;
      return playerCardDtoSchema.parse(raw);
    } catch (error) {
      return thunkApi.rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch player card"
      ) as never;
    }
  }
);

export const savePlayerCard = createAsyncThunk<PlayerCardDto, UpdatePlayerCardInput>(
  "playerCard/savePlayerCard",
  async (input, thunkApi) => {
    try {
      const response = await fetch("/api/player-card", {
        method: "PUT",
        headers: getRequestHeaders(),
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to save player card");
      }

      const raw = (await response.json()) as unknown;
      return playerCardDtoSchema.parse(raw);
    } catch (error) {
      return thunkApi.rejectWithValue(
        error instanceof Error ? error.message : "Failed to save player card"
      ) as never;
    }
  }
);

export const generateBackground = createAsyncThunk<
  string,
  { tier: PlayerCardDto["tier"]; role: PlayerCardDto["role"]; sportIcon: PlayerCardDto["sportIcon"] }
>("playerCard/generateBackground", async (params, thunkApi) => {
  try {
    const response = await fetch("/api/player-card/generate-background", {
      method: "POST",
      headers: getRequestHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to generate background");
    }

    const raw = (await response.json()) as unknown;
    return aiBgResponseSchema.parse(raw).css;
  } catch (error) {
    return thunkApi.rejectWithValue(
      error instanceof Error ? error.message : "Failed to generate background"
    ) as never;
  }
});

const playerCardSlice = createSlice({
  name: "playerCard",
  initialState,
  reducers: {
    setAiBgCss(state, action: PayloadAction<string | null>) {
      state.aiBgCss = action.payload;
    },
    updateLocalCard(state, action: PayloadAction<Partial<PlayerCardDto>>) {
      if (!state.card) {
        return;
      }
      state.card = { ...state.card, ...action.payload };
      state.card.overall = Math.round(
        (state.card.statTec +
          state.card.statPow +
          state.card.statTim +
          state.card.statCon +
          state.card.statPac +
          state.card.statFie) /
          6
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlayerCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlayerCard.fulfilled, (state, action) => {
        state.loading = false;
        state.card = action.payload;
      })
      .addCase(fetchPlayerCard.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string | undefined) ?? "Unable to load player card";
      })
      .addCase(savePlayerCard.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(savePlayerCard.fulfilled, (state, action) => {
        state.saving = false;
        state.card = action.payload;
      })
      .addCase(savePlayerCard.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string | undefined) ?? "Unable to save player card";
      })
      .addCase(generateBackground.pending, (state) => {
        state.generatingBg = true;
        state.error = null;
      })
      .addCase(generateBackground.fulfilled, (state, action) => {
        state.generatingBg = false;
        state.aiBgCss = action.payload;
      })
      .addCase(generateBackground.rejected, (state, action) => {
        state.generatingBg = false;
        state.error = (action.payload as string | undefined) ?? "Unable to generate background";
      });
  },
});

export const { setAiBgCss, updateLocalCard } = playerCardSlice.actions;
export default playerCardSlice.reducer;
