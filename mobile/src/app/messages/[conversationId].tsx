import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { Button } from "@/components/ui/Button";
import { useAppSelector } from "@/store/hooks";
import { useConversationMessages } from "@/lib/useConversationMessages";
import { sendMessage, markConversationRead } from "@/api/conversations";

/**
 * Real conversation thread -- Phase 5. Polls for new messages (see
 * src/lib/useConversationMessages.ts) since the backend's redis.publish on
 * send has no subscriber anywhere in the codebase.
 *
 * Safeguarding note: the backend computes a `visibility`/`parentVisibility`
 * flag for messages to minors, but never actually grants a guardian access
 * to anything or gates who can start a conversation with a minor -- see
 * the roadmap doc for the full writeup. The disclosure line below is
 * deliberately neutral and accurate ("only people in this conversation can
 * see these messages", which IS true given the participant-only RBAC on
 * GET /api/conversations) rather than repeating web's UI claim that a
 * parent automatically sees these messages, which is not true today.
 */
export default function ConversationThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const user = useAppSelector((state) => state.auth.user);
  const { messages, loading, error, appendLocal } = useConversationMessages({
    conversationId: conversationId ?? null,
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (conversationId) void markConversationRead(conversationId).catch(() => {});
  }, [conversationId]);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !conversationId) return;
    setDraft("");
    setSending(true);
    try {
      const message = await sendMessage(conversationId, content);
      appendLocal(message);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setDraft(content); // restore the draft so the user doesn't lose it
    } finally {
      setSending(false);
    }
  }, [draft, conversationId, appendLocal]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Messages" />
      <Text className="px-6 pb-2 text-xs text-text-secondary dark:text-text-secondary-dark">
        Only people in this conversation can see these messages.
      </Text>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-6"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {loading ? (
            <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
          ) : error ? (
            <Text className="text-sm text-danger dark:text-danger-dark">{error.message}</Text>
          ) : messages.length === 0 ? (
            <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No messages yet -- say hello.</Text>
          ) : (
            <View className="gap-2 pb-4">
              {messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <View key={message.id} className={`max-w-[80%] ${mine ? "self-end" : "self-start"}`}>
                    {!mine ? (
                      <Text className="mb-0.5 text-xs text-text-secondary dark:text-text-secondary-dark">{message.senderDisplayName}</Text>
                    ) : null}
                    <View className={`rounded-2xl px-3 py-2 ${mine ? "bg-primary" : "bg-surface-secondary dark:bg-surface-secondary-dark"}`}>
                      <Text className={mine ? "text-white" : "text-text-primary dark:text-text-primary-dark"}>{message.content}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-surface-secondary dark:border-surface-secondary-dark px-6 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            multiline
            className="max-h-24 flex-1 rounded-xl border border-surface-secondary dark:border-surface-secondary-dark px-3 py-2 text-text-primary dark:text-text-primary-dark"
          />
          <Button size="sm" onPress={() => void handleSend()} isLoading={sending} disabled={!draft.trim()}>
            Send
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
