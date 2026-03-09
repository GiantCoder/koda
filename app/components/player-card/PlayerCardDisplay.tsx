"use client";

import { useMemo, useState } from "react";
import type { PlayerCardDto } from "@/types/player-card";
import { TIER_THEMES } from "./playerCardThemes";

interface PlayerCardDisplayProps {
  card: PlayerCardDto;
  aiBgCss: string | null;
  interactive?: boolean;
  compact?: boolean;
  showBlankSlate?: boolean;
  onDisplayNameCommit?: (displayName: string) => void;
}

function StatBar({ value, accentColor }: { value: number; accentColor: string }) {
  return (
    <div className="h-[3px] flex-1 overflow-hidden rounded-sm bg-white/15">
      <div
        className="h-full rounded-sm transition-all duration-700 ease-out"
        style={{ width: `${value}%`, background: accentColor }}
      />
    </div>
  );
}

function StatRow({
  label,
  value,
  accentColor,
  reverse = false,
}: {
  label: string;
  value: number;
  accentColor: string;
  reverse?: boolean;
}) {
  const number = (
    <span
      key="number"
      className="min-w-[26px] text-[17px] font-extrabold leading-none tracking-[-0.5px]"
      style={{ fontFamily: "'Oswald', sans-serif", textAlign: reverse ? "right" : "left" }}
    >
      {value}
    </span>
  );

  const labelEl = (
    <span
      key="label"
      className="min-w-[28px] text-[9px] font-bold uppercase tracking-[1.5px] opacity-70"
      style={{ textAlign: reverse ? "right" : "left" }}
    >
      {label}
    </span>
  );

  const bar = <StatBar key="bar" value={value} accentColor={accentColor} />;

  return (
    <div className="flex h-6 items-center gap-1.5">
      {reverse ? [bar, number, labelEl] : [number, labelEl, bar]}
    </div>
  );
}

const SPORT_ICONS: Record<PlayerCardDto["sportIcon"], string> = {
  BAT_ICON: "🏏",
  BALL_ICON: "🔴",
  GLOVES_ICON: "🧤",
};

