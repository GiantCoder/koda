import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError } from "@/api/client";
import { getAssignablePlayers, type AssignablePlayer } from "@/api/videos";
import { createTeamPlayer, removeTeamPlayer } from "@/api/team";
import { getSquads, type Squad } from "@/api/squads";

/**
 * Real Team tab -- Phase 6. GET /api/team/players is already role-aware
 * (coach: squad roster, parent: linked children, player: just themselves)
 * and already wrapped as getAssignablePlayers() by Phase 3. This screen
 * adds real management on top for coach/admin: add a new player (optionally
 * straight into a squad) and remove one from your roster, both against
 * real, working endpoints.
 *
 * Hidden from PLAYER role entirely (see (app)/_layout.tsx) -- "just
 * yourself" isn't a useful "team" view, and it's already covered by the
 * Profile tab.
 */
export default function TeamScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const isCoach = user?.role === "COACH" || user?.role === "ADMIN";
  const isParent = user?.role === "PARENT";

  const [players, setPlayers] = useState<AssignablePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addVisible, setAddVisible] = useState(false);
  const [squads, setSquads] = useState<Squad[] | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSquadId, setNewSquadId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setPlayers(await getAssignablePlayers());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load your team");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdd = useCallback(async () => {
    setCreateError(null);
    setAddVisible(true);
    if (squads === null) {
      try {
        setSquads(await getSquads());
      } catch {
        setSquads([]);
      }
    }
  }, [squads]);

  const handleCreate = useCallback(async () => {
    const displayName = newName.trim();
    if (!displayName) {
      setCreateError("Name is required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createTeamPlayer({
        displayName,
        email: newEmail.trim() || undefined,
        squadId: newSquadId ?? undefined,
      });
      setAddVisible(false);
      setNewName("");
      setNewEmail("");
      setNewSquadId(null);
      void load();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to add player");
    } finally {
      setCreating(false);
    }
  }, [newName, newEmail, newSquadId, load]);

  const handleRemove = useCallback(async (playerId: string) => {
    setRemovingId(playerId);
    try {
      await removeTeamPlayer(playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to remove player");
    } finally {
      setRemovingId(null);
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-6 pt-6">
        <Text className="text-2xl font-bold text-text-primary">
          {isParent ? "Your Children" : "Team"}
        </Text>
        {isCoach ? (
          <View className="flex-row gap-2">
            <Button variant="secondary" size="sm" onPress={() => router.push("/team/squads")}>
              Squads
            </Button>
            <Button size="sm" onPress={() => void openAdd()}>
              Add Player
            </Button>
          </View>
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
        ) : players.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary">
                {isCoach
                  ? "No players yet. Tap Add Player to create your first one."
                  : isParent
                    ? "No linked children yet."
                    : "Nothing to show here."}
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-1 pb-8">
            {players.map((player) => (
              <Pressable
                key={player.id}
                onPress={() => router.push(`/players/${player.id}`)}
                className="flex-row items-center justify-between rounded-lg p-3"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
                  <Text className="text-base">🏏</Text>
                </View>
                <Text className="ml-3 flex-1 text-text-primary">{player.displayName}</Text>
                {isCoach || isParent ? (
                  <Pressable
                    onPress={() => void handleRemove(player.id)}
                    disabled={removingId === player.id}
                    hitSlop={8}
                    className="p-1"
                  >
                    <Text className="text-xs text-danger">
                      {removingId === player.id ? "…" : "Remove"}
                    </Text>
                  </Pressable>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={addVisible} animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView className="flex-1 bg-surface">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Text className="text-xl font-bold text-text-primary">Add Player</Text>
            <Button variant="ghost" size="sm" onPress={() => setAddVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            <View className="gap-4">
              <Input label="Name" value={newName} onChangeText={setNewName} placeholder="Player's name" />
              <Input
                label="Email (optional)"
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="player@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {squads && squads.length > 0 ? (
                <View>
                  <Text className="mb-1.5 text-sm font-medium text-text-primary">Squad (optional)</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {squads.map((squad) => (
                      <Pressable
                        key={squad.id}
                        onPress={() => setNewSquadId(newSquadId === squad.id ? null : squad.id)}
                        className={`rounded-full border px-4 py-2 ${
                          newSquadId === squad.id ? "border-primary bg-primary" : "border-surface-secondary bg-surface"
                        }`}
                      >
                        <Text className={newSquadId === squad.id ? "text-sm font-medium text-white" : "text-sm text-text-primary"}>
                          {squad.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {squads && squads.length > 0 && !newSquadId ? (
                <Text className="text-xs text-text-secondary">
                  No squad selected -- you can still add them to one later from Squads, but until
                  then they won't appear anywhere in your team list.
                </Text>
              ) : null}
              {createError ? <Text className="text-sm text-danger">{createError}</Text> : null}
              <Button onPress={() => void handleCreate()} isLoading={creating}>
                Add Player
              </Button>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
