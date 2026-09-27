import React, { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Input } from "@/components/ui/Input";
import { ScreenTitle } from "@/components/ui/ScreenTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { PressableScale } from "@/components/ui/PressableScale";
import { Ionicons } from "@expo/vector-icons";
import { useSecondaryIconColor } from "@/components/ui/useIconColor";
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
  const iconColor = useSecondaryIconColor();

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
  const [removeTarget, setRemoveTarget] = useState<AssignablePlayer | null>(null);

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

  const handleRemove = useCallback(async () => {
    if (!removeTarget) return;
    const playerId = removeTarget.id;
    setRemovingId(playerId);
    try {
      await removeTeamPlayer(playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      setRemoveTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to remove player");
    } finally {
      setRemovingId(null);
    }
  }, [removeTarget]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <View className="flex-row items-center justify-between px-6 pt-6">
        <ScreenTitle>
          {isParent ? "Your Children" : "Team"}
        </ScreenTitle>
        {isCoach ? (
          <View className="max-w-[60%] flex-row flex-wrap justify-end gap-2">
            <Button variant="secondary" size="sm" onPress={() => router.push("/team/teams")}>
              Teams
            </Button>
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
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
        ) : error ? (
          <Text className="text-sm text-danger dark:text-danger-dark">{error}</Text>
        ) : players.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="people-outline" size={28} color={iconColor} />}
            message={
              isCoach
                ? "No players yet. Tap Add Player to create your first one."
                : isParent
                  ? "No linked children yet."
                  : "Nothing to show here."
            }
            actionLabel={isCoach ? "Add Player" : undefined}
            onAction={isCoach ? () => void openAdd() : undefined}
          />
        ) : (
          <Card className="mb-8 overflow-hidden p-0">
            {players.map((player, index) => (
              <View key={player.id}>
                {index > 0 ? <View className="mx-4 h-px bg-surface-secondary dark:bg-surface-secondary-dark" /> : null}
                <View className="flex-row items-center px-4 py-3.5">
                  <PressableScale
                    onPress={() => router.push(`/players/${player.id}`)}
                    className="min-w-0 flex-1 flex-row items-center"
                  >
                    <InitialsAvatar name={player.displayName} id={player.id} />
                    <Text className="ml-3 flex-1 text-base text-text-primary dark:text-text-primary-dark" numberOfLines={1}>
                      {player.displayName}
                    </Text>
                  </PressableScale>
                  {isCoach || isParent ? (
                    <Pressable
                      onPress={() => setRemoveTarget(player)}
                      disabled={removingId === player.id}
                      hitSlop={8}
                      className="p-1"
                      accessibilityLabel={`More actions for ${player.displayName}`}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color={iconColor} />
                    </Pressable>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={iconColor} />
                  )}
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <ConfirmDialog
        open={removeTarget != null}
        title="Remove player?"
        message={
          removeTarget
            ? `Remove ${removeTarget.displayName} from your team?`
            : "Remove this player from your team?"
        }
        confirmLabel="Remove"
        variant="danger"
        isLoading={removingId != null}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void handleRemove()}
      />

      <FullScreenModal visible={addVisible} onRequestClose={() => setAddVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">Add Player</Text>
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
                  <Text className="mb-1.5 text-sm font-medium text-text-primary dark:text-text-primary-dark">Squad (optional)</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {squads.map((squad) => (
                      <Pressable
                        key={squad.id}
                        onPress={() => setNewSquadId(newSquadId === squad.id ? null : squad.id)}
                        className={`rounded-full border px-4 py-2 ${
                          newSquadId === squad.id ? "border-primary bg-primary" : "border-surface-secondary dark:border-surface-secondary-dark bg-surface dark:bg-surface-dark"
                        }`}
                      >
                        <Text className={newSquadId === squad.id ? "text-sm font-medium text-white" : "text-sm text-text-primary dark:text-text-primary-dark"}>
                          {squad.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {squads && squads.length > 0 && !newSquadId ? (
                <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  No squad selected -- you can still add them to one later from Squads, but until
                  then they won't appear anywhere in your team list.
                </Text>
              ) : null}
              {createError ? <Text className="text-sm text-danger dark:text-danger-dark">{createError}</Text> : null}
              <Button onPress={() => void handleCreate()} isLoading={creating}>
                Add Player
              </Button>
            </View>
          </ScrollView>
      </FullScreenModal>
    </SafeAreaView>
  );
}
