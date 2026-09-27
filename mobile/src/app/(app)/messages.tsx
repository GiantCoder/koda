import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { PressableScale } from "@/components/ui/PressableScale";
import { Ionicons } from "@expo/vector-icons";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";
import { ApiError } from "@/api/client";
import {
  getConversations,
  createConversation,
  searchMessages,
  type ConversationSummary,
  type MessageSearchResult,
} from "@/api/conversations";
import { getAssignablePlayers, type AssignablePlayer } from "@/api/videos";
import { getMyCoaches } from "@/api/team";
import { Input } from "@/components/ui/Input";

/**
 * Real Messages tab -- Phase 5. Web's equivalent page is 100% mocked
 * (setTimeout + hardcoded conversations, "New Message" does nothing) even
 * though the backend (GET/POST /api/conversations, GET/POST
 * /api/conversations/[id]/messages) is real and fully working. Mobile
 * wires up the real thing.
 *
 * "Start new conversation" originally shipped coach/admin-only in Phase 5:
 * the only real "who can I message" list on the backend was GET
 * /api/team/players (a coach's squad, wrapped as getAssignablePlayers() by
 * Phase 3) -- there was no reciprocal "who is my coach" endpoint for a
 * player/parent to discover a contact. Phase 6 adds one (GET
 * /api/team/coach, wrapped as getMyCoaches()) specifically to close that
 * gap, so every role can now start a conversation: coach/admin pick from
 * their roster, player/parent pick from their coach(es).
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

function otherParticipantId(conversation: ConversationSummary, selfId: string | undefined): string | undefined {
  return conversation.participants.find((p) => p.id !== selfId)?.id;
}

function isUnread(conversation: ConversationSummary, selfId: string | undefined): boolean {
  const last = conversation.lastMessage;
  if (!last || last.senderId === selfId) return false;
  if (!conversation.lastReadAt) return true;
  return new Date(last.sentAt).getTime() > new Date(conversation.lastReadAt).getTime();
}

export default function MessagesScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const iconColor = useSecondaryIconColor();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageVisible, setNewMessageVisible] = useState(false);
  const [contacts, setContacts] = useState<AssignablePlayer[] | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  // Message search -- wraps the real, working GET /api/messages/search,
  // left unwrapped in Phase 5. Debounced so we're not firing a request on
  // every keystroke.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchMessages(query)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isCoachOrAdmin = user?.role === "COACH" || user?.role === "ADMIN";
  const canStartConversation = true;

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
        setContacts(isCoachOrAdmin ? await getAssignablePlayers() : await getMyCoaches());
      } catch {
        setContacts([]);
      }
    }
  }, [contacts, isCoachOrAdmin]);

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
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-6 pt-6">
        <ScreenTitle>Messages</ScreenTitle>
        {canStartConversation ? (
          <Button size="sm" onPress={() => void openNewMessage()}>
            New Message
          </Button>
        ) : null}
      </View>

      <View className="px-6 pt-4">
        <Input
          placeholder="Search messages…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
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
        {searchQuery.trim() ? (
          searching ? (
            <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Searching…</Text>
          ) : !searchResults || searchResults.length === 0 ? (
            <EmptyState
              icon={<Ionicons name="search-outline" size={28} color={iconColor} />}
              message={`No messages match "${searchQuery.trim()}".`}
            />
          ) : (
            <Card className="mb-8 overflow-hidden p-0">
              {searchResults.map((result, index) => (
                <View key={result.id}>
                  {index > 0 ? <View className="mx-4 h-px bg-surface-secondary dark:bg-surface-secondary-dark" /> : null}
                  <Pressable
                    onPress={() => {
                      setSearchQuery("");
                      router.push(`/messages/${result.conversationId}`);
                    }}
                    className="gap-1 px-4 py-3.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                        {result.sender.displayName}
                      </Text>
                      <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                        {formatTime(result.sentAt)}
                      </Text>
                    </View>
                    <Text className="text-sm text-text-secondary dark:text-text-secondary-dark" numberOfLines={2}>
                      {result.content}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </Card>
          )
        ) : loading ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={28} color={iconColor} />}
            message={
              isCoachOrAdmin
                ? "No conversations yet. Tap New Message to start one with a player."
                : "No conversations yet. Tap New Message to start one with your coach."
            }
            actionLabel="New Message"
            onAction={() => void openNewMessage()}
          />
        ) : (
          <Card className="mb-8 overflow-hidden p-0">
            {conversations.map((conversation, index) => {
              const unread = isUnread(conversation, user?.id);
              const name = otherParticipantName(conversation, user?.id);
              return (
                <View key={conversation.id}>
                  {index > 0 ? <View className="mx-4 h-px bg-surface-secondary dark:bg-surface-secondary-dark" /> : null}
                  <PressableScale
                    onPress={() => router.push(`/messages/${conversation.id}`)}
                    className="flex-row items-center gap-3 px-4 py-3.5"
                  >
                    <InitialsAvatar name={name} id={otherParticipantId(conversation, user?.id)} />
                    <View className="min-w-0 flex-1">
                      <Text className={`text-text-primary dark:text-text-primary-dark ${unread ? "font-bold" : "font-medium"}`} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text
                        className={`mt-0.5 text-sm ${unread ? "font-semibold text-text-primary dark:text-text-primary-dark" : "text-text-secondary dark:text-text-secondary-dark"}`}
                        numberOfLines={1}
                      >
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      {conversation.lastMessage ? (
                        <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{formatTime(conversation.lastMessage.sentAt)}</Text>
                      ) : null}
                      {unread ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}
                    </View>
                  </PressableScale>
                </View>
              );
            })}
          </Card>
        )}
      </ScrollView>

      <FullScreenModal visible={newMessageVisible} onRequestClose={() => setNewMessageVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">New Message</Text>
            <Button variant="ghost" size="sm" onPress={() => setNewMessageVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            {contacts === null ? (
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                {isCoachOrAdmin ? "Loading players…" : "Loading coaches…"}
              </Text>
            ) : contacts.length === 0 ? (
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                {isCoachOrAdmin
                  ? "No players to message yet."
                  : "No coach found yet -- once you're on a squad, your coach will show up here."}
              </Text>
            ) : (
              <Card className="overflow-hidden p-0">
                {contacts.map((player, index) => (
                  <View key={player.id}>
                    {index > 0 ? <View className="mx-4 h-px bg-surface-secondary dark:bg-surface-secondary-dark" /> : null}
                    <Pressable
                      onPress={() => void handleStartConversation(player.id)}
                      disabled={creatingFor === player.id}
                      className="flex-row items-center justify-between px-4 py-3.5"
                    >
                      <View className="min-w-0 flex-1 flex-row items-center gap-3">
                        <InitialsAvatar name={player.displayName} id={player.id} />
                        <Text className="flex-1 text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
                          {player.displayName}
                        </Text>
                      </View>
                      {creatingFor === player.id ? (
                        <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Starting…</Text>
                      ) : null}
                    </Pressable>
                  </View>
                ))}
              </Card>
            )}
          </ScrollView>
      </FullScreenModal>
    </SafeAreaView>
  );
}
