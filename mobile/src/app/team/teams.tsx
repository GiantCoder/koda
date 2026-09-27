import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/ui/BackBar";
import { Card, CardContent } from "@/components/ui/Card";
import { GroupCoverCard } from "@/components/ui/GroupCoverCard";
import { Button } from "@/components/ui/Button";
import { FullScreenModal } from "@/components/ui/FullScreenModal";
import { Input } from "@/components/ui/Input";
import { CoverImagePicker } from "@/components/ui/CoverImagePicker";
import { getCoverSrc } from "@/lib/mediaUrl";
import { pickCoverImage } from "@/lib/pickCoverImage";
import { ApiError } from "@/api/client";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  type CoachTeam,
} from "@/api/teams";

export default function TeamsScreen() {
  const [teams, setTeams] = useState<CoachTeam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newSquadHint, setNewSquadHint] = useState("");
  const [newBannerFileName, setNewBannerFileName] = useState("");
  const [newBannerImageUrl, setNewBannerImageUrl] = useState("");
  const [pickingCreateBanner, setPickingCreateBanner] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClubName, setEditClubName] = useState("");
  const [editSquadHint, setEditSquadHint] = useState("");
  const [editBannerFileName, setEditBannerFileName] = useState("");
  const [editBannerImageUrl, setEditBannerImageUrl] = useState("");
  const [pickingEditBanner, setPickingEditBanner] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const detailTeam = useMemo(
    () => teams?.find((team) => team.id === detailTeamId) ?? null,
    [teams, detailTeamId]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setTeams(await getTeams());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load teams");
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
    setNewClubName("");
    setNewSquadHint("");
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
    const clubName = newClubName.trim();
    if (!name || !clubName) {
      setCreateError("Name and club are required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({
        name,
        clubName,
        squadHint: newSquadHint.trim() || undefined,
        bannerFileName: newBannerFileName || undefined,
        bannerImageUrl: newBannerImageUrl || undefined,
      });
      setCreateVisible(false);
      void load();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create team");
    } finally {
      setCreating(false);
    }
  }, [newName, newClubName, newSquadHint, newBannerFileName, newBannerImageUrl, load]);

  const openDetail = useCallback((team: CoachTeam) => {
    setDetailTeamId(team.id);
    setEditName(team.name);
    setEditClubName(team.clubName);
    setEditSquadHint(team.squadHint ?? "");
    setEditBannerFileName(team.bannerFileName ?? "");
    setEditBannerImageUrl(team.bannerImageUrl ?? "");
    setEditError(null);
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

  const handleSaveEdit = useCallback(async () => {
    if (!detailTeam) return;
    const name = editName.trim();
    const clubName = editClubName.trim();
    if (!name || !clubName) {
      setEditError("Name and club are required");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await updateTeam(detailTeam.id, {
        name,
        clubName,
        squadHint: editSquadHint.trim() || null,
        bannerFileName: editBannerFileName || null,
        bannerImageUrl: editBannerImageUrl || null,
      });
      setTeams((current) =>
        current
          ? current.map((team) => (team.id === updated.id ? { ...team, ...updated } : team))
          : [updated]
      );
      setDetailTeamId(updated.id);
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  }, [detailTeam, editName, editClubName, editSquadHint, editBannerFileName, editBannerImageUrl]);

  const handleDelete = useCallback(async () => {
    if (!detailTeam) return;
    setDeleting(true);
    try {
      await deleteTeam(detailTeam.id);
      setDetailTeamId(null);
      void load();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Failed to delete team");
      setDeleting(false);
    }
  }, [detailTeam, load]);

  return (
    <SafeAreaView className="flex-1 bg-surface-secondary dark:bg-surface-secondary-dark" edges={["top", "left", "right"]}>
      <BackBar label="Team" />
      <View className="flex-row items-center justify-between px-6 pt-2">
        <Text className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Teams</Text>
        <Button size="sm" onPress={openCreate}>
          New Team
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
        ) : !teams || teams.length === 0 ? (
          <Card>
            <CardContent>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                No teams yet. Tap New Team to create your first one.
              </Text>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-3 pb-8">
            {teams.map((team) => (
              <GroupCoverCard
                key={team.id}
                title={team.name}
                subtitle={team.clubName}
                coverUri={getCoverSrc(team)}
                avatarName={team.name}
                avatarId={team.id}
                badges={team.squadHint ? [team.squadHint] : []}
                fallbackTint="rgba(230, 57, 70, 0.18)"
                onPress={() => openDetail(team)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FullScreenModal visible={createVisible} onRequestClose={() => setCreateVisible(false)}>
        <View className="flex-row items-center justify-between px-6 pt-2">
          <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">New Team</Text>
          <Button variant="ghost" size="sm" onPress={() => setCreateVisible(false)}>
            Close
          </Button>
        </View>
        <ScrollView className="flex-1 px-6 pt-4">
          <View className="gap-4">
            <Input label="Name" value={newName} onChangeText={setNewName} placeholder="e.g. U14 XI" />
            <Input label="Club" value={newClubName} onChangeText={setNewClubName} placeholder="e.g. Teddington CC" />
            <Input
              label="Squad hint (optional)"
              value={newSquadHint}
              onChangeText={setNewSquadHint}
              placeholder="e.g. Under-14"
            />
            <CoverImagePicker
              previewUri={newBannerImageUrl}
              isLoading={pickingCreateBanner}
              onPick={() => void pickNewBanner()}
            />
            {createError ? <Text className="text-sm text-danger dark:text-danger-dark">{createError}</Text> : null}
            <Button onPress={() => void handleCreate()} isLoading={creating}>
              Create Team
            </Button>
          </View>
        </ScrollView>
      </FullScreenModal>

      <FullScreenModal visible={detailTeam !== null} onRequestClose={() => setDetailTeamId(null)}>
        <View className="flex-row items-center justify-between px-6 pt-2">
          <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">{detailTeam?.name ?? "Team"}</Text>
          <Button variant="ghost" size="sm" onPress={() => setDetailTeamId(null)}>
            Close
          </Button>
        </View>
        {detailTeam ? (
          <ScrollView className="flex-1 px-6 pt-4">
            <View className="gap-4">
              <Input label="Name" value={editName} onChangeText={setEditName} />
              <Input label="Club" value={editClubName} onChangeText={setEditClubName} />
              <Input label="Squad hint" value={editSquadHint} onChangeText={setEditSquadHint} />
              <CoverImagePicker
                previewUri={editBannerImageUrl}
                isLoading={pickingEditBanner}
                onPick={() => void pickEditBanner()}
              />
              {editError ? <Text className="text-sm text-danger dark:text-danger-dark">{editError}</Text> : null}
              <Button onPress={() => void handleSaveEdit()} isLoading={savingEdit}>
                Save Changes
              </Button>
              {detailTeam.persisted !== false ? (
                <Button variant="danger" onPress={() => void handleDelete()} isLoading={deleting}>
                  Delete Team
                </Button>
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </FullScreenModal>
    </SafeAreaView>
  );
}
