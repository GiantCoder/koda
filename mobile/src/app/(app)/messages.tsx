import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/api/client";
import { getConversations, createConversation, type ConversationSummary } from "@/api/conversations";
import { getAssignablePlayers, type AssignablePlayer } from "@/api/videos";

/**
 * Real Messages tab -- Phase 5. Web's equivalent page is 100% mocked
 * (setTimeout + hardcoded conversations, "New Message" does nothing) even
 * though the backend (GET/POST /api/conversations, GET/POST
 * /api/conversations/[id]/messages) is real and fully working. Mobile
 * wires up the real thing.
 *
 * "Start new conversation" is coach/admin-only for v1: the only real
 * "who can I message" list on the backend is GET /api/team/players
 * (a coach's squad), which Phase 3 already wraps as getAssignablePlayers().
 * There's no reciprocal "who is my coach" endpoint for a player/parent to
 * discover a contact, so they can view and reply to conversations a coach
 * starts with them, but can't start a new one themselves yet -- a real gap,
 * not a design preference, documented in the roadmap doc.
 */

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function otherParticipantName(conversation: ConversationSummary, selfId: string | undefined): string {
  const others = conversation.participants.filter((p) => p.id !== selfId);
  if (others.length === 0) return conversation.subject ?? "Conversation";
  return others.map((p) => p.displayName).join(", ");
}

function isUnread(conversation: ConversationSummary, selfId: string | undefined): boolean {
  const last = conversation.lastMessage;
  if (!last || last.senderId === selfId) return false;
  if (!conversation.lastReadAt) return true;
  return new Date(last.sentAt).getTime() > new Date(conversation.lastReadAt).getTime();
}

export default function MessagesScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageVisible, setNewMessageVisible] = useState(false);
  const [contacts, setContacts] = useState<AssignablePlayer[] | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const canStartConversation = user?.role === "COACH" || user?.role === "ADMIN";

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getConversations();
      data.sort((a, b) => {
        const aTime = a.lastMessage?.sentAt ?? a.createdAt;
        const bTime = b.lastMessage?.sentAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setConversations(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load messages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNewMessage = useCallback(async () => {
    setNewMessageVisible(true);
    if (contacts === null) {
      try {
        setContacts(await getAssignablePlayers());
      } catch {
        setContacts([]);
      }
    }
  }, [contacts]);

  const handleStartConversation = useCallback(async (playerId: string) => {
    setCreatingFor(playerId);
    try {
      const conversation = await createConversation([playerId]);
      setNewMessageVisible(false);
      router.push(`/messages/${conversation.id}`);
      void load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to start conversation");
    } finally {
      setCreatingFor(null);
    }
  }, [load]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-6 pt-6">
        <Text className="text-2xl font-bold text-text-primary">Messages</Text>
        {canStartConversation ? (
          <Button size="sm" onPress={() => void openNewMessage()}>
            New Message
          </Button>
        ) : null}
      </View>

      <ScrollView
        className="flex-1 px-6 pt-4"
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
          <Text className="text-sm text-text-secondary">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger">{error}</Text>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary">
                {canStartConversation
                  ? "No conversations yet. Tap New Message to start one with a player."
                  : "No conversations yet. Your coach can start one with you."}
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-1 pb-8">
            {conversations.map((conversation) => {
              const unread = isUnread(conversation, user?.id);
              return (
                <Pressable
                  key={conversation.id}
                  onPress={() => router.push(`/messages/${conversation.id}`)}
                  className="flex-row items-center gap-3 rounded-lg p-3"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
                    <Text className="text-base">💬</Text>
                  </View>
                  <View className="flex-1">
                    <Text className={`text-text-primary ${unread ? "font-bold" : "font-medium"}`} numberOfLines={1}>
                      {otherParticipantName(conversation, user?.id)}
                    </Text>
                    <Text
                      className={`mt-0.5 text-sm ${unread ? "font-semibold text-text-primary" : "text-text-secondary"}`}
                      numberOfLines={1}
                    >
                      {conversation.lastMessage?.content ?? "No messages yet"}
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    {conversation.lastMessage ? (
                      <Text className="text-xs text-text-secondary">{formatTime(conversation.lastMessage.sentAt)}</Text>
                    ) : null}
                    {unread ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={newMessageVisible} animationType="slide" onRequestClose={() => setNewMessageVisible(false)}>
        <SafeAreaView className="flex-1 bg-surface">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Text className="text-xl font-bold text-text-primary">New Message</Text>
            <Button variant="ghost" size="sm" onPress={() => setNewMessageVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            {contacts === null ? (
              <Text className="text-sm text-text-secondary">Loading players…</Text>
            ) : contacts.length === 0 ? (
              <Text className="text-sm text-text-secondary">No players to message yet.</Text>
            ) : (
              <View className="gap-1">
                {contacts.map((player) => (
                  <Pressable
                    key={player.id}
                    onPress={() => void handleStartConversation(player.id)}
                    disabled={creatingFor === player.id}
                    className="flex-row items-center justify-between rounded-lg p-3"
                  >
                    <Text className="text-text-primary">{player.displayName}</Text>
                    {creatingFor === player.id ? <Text className="text-xs text-text-secondary">Starting…</Text> : null}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
