import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { GroupCoverCard } from "@/components/ui/GroupCoverCard";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { PressableScale } from "@/components/ui/PressableScale";
import { Ionicons } from "@expo/vector-icons";
import { Input } from "@/components/ui/Input";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { ApiError } from "@/api/client";
import { getMyLeagues, createLeague, joinLeague, type MyLeague, type AgeGroup } from "@/api/leagues";

/**
 * Leagues -- Phase 7. Real, end-to-end feature: points are genuinely
 * awarded to every league a user belongs to on each completed analysis
 * (workers/analysisWorker.ts -> lib/gamification/leagues.ts), and ranks
 * are recalculated on a cron. Reached from the Dashboard's quick-links
 * (not its own tab -- same "root-level stack screen" pattern as
 * Notifications/Squads) since this is the first of several new Phase 7
 * areas and a 6th+ tab wasn't worth it.
 *
 * Any authenticated user can create a CUSTOM league (no coach/admin gate
 * on the backend, unlike Squads/Clubs) -- the creator gets a 6-character
 * join code to share with whoever they want in the league.
 */

const AGE_GROUP_OPTIONS: Option[] = [
  { value: "UNDER_10", label: "U10" },
  { value: "UNDER_12", label: "U12" },
  { value: "UNDER_14", label: "U14" },
  { value: "UNDER_16", label: "U16" },
  { value: "UNDER_18", label: "U18" },
  { value: "SENIOR", label: "Senior" },
];

const SEASON_LENGTH_OPTIONS: Option[] = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

export default function LeaguesScreen() {
  const [leagues, setLeagues] = useState<MyLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [joinVisible, setJoinVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState<AgeGroup | null>(null);
  const [newSeasonLength, setNewSeasonLength] = useState("30");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setLeagues(await getMyLeagues());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load leagues");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (code.length !== 6) {
      setJoinError("Join codes are 6 characters");
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const result = await joinLeague(code);
      setJoinVisible(false);
      setJoinCode("");
      void load();
      router.push(`/leagues/${result.league.id}`);
    } catch (e) {
      setJoinError(e instanceof ApiError ? e.message : "Failed to join league");
    } finally {
      setJoining(false);
    }
  }, [joinCode, load]);

  const openCreate = useCallback(() => {
    setNewName("");
    setNewAgeGroup(null);
    setNewSeasonLength("30");
    setCreateError(null);
    setCreatedJoinCode(null);
    setCreateVisible(true);
  }, []);

  const handleCreate = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      setCreateError("Name is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const result = await createLeague({
        name,
        ageGroup: newAgeGroup ?? undefined,
        seasonLengthDays: Number(newSeasonLength) as 30 | 60 | 90,
      });
      setCreatedJoinCode(result.league.joinCode);
      void load();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create league");
    } finally {
      setCreating(false);
    }
  }, [newName, newAgeGroup, newSeasonLength, load]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Dashboard" />
      <View className="flex-row items-center justify-between px-6 pt-2">
        <ScreenTitle>Leagues</ScreenTitle>
        <View className="flex-row gap-2">
          <Button variant="secondary" size="sm" onPress={() => setJoinVisible(true)}>
            Join
          </Button>
          <Button size="sm" onPress={openCreate}>
            Create
          </Button>
        </View>
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
        <PressableScale onPress={() => router.push("/leagues/global")} className="mb-4">
          <Card className="bg-primary/10">
            <CardContent>
              <View className="flex-row items-center gap-2">
                <Ionicons name="globe-outline" size={18} color="#E63946" />
                <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">Koda Global Leaderboard</Text>
              </View>
              <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
                Browse the top players in your age group across all of Koda.
              </Text>
            </CardContent>
          </Card>
        </PressableScale>

        {loading ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : leagues.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                You're not in any leagues yet. Join one with a code, or create your own.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3 pb-8">
            {leagues.map((league) => (
              <GroupCoverCard
                key={league.id}
                title={league.name}
                subtitle={
                  league.currentSeason
                    ? `Rank ${league.userRank ?? "—"} of ${league.memberCount}`
                    : "No active season"
                }
                avatarName={league.name}
                avatarId={league.id}
                badges={[league.scope]}
                fallbackTint={
                  league.scope === "CLUB"
                    ? "rgba(45, 106, 79, 0.22)"
                    : league.scope === "GLOBAL"
                      ? "rgba(230, 57, 70, 0.18)"
                      : "rgba(26, 26, 46, 0.16)"
                }
                onPress={() => router.push(`/leagues/${league.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FullScreenModal visible={joinVisible} onRequestClose={() => setJoinVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">Join a League</Text>
            <Button variant="ghost" size="sm" onPress={() => setJoinVisible(false)}>
              Close
            </Button>
          </View>
          <View className="gap-4 px-6 pt-4">
            <Input
              label="Join code"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              placeholder="e.g. AB12CD"
              autoCapitalize="characters"
              maxLength={6}
            />
            {joinError ? <Text className="text-sm text-danger dark:text-danger-dark">{joinError}</Text> : null}
            <Button onPress={() => void handleJoin()} isLoading={joining}>
              Join League
            </Button>
          </View>
      </FullScreenModal>

      <FullScreenModal visible={createVisible} onRequestClose={() => setCreateVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">Create a League</Text>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setCreateVisible(false);
                if (createdJoinCode) router.push("/leagues");
              }}
            >
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            {createdJoinCode ? (
              <View className="items-center gap-3 py-8">
                <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">League created! Share this code to invite others:</Text>
                <Text className="text-3xl font-bold tracking-widest text-primary">{createdJoinCode}</Text>
                <Button
                  onPress={() => {
                    setCreateVisible(false);
                    void load();
                  }}
                >
                  Done
                </Button>
              </View>
            ) : (
              <View className="gap-4">
                <Input label="League name" value={newName} onChangeText={setNewName} placeholder="e.g. Riverside Colts" />
                <OptionPicker
                  label="Age group (optional)"
                  options={AGE_GROUP_OPTIONS}
                  value={newAgeGroup}
                  onChange={(v) => setNewAgeGroup(v as AgeGroup)}
                />
                <OptionPicker
                  label="Season length"
                  options={SEASON_LENGTH_OPTIONS}
                  value={newSeasonLength}
                  onChange={setNewSeasonLength}
                />
                {createError ? <Text className="text-sm text-danger dark:text-danger-dark">{createError}</Text> : null}
                <Button onPress={() => void handleCreate()} isLoading={creating}>
                  Create League
                </Button>
              </View>
            )}
          </ScrollView>
      </FullScreenModal>
    </SafeAreaView>
  );
}
