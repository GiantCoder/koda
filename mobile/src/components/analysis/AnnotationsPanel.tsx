import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";
import type { Annotation } from "@/api/analysis";

interface AnnotationsPanelProps {
  annotations: Annotation[];
  canCreate: boolean;
  onCreate: (input: { timestampMs: number; content: string }) => Promise<void>;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Real, working CRUD against GET/POST /api/analysis/[id]/annotations --
 * coach-authored timestamped comments on a video, with a private/public
 * flag already respected server-side. Kept simple for v1: a plain "minutes:
 * seconds" text field for the timestamp rather than a live "capture current
 * playback position" button (would need the video player ref threaded down
 * from the parent screen) -- straightforward to add later.
 */
export function AnnotationsPanel({ annotations, canCreate, onCreate }: AnnotationsPanelProps) {
  const iconColor = useSecondaryIconColor();
  const [minutes, setMinutes] = useState("0");
  const [seconds, setSeconds] = useState("0");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const mins = Math.max(0, parseInt(minutes, 10) || 0);
    const secs = Math.max(0, parseInt(seconds, 10) || 0);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Comment can't be empty");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({ timestampMs: (mins * 60 + secs) * 1000, content: trimmed });
      setContent("");
      setMinutes("0");
      setSeconds("0");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader icon={<Ionicons name="chatbubble-ellipses-outline" size={18} color={iconColor} />}>
        Coach Comments
      </CardHeader>
      <CardContent className="gap-3">
        {annotations.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No comments yet.</Text>
        ) : (
          annotations.map((a) => (
            <View key={a.id} className="rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark p-3">
              <Text className="text-xs font-medium text-primary">{formatTimestamp(a.timestampMs)}</Text>
              <Text className="mt-1 text-sm text-text-primary dark:text-text-primary-dark">{a.content}</Text>
              {a.isPrivate ? <Text className="mt-1 text-[10px] text-text-secondary dark:text-text-secondary-dark">Private</Text> : null}
            </View>
          ))
        )}

        {canCreate ? (
          <View className="mt-2 gap-2 border-t border-surface-secondary dark:border-surface-secondary-dark pt-3">
            <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Add a comment</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                className="w-14 rounded-md border border-surface-secondary dark:border-surface-secondary-dark px-2 py-1 text-center text-text-primary dark:text-text-primary-dark"
              />
              <Text className="text-text-secondary dark:text-text-secondary-dark">min</Text>
              <TextInput
                value={seconds}
                onChangeText={setSeconds}
                keyboardType="number-pad"
                className="w-14 rounded-md border border-surface-secondary dark:border-surface-secondary-dark px-2 py-1 text-center text-text-primary dark:text-text-primary-dark"
              />
              <Text className="text-text-secondary dark:text-text-secondary-dark">sec</Text>
            </View>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="What did you notice at this point?"
              multiline
              className="min-h-[64px] rounded-md border border-surface-secondary dark:border-surface-secondary-dark px-3 py-2 text-text-primary dark:text-text-primary-dark"
            />
            {error ? <Text className="text-xs text-danger dark:text-danger-dark">{error}</Text> : null}
            <Button size="sm" onPress={handleSubmit} isLoading={submitting} className="self-start">
              Add Comment
            </Button>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
