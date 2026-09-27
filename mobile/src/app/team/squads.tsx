import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { GroupCoverCard } from "@/components/ui/GroupCoverCard";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { OptionPicker, type Option } from "@/components/ui/OptionPicker";
import { CoverImagePicker } from "@/components/ui/CoverImagePicker";
import { getCoverSrc } from "@/lib/mediaUrl";
import { pickCoverImage } from "@/lib/pickCoverImage";
import { ApiError } from "@/api/client";
import { getAssignablePlayers, type AssignablePlayer } from "@/api/videos";
import {
  getSquads,
  createSquad,
  updateSquad,
  deleteSquad,
  addSquadMember,
  removeSquadMember,
  type Squad,
  type AgeGroup,
} from "@/api/squads";

/**
 * Coach/admin-only squad management -- Phase 6. Wraps the real, working
 * squad CRUD backend (GET/POST /api/squads, PUT/DELETE /api/squads/[id],
 * POST /api/squads/[id]/members, DELETE .../members/[userId]). Reached
 * from the Team tab's "Squads" button; not itself a tab (deferred to a
 * detail push per the user's Phase 6 scoping).
 *
 * Deliberately does not show the `rating` field GET /api/squads returns
 * per member -- it's a fabricated hash of the user's id, unrelated to any
 * real performance data. Skipped rather than surfaced as if real.
 */

const AGE_GROUP_OPTIONS: Option[] = [
  { value: "UNDER_10", label: "U10" },
  { value: "UNDER_12", label: "U12" },
  { value: "UNDER_14", label: "U14" },
  { value: "UNDER_16", label: "U16" },
  { value: "UNDER_18", label: "U18" },
  { value: "SENIOR", label: "Senior" },
];

function ageGroupLabel(ageGroup: AgeGroup | null): string | null {
  return AGE_GROUP_OPTIONS.find((o) => o.value === ageGroup)?.label ?? null;
}

