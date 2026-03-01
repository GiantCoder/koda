"use client";

import { useEffect, useState } from "react";
import {
  getProfileAvatarUrl,
  PROFILE_AVATAR_UPDATED_EVENT,
} from "@/app/lib/auth";

export function useProfileAvatar(): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setAvatarUrl(getProfileAvatarUrl());
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, sync);
    };
  }, []);

  return avatarUrl;
}
