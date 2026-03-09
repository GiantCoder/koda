"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import PlayerCardDisplay from "@/app/components/player-card/PlayerCardDisplay";
import PlayerCardEditor from "@/app/components/player-card/PlayerCardEditor";
import { getMockUser } from "@/app/lib/mock-auth";
import { buildMockAuthHeaders } from "@/app/lib/mock-auth-headers";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  fetchPlayerCard,
  generateBackground,
  savePlayerCard,
  setAiBgCss,
  updateLocalCard,
} from "@/src/store/slices/playerCardSlice";
import type { UpdatePlayerCardInput } from "@/types/player-card";

const uploadResponseSchema = z.object({
  url: z.string().url(),
});

export default function PlayerCardPage() {
  const dispatch = useAppDispatch();
  const [uiError, setUiError] = useState<string | null>(null);
  const { card, loading, saving, generatingBg, aiBgCss, error } = useAppSelector(
    (state) => state.playerCard
  );

  useEffect(() => {
    void dispatch(fetchPlayerCard());
  }, [dispatch]);

  const canSaveInput = useMemo((): UpdatePlayerCardInput | null => {
    if (!card) return null;
    return {
      displayName: card.displayName,
      tier: card.tier,
      role: card.role,
      sportIcon: card.sportIcon,
      statTec: card.statTec,
      statPow: card.statPow,
      statTim: card.statTim,
      statCon: card.statCon,
      statPac: card.statPac,
      statFie: card.statFie,
      profilePhotoUrl: card.profilePhotoUrl,
      backgroundUrl: card.backgroundUrl,
      backgroundMode: card.backgroundMode,
    };
  }, [card]);

  const uploadImage = async (file: File): Promise<string> => {
    const mockUser = getMockUser();
    if (!mockUser) {
      throw new Error("No authenticated user available for upload.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/player-card/upload-image", {
      method: "POST",
      headers: buildMockAuthHeaders(mockUser),
      body: formData,
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(responseBody.error ?? "Image upload failed");
    }

    const raw = (await response.json()) as unknown;
    return uploadResponseSchema.parse(raw).url;
  };

  if (loading || !card) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Player Card</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Build and share your cricket identity card with AI-powered styling.
        </p>
      </div>

      {error || uiError ? (
        <div className="mb-4 rounded-lg border border-red-400/35 bg-red-400/10 p-3 text-sm text-red-300">
          {error ?? uiError}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="mx-auto lg:mx-0">
          <PlayerCardDisplay
            card={card}
            aiBgCss={aiBgCss}
            onDisplayNameCommit={(displayName) => dispatch(updateLocalCard({ displayName }))}
            showBlankSlate={card.id === null && card.overall === 50}
          />
        </div>

        <PlayerCardEditor
          card={card}
          aiBgCss={aiBgCss}
          generatingBg={generatingBg}
          saving={saving}
          onChange={(partial) => dispatch(updateLocalCard(partial))}
          onSave={() => {
            if (!canSaveInput) return;
            setUiError(null);
            void dispatch(savePlayerCard(canSaveInput)).then((result) => {
              if (savePlayerCard.rejected.match(result)) {
                setUiError("Saving failed. Please try again.");
              }
            });
          }}
          onGenerateBg={() => {
            setUiError(null);
            void dispatch(
              generateBackground({
                tier: card.tier,
                role: card.role,
                sportIcon: card.sportIcon,
              })
            ).then((result) => {
              if (generateBackground.fulfilled.match(result)) {
                dispatch(updateLocalCard({ backgroundMode: "AI", backgroundUrl: null }));
              } else {
                setUiError("AI background generation failed. Please try again.");
              }
            });
          }}
          onProfileUpload={(file) => {
            setUiError(null);
            void uploadImage(file)
              .then((url) => {
                dispatch(updateLocalCard({ profilePhotoUrl: url }));
              })
              .catch((uploadError: unknown) => {
                setUiError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
              });
          }}
          onBgUpload={(file) => {
            setUiError(null);
            void uploadImage(file)
              .then((url) => {
                dispatch(setAiBgCss(null));
                dispatch(updateLocalCard({ backgroundUrl: url, backgroundMode: "UPLOAD" }));
              })
              .catch((uploadError: unknown) => {
                setUiError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
              });
          }}
        />
      </div>
    </div>
  );
}
