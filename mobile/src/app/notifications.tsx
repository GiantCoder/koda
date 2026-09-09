import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/api/client";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  type KodaNotification,
} from "@/api/notifications";

/**
 * Real notifications screen -- Phase 5. Unlike Messages, web's own
 * notifications page (and its backend) check out as genuinely real: fetch,
 * mark-read, mark-all-read, and delete all hit real, working, ownership-
 * checked endpoints. The only caveat (documented in the roadmap doc, not a
 * mobile concern) is that most NotificationType values are never actually
 * generated server-side -- so this screen will mostly show achievement/
 * card-stat/system-alert notifications, plus new-message notifications as
 * of this phase's small backend addition.
 */

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function NotificationRow({
  notification,
  onPress,
  onDelete,
}: {
  notification: KodaNotification;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-lg p-3 ${notification.isRead ? "" : "bg-primary/5"}`}
    >
      <View className={`mt-1.5 h-2 w-2 rounded-full ${notification.isRead ? "bg-transparent" : "bg-primary"}`} />
      <View className="flex-1">
        <Text className="font-medium text-text-primary dark:text-text-primary-dark">{notification.title}</Text>
        <Text className="mt-0.5 text-sm text-text-secondary dark:text-text-secondary-dark">{notification.message}</Text>
        <Text className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">{timeAgo(notification.createdAt)}</Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={8} className="p-1">
        <Text className="text-text-secondary dark:text-text-secondary-dark">✕</Text>
      </Pressable>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<KodaNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await getNotifications({ limit: 50 });
      setNotifications(page.notifications);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePress = useCallback(async (notification: KodaNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      try {
        await markNotificationRead(notification.id);
      } catch {
        // Non-blocking -- worst case it shows unread again on next refresh.
      }
    }
    // NEW_MESSAGE notifications carry the conversation id in metadata;
    // everything else has no mobile screen to deep-link into yet, so it
    // just marks read in place.
    const conversationId = notification.metadata?.conversationId;
    if (notification.type === "NEW_MESSAGE" && typeof conversationId === "string") {
      router.push(`/messages/${conversationId}`);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      void load();
    }
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      void load();
    }
  }, [load]);

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top", "left", "right"]}>
      <BackBar />
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Notifications</Text>
        {hasUnread ? (
          <Button variant="ghost" size="sm" onPress={handleMarkAllRead}>
            Mark all read
          </Button>
        ) : null}
      </View>

      <ScrollView
        className="flex-1 px-6 pt-2"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {loading ? (
          <Text className="mt-4 text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="mt-4 text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : notifications.length === 0 ? (
          <Card className="mt-4">
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No notifications yet.</Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-1 pb-8">
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onPress={() => void handlePress(n)}
                onDelete={() => void handleDelete(n.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
