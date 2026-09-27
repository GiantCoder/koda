import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Card, CardContent } from "./Card";
import { UserAvatar } from "./UserAvatar";

interface GroupCoverCardProps {
  title: string;
  subtitle?: string;
  coverUri?: string | null;
  avatarUri?: string | null;
  avatarName: string;
  avatarId?: string;
  badges?: string[];
  /** Brand-tinted band when there is no cover photo. Omit to keep the card surface. */
  fallbackTint?: string;
  onPress?: () => void;
}

/**
 * Shared "browse a group" card: cover band (photo or brand tint), badge
 * avatar, title, subtitle, and chips. Used by Clubs, Squads, and Leagues.
 */
export function GroupCoverCard({
  title,
  subtitle,
  coverUri,
  avatarUri,
  avatarName,
  avatarId,
  badges = [],
  fallbackTint,
  onPress,
}: GroupCoverCardProps) {
  const hasCover = Boolean(coverUri);
  const body = (
    <Card className="overflow-hidden p-0">
      <View
        className="relative min-h-40"
        style={!hasCover && fallbackTint ? { backgroundColor: fallbackTint } : undefined}
      >
        {hasCover ? (
          <>
            <Image source={{ uri: coverUri ?? undefined }} className="absolute inset-0 h-full w-full" resizeMode="cover" />
            <View className="absolute inset-0 bg-black/35" />
          </>
        ) : null}
        <CardContent className="relative p-5">
          <View className="flex-row items-center gap-3">
            <UserAvatar name={avatarName} uri={avatarUri} id={avatarId} size={44} />
            <Text
              className={`flex-1 text-base font-semibold ${
                hasCover ? "text-white" : "text-text-primary dark:text-text-primary-dark"
              }`}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text
              className={`mt-1 text-sm ${
                hasCover ? "text-white/85" : "text-text-secondary dark:text-text-secondary-dark"
              }`}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
          {badges.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {badges.map((badge) => (
                <View key={badge} className="rounded-full bg-surface/90 dark:bg-surface-dark/90 px-3 py-1">
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{badge}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </CardContent>
      </View>
    </Card>
  );

  if (!onPress) return body;
  return <Pressable onPress={onPress}>{body}</Pressable>;
}
