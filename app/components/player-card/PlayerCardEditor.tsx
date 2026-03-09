"use client";

import type { CardRole, CardTier, SportIcon } from "@prisma/client";
import { Button } from "@/app/components/ui/Button";
import type { PlayerCardDto, UpdatePlayerCardInput } from "@/types/player-card";
import { TIER_THEMES } from "./playerCardThemes";

interface PlayerCardEditorProps {
  card: PlayerCardDto;
  aiBgCss: string | null;
  generatingBg: boolean;
  saving: boolean;
  onChange: (partial: Partial<UpdatePlayerCardInput>) => void;
  onSave: () => void;
  onGenerateBg: () => void;
  onProfileUpload: (file: File) => void;
  onBgUpload: (file: File) => void;
}

const ROLE_OPTIONS: CardRole[] = ["BAT", "BWL", "ALL", "WKT"];
const TIER_OPTIONS: CardTier[] = ["BRONZE", "SILVER", "GOLD", "ELITE"];
const ICON_OPTIONS: Array<{ value: SportIcon; label: string; emoji: string }> = [
  { value: "BAT_ICON", label: "Bat", emoji: "🏏" },
  { value: "BALL_ICON", label: "Ball", emoji: "🔴" },
  { value: "GLOVES_ICON", label: "Gloves", emoji: "🧤" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-bold uppercase tracking-[2px] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

function ToggleButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold tracking-[1px] transition ${
        selected
          ? "border-white/40 bg-white/20 text-white"
          : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function PlayerCardEditor({
  card,
  aiBgCss,
  generatingBg,
  saving,
  onChange,
  onSave,
  onGenerateBg,
  onProfileUpload,
  onBgUpload,
}: PlayerCardEditorProps) {
  const accent = TIER_THEMES[card.tier].accent;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-5">
        <div>
          <SectionLabel>Player Type</SectionLabel>
          <div className="flex flex-wrap gap-2.5">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ sportIcon: option.value })}
                className={`flex min-w-[82px] flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
                  card.sportIcon === option.value
                    ? "border-white/45 bg-white/20"
                    : "border-white/15 bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-[1px] text-white/85">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <SectionLabel>Tier</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map((tier) => (
                <ToggleButton
                  key={tier}
                  selected={card.tier === tier}
                  onClick={() => onChange({ tier })}
                >
                  {TIER_THEMES[tier].label.toUpperCase()}
                </ToggleButton>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Role</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <ToggleButton
                  key={role}
                  selected={card.role === role}
                  onClick={() => onChange({ role })}
                >
                  {role}
                </ToggleButton>
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Player Photo</SectionLabel>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="cursor-pointer rounded-md border border-dashed border-white/25 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onProfileUpload(file);
                  event.currentTarget.value = "";
                }}
              />
              {card.profilePhotoUrl ? "Change Photo" : "Upload Photo"}
            </label>
            {card.profilePhotoUrl ? (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    profilePhotoUrl: null,
                  })
                }
                className="rounded-md border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <SectionLabel>Background</SectionLabel>
          <div className="flex flex-wrap items-center gap-2.5">
            <ToggleButton
              selected={card.backgroundMode === "DEFAULT"}
              onClick={() => onChange({ backgroundMode: "DEFAULT", backgroundUrl: null })}
            >
              Default
            </ToggleButton>

            <label className="cursor-pointer rounded-md border border-dashed border-white/25 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/10">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onBgUpload(file);
                  event.currentTarget.value = "";
                }}
              />
              Upload BG
            </label>

            <button
              type="button"
              onClick={onGenerateBg}
              disabled={generatingBg}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold tracking-[1px] text-cyan-200 disabled:opacity-50"
            >
              {generatingBg ? (
                <>
                  <span className="inline-block animate-spin">⟳</span> Generating...
                </>
              ) : (
                <>✦ AI Generate</>
              )}
            </button>
          </div>

          {card.backgroundMode === "AI" && aiBgCss ? (
            <p className="mt-2 text-xs text-cyan-300/80">✦ AI background active</p>
          ) : null}
        </div>

        <div>
          <SectionLabel>Stats</SectionLabel>
          <div className="grid gap-x-5 gap-y-2 md:grid-cols-2">
            {[
              { key: "statTec", label: "TEC", value: card.statTec },
              { key: "statPow", label: "POW", value: card.statPow },
              { key: "statTim", label: "TIM", value: card.statTim },
              { key: "statCon", label: "CON", value: card.statCon },
              { key: "statPac", label: "PAC", value: card.statPac },
              { key: "statFie", label: "FIE", value: card.statFie },
            ].map((stat) => (
              <div key={stat.key} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-bold tracking-[1.3px] text-white/70">{stat.label}</span>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={stat.value}
                  className="h-1 flex-1"
                  style={{ accentColor: accent }}
                  onChange={(event) =>
                    onChange({
                      [stat.key]: Number(event.target.value),
                    } as Partial<UpdatePlayerCardInput>)
                  }
                />
                <span className="w-6 text-right text-xs font-bold" style={{ color: accent }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button className="mt-6 w-full" disabled={saving} onClick={onSave}>
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block animate-spin">⟳</span> Saving...
          </span>
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
}
