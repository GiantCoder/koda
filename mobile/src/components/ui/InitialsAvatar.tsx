import React from "react";
import { Text, View } from "react-native";

const AVATAR_COLORS = ["#E63946", "#2D6A4F", "#1A1A2E", "#C1121F", "#52796F", "#9B2226"] as const;

function normalizeSeed(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Stable djb2 hash so the same id/name always lands on the same swatch. */
function colorForSeed(seed: string): string {
  const normalized = normalizeSeed(seed);
  let hash = 5381;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function InitialsAvatar({
  name,
  id,
  size = 40,
}: {
  name: string;
  id?: string;
  size?: number;
}) {
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: colorForSeed(id || name) }}
    >
      <Text className="font-semibold text-white" style={{ fontSize: size * 0.36 }}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}
