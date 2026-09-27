import React from "react";
import { Image } from "react-native";
import { InitialsAvatar } from "./InitialsAvatar";
import { resolveAssetUrl } from "@/lib/mediaUrl";

export function UserAvatar({
  name,
  uri,
  size = 32,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const resolved = resolveAssetUrl(uri);
  if (resolved) {
    return (
      <Image
        source={{ uri: resolved }}
        className="rounded-full bg-surface-secondary dark:bg-surface-secondary-dark"
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsAvatar name={name} size={size} />;
}
