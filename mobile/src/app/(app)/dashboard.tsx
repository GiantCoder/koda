import React, { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppSelector } from "@/store/hooks";
import { Card } from "@/components/ui/Card";
import { PressableScale } from "@/components/ui/PressableScale";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";
import { getDashboardSummary, type DashboardSummary } from "@/api/dashboard";
import { getNotifications } from "@/api/notifications";
import { getSelectedAvatarUrl } from "@/lib/avatarStore";
import { ApiError } from "@/api/client";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function greetingName(displayName?: string | null): string {
  if (!displayName?.trim()) return "there";
  const token = displayName.trim().split(/\s+/)[0];
  const local = token.includes("@") ? token.split("@")[0] : token;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

/**
 * Real dashboard, calling GET /api/dashboard/summary. Unlike the web app's
 * dashboard -- which never calls this endpoint and shows entirely
 * hardcoded sessions/squads/activity instead -- this shows what's actually
 * there.
 */
export default function DashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const iconColor = useSecondaryIconColor();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("[dashboard] Failed to load summary:", err);
      setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard right now.");
    }
    try {
      const { unreadCount: count } = await getNotifications({ limit: 1 });
      setUnreadCount(count);
    } catch {
      setUnreadCount(0);
    }
    try {
      setAvatarUrl(await getSelectedAvatarUrl());
    } catch {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const firstName = greetingName(summary?.user.displayName ?? user?.displayName);
  const memberSince = summary
    ? new Date(summary.user.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;
  const analyses = summary?.stats.totalAnalyses ?? 0;
  const latestGrade = summary?.stats.latestGrade;

  const moreLinks: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; href: string }[] = [
    { icon: "trophy-outline", label: "Leagues", href: "/leagues" },
    { icon: "ribbon-outline", label: "Achievements", href: "/achievements" },
    { icon: "folder-outline", label: "Saved", href: "/saved" },
    { icon: "search-outline", label: "Explore", href: "/explore" },
    { icon: "locate-outline", label: "Shadow Batting", href: "/shadow-batting" },
  ];
  if (user?.role === "COACH" || user?.role === "ADMIN") {
    moreLinks.push({ icon: "flag-outline", label: "Clubs", href: "/clubs" });
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View className="mb-1 h-1 w-10 rounded-full bg-primary" />
            <ScreenTitle>
              {getGreeting()}, {firstName}
            </ScreenTitle>
            {memberSince ? (
              <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
                Member since {memberSince}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            <PressableScale
              onPress={() => router.push("/notifications")}
              hitSlop={8}
              className="relative rounded-full bg-surface dark:bg-surface-dark p-2.5"
              accessibilityLabel={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
            >
              <Ionicons name="notifications-outline" size={20} color={iconColor} />
              {unreadCount > 0 ? (
                <View
                  className="absolute -right-1.5 -top-1.5 items-center justify-center rounded-full bg-danger dark:bg-danger-dark"
                  style={{
                    minWidth: 18,
                    height: 18,
                    paddingHorizontal: unreadCount > 9 ? 5 : 0,
                  }}
                >
                  <Text
                    className="text-[10px] font-bold text-white"
                    numberOfLines={1}
                    style={{ lineHeight: 12 }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </PressableScale>
            <PressableScale
              onPress={() => router.push("/profile")}
              accessibilityLabel="Profile"
              className="overflow-hidden rounded-full"
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-10 w-10 rounded-full bg-surface dark:bg-surface-dark" />
              ) : (
                <InitialsAvatar
                  name={summary?.user.displayName ?? user?.displayName ?? "You"}
                  id={summary?.user.id ?? user?.id}
                />
              )}
            </PressableScale>
          </View>
        </View>

        {error ? (
          <Card className="mt-6">
            <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
          </Card>
        ) : null}

        <Card className="mt-6">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Your progress</Text>
          <Text className="mt-1 font-display text-3xl text-text-primary dark:text-text-primary-dark">
            {analyses === 0
              ? "No analyses yet"
              : `${analyses} session${analyses === 1 ? "" : "s"}${latestGrade ? ` · ${latestGrade}` : ""}`}
          </Text>
          {analyses === 0 ? (
            <Text className="mt-2 text-sm text-text-secondary dark:text-text-secondary-dark">
              Upload a video to start tracking your training.
            </Text>
          ) : (
            <PressableScale onPress={() => router.push("/progress")} className="mt-3 self-start" hitSlop={8}>
              <Text className="text-sm font-medium text-primary">See all progress</Text>
            </PressableScale>
          )}
        </Card>

        <Text className="mb-2 mt-8 text-lg font-semibold text-text-primary dark:text-text-primary-dark">Explore</Text>
        <Card className="mb-8 overflow-hidden p-0">
          {moreLinks.map((link, index) => (
            <View key={link.href}>
              {index > 0 ? <View className="mx-4 h-px bg-surface-secondary dark:bg-surface-secondary-dark" /> : null}
              <PressableScale
                onPress={() => router.push(link.href as never)}
                className="flex-row items-center px-4 py-3.5"
              >
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons name={link.icon} size={18} color="#E63946" />
                </View>
                <Text className="flex-1 text-base text-text-primary dark:text-text-primary-dark">{link.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={iconColor} />
              </PressableScale>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