export default function PlayerCardDisplay({
  card,
  aiBgCss,
  interactive = true,
  compact = false,
  showBlankSlate = false,
  onDisplayNameCommit,
}: PlayerCardDisplayProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(card.displayName.toUpperCase());
  const theme = TIER_THEMES[card.tier];

  const size = compact
    ? { width: 250, height: 360, perspective: 750 }
    : { width: 290, height: 420, perspective: 900 };

  const resolvedBg = useMemo(() => {
    if (card.backgroundMode === "UPLOAD" && card.backgroundUrl) {
      return `url(${card.backgroundUrl}) center / cover no-repeat`;
    }
    if (card.backgroundMode === "AI" && aiBgCss) {
      return aiBgCss;
    }
    return theme.defaultBg;
  }, [card.backgroundMode, card.backgroundUrl, aiBgCss, theme.defaultBg]);

  const commitDisplayName = () => {
    const next = nameDraft.trim().toUpperCase().slice(0, 20);
    if (!next) {
      setNameDraft(card.displayName.toUpperCase());
      setEditingName(false);
      return;
    }
    onDisplayNameCommit?.(next);
    setEditingName(false);
  };

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 20,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * -20,
    });
    setHovering(true);
  };

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Rajdhani:wght@500;600;700&display=swap');
      `}</style>

      <div
        className="mx-auto"
        style={{ perspective: `${size.perspective}px`, fontFamily: "'Rajdhani', sans-serif" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          setTilt({ x: 0, y: 0 });
          setHovering(false);
        }}
      >
        <div
          className="rounded-[20px] p-[3px]"
          style={{
            width: size.width,
            height: size.height,
            background: theme.border,
            transform: interactive
              ? `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(${hovering ? 1.03 : 1})`
              : "none",
            boxShadow: hovering
              ? `0 32px 90px ${theme.glow}, 0 0 50px ${theme.glow}, 0 8px 32px rgba(0,0,0,0.9)`
              : `0 20px 60px rgba(0,0,0,0.65), 0 0 28px ${theme.glow}`,
            transition: hovering
              ? "transform 0.08s ease, box-shadow 0.2s ease"
              : "transform 0.35s ease, box-shadow 0.3s ease",
          }}
          data-testid="player-card-shell"
        >
          <div
            className="relative flex h-full w-full flex-col overflow-hidden rounded-[18px]"
            style={{ color: theme.text }}
          >
            <div className="absolute inset-0" style={{ background: resolvedBg }} />

            {card.profilePhotoUrl ? (
              <img
                src={card.profilePhotoUrl}
                alt={`${card.displayName} profile`}
                className="absolute inset-0 h-full w-full object-cover object-top"
                style={{
                  maskImage: "linear-gradient(180deg, black 0%, black 50%, transparent 88%)",
                  WebkitMaskImage: "linear-gradient(180deg, black 0%, black 50%, transparent 88%)",
                }}
              />
            ) : null}

            <div className="pointer-events-none absolute inset-0" style={{ background: theme.overlay }} />
            <div
              className="pointer-events-none absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, ${theme.accent} 1px, transparent 1px)`,
                backgroundSize: "18px 18px",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(125deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)",
                transform: hovering ? "translateX(30px)" : "translateX(-30px)",
                transition: "transform 0.35s ease",
              }}
            />

            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-start justify-between px-4 pt-4">
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className="text-[58px] font-bold leading-none tracking-[-2px]"
                    style={{
                      color: theme.accent,
                      textShadow: `0 0 24px ${theme.glow}`,
                      fontFamily: "'Oswald', sans-serif",
                    }}
                  >
                    {card.overall}
                  </div>
                  <div
                    className="-mt-1 text-[13px] font-semibold tracking-[3px]"
                    style={{ color: theme.accent, fontFamily: "'Oswald', sans-serif" }}
                  >
                    {card.role}
                  </div>
                </div>

                {!card.profilePhotoUrl ? (
                  <div
                    className="mt-1 text-[78px] leading-none opacity-20"
                    style={{ filter: `drop-shadow(0 0 14px ${theme.accent})` }}
                  >
                    {SPORT_ICONS[card.sportIcon]}
                  </div>
                ) : null}
              </div>

              <div className="flex-1" />

              {showBlankSlate ? (
                <div className="px-4 pb-2 text-center text-xs font-semibold tracking-[1.4px] text-white/80">
                  Start analysing videos to unlock your real player stats.
                </div>
              ) : null}

              <div className="px-4 pb-2 text-center">
                {editingName ? (
                  <input
                    className="w-[220px] border-b border-white/40 bg-transparent text-center text-[26px] font-bold tracking-[4px] outline-none"
                    style={{ fontFamily: "'Oswald', sans-serif", color: theme.text }}
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value.toUpperCase())}
                    onBlur={commitDisplayName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        commitDisplayName();
                      }
                    }}
                    maxLength={20}
                    autoFocus
                    aria-label="Player name"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(card.displayName.toUpperCase());
                      setEditingName(true);
                    }}
                    className="inline-block cursor-text border-b border-transparent text-[26px] font-bold tracking-[4px] transition-colors hover:border-white/60"
                    style={{ fontFamily: "'Oswald', sans-serif", textShadow: `0 2px 16px ${theme.glow}` }}
                  >
                    {card.displayName.toUpperCase()}
                  </button>
                )}
              </div>

              <div
                className="mx-3.5 h-px"
                style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}88, transparent)` }}
              />

              <div className="flex gap-2.5 px-3.5 pb-3.5 pt-2">
                <div className="flex flex-1 flex-col gap-1">
                  <StatRow label="TEC" value={card.statTec} accentColor={theme.accent} />
                  <StatRow label="POW" value={card.statPow} accentColor={theme.accent} />
                  <StatRow label="TIM" value={card.statTim} accentColor={theme.accent} />
                </div>
                <div
                  className="w-px"
                  style={{ background: `linear-gradient(180deg, transparent, ${theme.accent}55, transparent)` }}
                />
                <div className="flex flex-1 flex-col gap-1">
                  <StatRow label="CON" value={card.statCon} accentColor={theme.accent} reverse />
                  <StatRow label="PAC" value={card.statPac} accentColor={theme.accent} reverse />
                  <StatRow label="FIE" value={card.statFie} accentColor={theme.accent} reverse />
                </div>
              </div>
            </div>

            <div
              className="absolute bottom-2 right-2.5 z-10 text-[8px] tracking-[2px] opacity-25"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              KODA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
