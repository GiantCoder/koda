import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllStages, getStageIndex, getStageLabel, type AnalysisStage } from "@/lib/analysisStages";

interface ProcessingTimelineProps {
  currentStage: AnalysisStage;
  error?: string | null;
  activityType?: string | null;
}

/**
 * Simplified native counterpart to app/components/analysis/ProcessingStageCard.tsx:
 * a vertical list of pipeline stages with a checkmark for done, a spinner
 * for the active stage, a plain dot for upcoming ones, and a red marker at
 * the point of failure.
 */
export function ProcessingTimeline({ currentStage, error, activityType }: ProcessingTimelineProps) {
  const stages = getAllStages();
  const isFailed = currentStage === "failed" || !!error;
  const currentIndex = isFailed ? -1 : getStageIndex(currentStage);

  return (
    <View className="gap-1">
      {stages.map((stage, index) => {
        const isComplete = !isFailed && index < currentIndex;
        const isActive = !isFailed && index === currentIndex && currentStage !== "complete";
        const isDoneFinal = !isFailed && currentStage === "complete" && index <= currentIndex;
        const failedHere = isFailed && index === Math.max(0, getStageIndex(currentStage));

        return (
          <View key={stage} className="flex-row items-center gap-3 py-2">
            <View className="h-6 w-6 items-center justify-center">
              {failedHere ? (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-danger dark:bg-danger-dark">
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </View>
              ) : isComplete || isDoneFinal ? (
                <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : isActive ? (
                <ActivityIndicator size="small" color="#E63946" />
              ) : (
                <View className="h-4 w-4 rounded-full border-2 border-surface-secondary dark:border-surface-secondary-dark" />
              )}
            </View>
            <Text
              className={
                isActive || isComplete || isDoneFinal
                  ? "font-medium text-text-primary dark:text-text-primary-dark"
                  : failedHere
                    ? "font-medium text-danger dark:text-danger-dark"
                    : "text-text-secondary dark:text-text-secondary-dark"
              }
            >
              {getStageLabel(stage, activityType)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