export default function SquadsScreen() {
  const [squads, setSquads] = useState<Squad[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState<AgeGroup | null>(null);
  const [newClubName, setNewClubName] = useState("");
  const [newBannerFileName, setNewBannerFileName] = useState("");
  const [newBannerImageUrl, setNewBannerImageUrl] = useState("");
  const [pickingCreateBanner, setPickingCreateBanner] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailSquadId, setDetailSquadId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAgeGroup, setEditAgeGroup] = useState<AgeGroup | null>(null);
  const [editClubName, setEditClubName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editBannerFileName, setEditBannerFileName] = useState("");
  const [editBannerImageUrl, setEditBannerImageUrl] = useState("");
  const [pickingEditBanner, setPickingEditBanner] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  const [addMemberVisible, setAddMemberVisible] = useState(false);
  const [roster, setRoster] = useState<AssignablePlayer[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const detailSquad = useMemo(
    () => squads?.find((s) => s.id === detailSquadId) ?? null,
    [squads, detailSquadId]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setSquads(await getSquads());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load squads");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setCreateError(null);
    setNewName("");
    setNewAgeGroup(null);
    setNewClubName("");
    setNewBannerFileName("");
    setNewBannerImageUrl("");
    setCreateVisible(true);
  }, []);

  const pickNewBanner = useCallback(async () => {
    setPickingCreateBanner(true);
    setCreateError(null);
    try {
      const picked = await pickCoverImage();
      if (!picked) return;
      setNewBannerFileName(picked.fileName);
      setNewBannerImageUrl(picked.dataUrl);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to pick image");
    } finally {
      setPickingCreateBanner(false);
    }
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
      await createSquad({
        name,
        ageGroup: newAgeGroup ?? undefined,
        clubName: newClubName.trim() || undefined,
        bannerFileName: newBannerFileName || undefined,
        bannerImageUrl: newBannerImageUrl || undefined,
      });
      setCreateVisible(false);
      void load();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create squad");
    } finally {
      setCreating(false);
    }
  }, [newName, newAgeGroup, newClubName, newBannerFileName, newBannerImageUrl, load]);

  const openDetail = useCallback((squad: Squad) => {
    setDetailSquadId(squad.id);
    setEditName(squad.name);
    setEditAgeGroup(squad.ageGroup);
    setEditClubName(squad.clubName ?? "");
    setEditActive(squad.isActive);
    setEditBannerFileName(squad.bannerFileName ?? "");
    setEditBannerImageUrl(squad.bannerImageUrl ?? "");
    setEditError(null);
    setAddMemberVisible(false);
  }, []);

  const pickEditBanner = useCallback(async () => {
    setPickingEditBanner(true);
    setEditError(null);
    try {
      const picked = await pickCoverImage();
      if (!picked) return;
      setEditBannerFileName(picked.fileName);
      setEditBannerImageUrl(picked.dataUrl);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to pick image");
    } finally {
      setPickingEditBanner(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailSquadId(null);
    setAddMemberVisible(false);
    setRoster(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!detailSquad) return;
    const name = editName.trim();
    if (!name) {
      setEditError("Name is required");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateSquad(detailSquad.id, {
        name,
        ageGroup: editAgeGroup,
        clubName: editClubName.trim() || null,
        isActive: editActive,
        bannerFileName: editBannerFileName || null,
        bannerImageUrl: editBannerImageUrl || null,
      });
      void load();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }, [detailSquad, editName, editAgeGroup, editClubName, editActive, editBannerFileName, editBannerImageUrl, load]);

  const handleDelete = useCallback(async () => {
    if (!detailSquad) return;
    setDeleting(true);
    try {
      await deleteSquad(detailSquad.id);
      closeDetail();
      void load();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to delete squad");
      setDeleting(false);
    }
  }, [detailSquad, closeDetail, load]);

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      if (!detailSquad) return;
      setRemovingMemberId(userId);
      try {
        await removeSquadMember(detailSquad.id, userId);
        void load();
      } catch (e) {
        setEditError(e instanceof ApiError ? e.message : "Failed to remove member");
      } finally {
        setRemovingMemberId(null);
      }
    },
    [detailSquad, load]
  );

  const openAddMember = useCallback(async () => {
    setAddMemberVisible(true);
    if (roster === null) {
      try {
        setRoster(await getAssignablePlayers());
      } catch {
        setRoster([]);
      }
    }
  }, [roster]);

  const handleAddMember = useCallback(
    async (playerId: string) => {
      if (!detailSquad) return;
      setAddingId(playerId);
      try {
        await addSquadMember(detailSquad.id, playerId);
        void load();
      } catch (e) {
        setEditError(e instanceof ApiError ? e.message : "Failed to add member");
      } finally {
        setAddingId(null);
      }
    },
    [detailSquad, load]
  );

  const candidateRoster = useMemo(() => {
    if (!roster || !detailSquad) return [];
    const memberIds = new Set(detailSquad.members.map((m) => m.id));
    return roster.filter((p) => !memberIds.has(p.id));
  }, [roster, detailSquad]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Team" />
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Squads</Text>
        <Button size="sm" onPress={openCreate}>
          New Squad
        </Button>
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
        ) : !squads || squads.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                No squads yet. Tap New Squad to create your first one.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3 pb-8">
            {squads.map((squad) => (
              <GroupCoverCard
                key={squad.id}
                title={squad.name}
                subtitle={
                  [ageGroupLabel(squad.ageGroup), squad.clubName].filter(Boolean).join(" · ") ||
                  "No age group or club set"
                }
                coverUri={getCoverSrc(squad)}
                avatarName={squad.name}
                avatarId={squad.id}
                badges={[
                  `${squad.members.length} ${squad.members.length === 1 ? "player" : "players"}`,
                  ...(!squad.isActive ? ["INACTIVE"] : []),
                ]}
                fallbackTint="rgba(45, 106, 79, 0.22)"
                onPress={() => openDetail(squad)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FullScreenModal visible={createVisible} onRequestClose={() => setCreateVisible(false)}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">New Squad</Text>
            <Button variant="ghost" size="sm" onPress={() => setCreateVisible(false)}>
              Close
            </Button>
          </View>
          <ScrollView className="flex-1 px-6 pt-4">
            <View className="gap-4">
              <Input label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. U14 Colts" />
              <OptionPicker
                label="Age group (optional)"
                options={AGE_GROUP_OPTIONS}
                value={newAgeGroup}
                onChange={(v) => setNewAgeGroup(v as AgeGroup)}
              />
              <Input
                label="Club (optional)"
                value={newClubName}
                onChangeText={setNewClubName}
                placeholder="e.g. Riverside CC"
              />
              <CoverImagePicker
                previewUri={newBannerImageUrl}
                isLoading={pickingCreateBanner}
                onPick={() => void pickNewBanner()}
              />
              {createError ? <Text className="text-sm text-danger dark:text-danger-dark">{createError}</Text> : null}
              <Button onPress={() => void handleCreate()} isLoading={creating}>
                Create Squad
              </Button>
            </View>
          </ScrollView>
      </FullScreenModal>

      <FullScreenModal visible={detailSquad !== null} onRequestClose={closeDetail}>
          <View className="flex-row items-center justify-between px-6 pt-2">
            <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">{detailSquad?.name ?? "Squad"}</Text>
            <Button variant="ghost" size="sm" onPress={closeDetail}>
              Close
            </Button>
          </View>
          {detailSquad ? (
            <ScrollView className="flex-1 px-6 pt-4">
              <View className="gap-4">
                <Input label="Name" value={editName} onChangeText={setEditName} />
                <OptionPicker
                  label="Age group"
                  options={AGE_GROUP_OPTIONS}
                  value={editAgeGroup}
                  onChange={(v) => setEditAgeGroup(v as AgeGroup)}
                />
                <Input label="Club" value={editClubName} onChangeText={setEditClubName} />
                <CoverImagePicker
                  previewUri={editBannerImageUrl}
                  isLoading={pickingEditBanner}
                  onPick={() => void pickEditBanner()}
                />
                <Checkbox checked={editActive} onToggle={setEditActive} label="Active squad" />
                {editError ? <Text className="text-sm text-danger dark:text-danger-dark">{editError}</Text> : null}
                <Button onPress={() => void handleSaveEdit()} isLoading={savingEdit}>
                  Save Changes
                </Button>

                <View className="mt-2 border-t border-surface-secondary dark:border-surface-secondary-dark pt-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
                      Members ({detailSquad.members.length})
                    </Text>
                    <Button variant="secondary" size="sm" onPress={() => void openAddMember()}>
                      Add Member
                    </Button>
                  </View>
                  {detailSquad.members.length === 0 ? (
                    <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No members yet.</Text>
                  ) : (
                    <View className="gap-1">
                      {detailSquad.members.map((member) => (
                        <View
                          key={member.id}
                          className="flex-row items-center justify-between rounded-lg p-3"
                        >
                          <Text className="flex-1 text-text-primary dark:text-text-primary-dark">{member.displayName}</Text>
                          <Pressable
                            onPress={() => void handleRemoveMember(member.id)}
                            disabled={removingMemberId === member.id}
                            hitSlop={8}
                            className="p-1"
                          >
                            <Text className="text-xs text-danger dark:text-danger-dark">
                              {removingMemberId === member.id ? "…" : "Remove"}
                            </Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {addMemberVisible ? (
                    <View className="mt-4 rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark p-3">
                      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Add a player</Text>
                      {roster === null ? (
                        <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Loading…</Text>
                      ) : candidateRoster.length === 0 ? (
                        <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                          Everyone on your roster is already in this squad.
                        </Text>
                      ) : (
                        <View className="gap-1">
                          {candidateRoster.map((player) => (
                            <Pressable
                              key={player.id}
                              onPress={() => void handleAddMember(player.id)}
                              disabled={addingId === player.id}
                              className="flex-row items-center justify-between rounded-lg bg-surface dark:bg-surface-dark p-2"
                            >
                              <Text className="text-text-primary dark:text-text-primary-dark">{player.displayName}</Text>
                              <Text className="text-xs text-primary">
                                {addingId === player.id ? "Adding…" : "Add"}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>

                <View className="mt-2 border-t border-surface-secondary dark:border-surface-secondary-dark pt-4">
                  <Button variant="danger" onPress={() => void handleDelete()} isLoading={deleting}>
                    Delete Squad
                  </Button>
                </View>
              </View>
            </ScrollView>
          ) : null}
      </FullScreenModal>
    </SafeAreaView>
  );
}
