import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { BackBar } from "@/components/ui/BackBar";
import { Button } from "@/components/ui/Button";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { ApiError } from "@/api/client";
import {
  uploadShadowBattingClip,
  SHOT_TYPES,
  DURATION_OPTIONS,
  PREP_TIME_OPTIONS,
} from "@/api/shadowBatting";

/**
 * Shadow Batting -- Phase 7. The one genuinely new native capability this
 * phase needed: web records via getUserMedia + MediaRecorder with a
 * prep-countdown + duration-countdown overlay; mobile's equivalent is
 * expo-camera's CameraView + recordAsync, which this screen drives with
 * the same two-stage countdown UX. Uploads to the same shared analysis
 * pipeline as normal uploads (see api/shadowBatting.ts), so once queued it
 * hands off to the existing processing/results screens unchanged.
 */

const SHOT_TYPE_OPTIONS: Option[] = SHOT_TYPES.map((s) => ({ value: s.value, label: s.label }));
const DURATION_PICKER_OPTIONS: Option[] = DURATION_OPTIONS.map((d) => ({ value: String(d), label: `${d}s` }));
const PREP_PICKER_OPTIONS: Option[] = PREP_TIME_OPTIONS.map((p) => ({ value: String(p), label: `${p}s` }));

type Phase = "setup" | "countdown" | "recording" | "uploading";

export default function ShadowBattingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [shotType, setShotType] = useState<string | null>(null);
  const [duration, setDuration] = useState(15);
  const [prepTime, setPrepTime] = useState(3);

  const [phase, setPhase] = useState<Phase>("setup");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  const beginSession = useCallback(async () => {
    if (!shotType) {
      setError("Choose a shot type first");
      return;
    }
    setError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError("Camera access is needed to record a shadow batting clip.");
        return;
      }
    }
    setPhase("countdown");
    setCountdown(prepTime);
  }, [shotType, permission, requestPermission, prepTime]);

  // Prep countdown -> start recording
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      void startRecording();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setPhase("recording");
    setCountdown(duration);
    countdownTimer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1 && countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
        return c - 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: duration });
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
      if (!video) {
        throw new Error("Recording did not produce a video file");
      }
      await handleUpload(video.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording failed");
      setPhase("setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const stopEarly = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const handleUpload = useCallback(
    async (fileUri: string) => {
      if (!shotType) return;
      setPhase("uploading");
      try {
        const result = await uploadShadowBattingClip({
          fileUri,
          fileName: `shadow-batting-${Date.now()}.mp4`,
          mimeType: "video/mp4",
          shotType,
          durationSeconds: duration,
        });
        router.replace(`/analysis/${result.id}/processing`);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Upload failed -- check your connection and try again.");
        setPhase("setup");
      }
    },
    [shotType, duration]
  );

  if (phase === "setup") {
    return (
      <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
        <BackBar label="Dashboard" />
        <ScrollView className="flex-1 px-6">
          <Text className="pt-2 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Shadow Batting</Text>
          <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
            Record yourself practicing a shot without a ball -- it goes through the same real
            coaching analysis as an uploaded video.
          </Text>
          <View className="mt-6 gap-4 pb-10">
            <OptionPicker label="Shot type" options={SHOT_TYPE_OPTIONS} value={shotType} onChange={setShotType} />
            <OptionPicker
              label="Recording length"
              options={DURATION_PICKER_OPTIONS}
              value={String(duration)}
              onChange={(v) => setDuration(Number(v))}
            />
            <OptionPicker
              label="Prep time before recording starts"
              options={PREP_PICKER_OPTIONS}
              value={String(prepTime)}
              onChange={(v) => setPrepTime(Number(v))}
            />
            {error ? <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text> : null}
            <Button onPress={() => void beginSession()}>Start</Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" mode="video" mirror />
      <SafeAreaView className="absolute inset-0" edges={["top", "bottom"]} pointerEvents="box-none">
        <View className="flex-row justify-start px-6 pt-2">
          {phase !== "uploading" ? (
            <Pressable
              onPress={() => {
                if (countdownTimer.current) clearInterval(countdownTimer.current);
                setPhase("setup");
              }}
              className="rounded-full bg-black/50 px-4 py-2"
            >
              <Text className="font-medium text-white">Cancel</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 items-center justify-center">
          {phase === "countdown" ? (
            <Text className="text-8xl font-bold text-white" style={{ textShadowColor: "black", textShadowRadius: 8 }}>
              {countdown}
            </Text>
          ) : phase === "recording" ? (
            <View className="items-center gap-4">
              <View className="flex-row items-center gap-2 rounded-full bg-black/50 px-4 py-2">
                <View className="h-2.5 w-2.5 rounded-full bg-danger dark:bg-danger-dark" />
                <Text className="font-semibold text-white">{countdown}s</Text>
              </View>
            </View>
          ) : phase === "uploading" ? (
            <View className="items-center gap-3 rounded-lg bg-black/60 px-6 py-4">
              <Text className="font-semibold text-white">Uploading your clip…</Text>
            </View>
          ) : null}
        </View>

        <View className="items-center pb-8">
          {phase === "recording" ? (
            <Pressable onPress={stopEarly} className="h-16 w-16 items-center justify-center rounded-full bg-white">
              <View className="h-6 w-6 rounded bg-danger dark:bg-danger-dark" />
            </Pressable>
          ) : null}
          {error ? (
            <Text className="mt-3 max-w-[80%] text-center text-sm text-white">{error}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
