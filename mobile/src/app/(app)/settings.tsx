import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutThunk } from "@/store/authSlice";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppTheme, type ThemePreference } from "@/hooks/useAppTheme";
import { getPrivacyPreferences, updatePrivacyPreferences } from "@/api/onboarding";
import { getEcbKeyStatus, saveEcbKey, validateEcbKey, removeEcbKey, type EcbKeyStatus } from "@/api/ecbApiKey";
import { ApiError } from "@/api/client";

const VISIBILITY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "COACHES_PARENTS", label: "Coaches & Parents" },
  { value: "COACHES_ONLY", label: "Coaches Only" },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Match device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg bg-surface-secondary dark:bg-surface-secondary-dark p-4">
      <View className="mr-4 flex-1">
        <Text className="font-medium text-text-primary dark:text-text-primary-dark">{title}</Text>
        <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

/**
 * Real Settings screen. Deliberately narrower than the web app's combined
 * Profile & Settings page, which mixes a few genuinely working features in
 * with a lot of pure UI mock (a hardcoded "Head Coach at Riverside CC" team
 * card, a hardcoded linked-child card, notification toggles with no backend
 * at all, and a dev-only role switcher). Per the Phase 2 scoping decision,
 * none of that ships here -- only what's backed by a real endpoint:
 * Account info, Privacy & Consent (now with a real GET, added alongside
 * this screen -- see app/api/onboarding/privacy/route.ts), the coach-only
 * Play-Cricket/ECB integration, and sign out. Personal-details *editing*
 * lives on the Profile tab, not duplicated here.
 */
export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isCoach = user?.role === "COACH";
  const { preference: themePreference, setPreference: setThemePreference } = useAppTheme();

  // Privacy & consent
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [comms, setComms] = useState(true);
  const [visibility, setVisibility] = useState("COACHES_PARENTS");
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySaved, setPrivacySaved] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getPrivacyPreferences()
      .then((prefs) => {
        if (!isMounted) return;
        setAnalytics(prefs.performanceAnalytics);
        setMarketing(prefs.marketingCommunications);
        setComms(prefs.coachParentComms);
        setVisibility(prefs.profileVisibility);
      })
      .catch((err) => {
        console.error("[settings] Failed to load privacy preferences:", err);
      })
      .finally(() => {
        if (isMounted) setPrivacyLoaded(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSavePrivacy = async () => {
    setPrivacySaving(true);
    setPrivacyError(null);
    setPrivacySaved(false);
    try {
      await updatePrivacyPreferences({
        performanceAnalytics: analytics,
        marketingCommunications: marketing,
        coachParentComms: comms,
        profileVisibility: visibility as never,
      });
      setPrivacySaved(true);
    } catch (err) {
      console.error("[settings] Failed to save privacy preferences:", err);
      setPrivacyError("Couldn't save your preferences. Please try again.");
    } finally {
      setPrivacySaving(false);
    }
  };

  // Coach-only Play-Cricket / ECB API key
  const [ecbKey, setEcbKey] = useState<EcbKeyStatus>({ hasKey: false, maskedKey: null, verifiedAt: null });
  const [ecbInput, setEcbInput] = useState("");
  const [ecbShowInput, setEcbShowInput] = useState(false);
  const [ecbSaving, setEcbSaving] = useState(false);
  const [ecbValidating, setEcbValidating] = useState(false);
  const [ecbError, setEcbError] = useState<string | null>(null);
  const [ecbSuccess, setEcbSuccess] = useState<string | null>(null);
  const [confirmRemoveEcbKey, setConfirmRemoveEcbKey] = useState(false);

  const refreshEcbStatus = useCallback(() => {
    if (!isCoach) return;
    getEcbKeyStatus()
      .then(setEcbKey)
      .catch((err) => console.error("[settings] Failed to load ECB key status:", err));
  }, [isCoach]);

  useEffect(() => {
    refreshEcbStatus();
  }, [refreshEcbStatus]);

  const handleSaveEcbKey = async () => {
    if (!ecbInput.trim()) return;
    setEcbSaving(true);
    setEcbError(null);
    setEcbSuccess(null);
    try {
      const result = await saveEcbKey(ecbInput.trim());
      setEcbKey({ hasKey: true, maskedKey: result.maskedKey, verifiedAt: null });
      setEcbInput("");
      setEcbShowInput(false);
      setEcbSuccess("Key saved. Verifying…");
      const validated = await validateEcbKey();
      if (validated.valid) {
        setEcbKey((prev) => ({ ...prev, verifiedAt: validated.verifiedAt }));
        setEcbSuccess("Key saved and verified successfully.");
      } else {
        setEcbSuccess("Key saved. You can verify it later.");
      }
    } catch (err) {
      setEcbError(err instanceof ApiError ? err.message : "Failed to save key.");
    } finally {
      setEcbSaving(false);
    }
  };

  const handleValidateEcbKey = async () => {
    setEcbValidating(true);
    setEcbError(null);
    setEcbSuccess(null);
    try {
      const result = await validateEcbKey();
      if (result.valid) {
        setEcbKey((prev) => ({ ...prev, verifiedAt: result.verifiedAt }));
        setEcbSuccess("Key verified successfully.");
      } else if (result.reason === "invalid_key") {
        setEcbError("Your key was rejected by Play-Cricket. Please check you've copied it correctly.");
      } else {
        setEcbError("Could not reach the Play-Cricket API. Please try again in a few minutes.");
      }
    } catch {
      setEcbError("Could not reach the Play-Cricket API. Please try again in a few minutes.");
    } finally {
      setEcbValidating(false);
    }
  };

  const handleRemoveEcbKey = async () => {
    setConfirmRemoveEcbKey(false);
    try {
      await removeEcbKey();
      setEcbKey({ hasKey: false, maskedKey: null, verifiedAt: null });
      setEcbSuccess("API key removed.");
    } catch {
      setEcbError("Failed to remove key.");
    }
  };

  // Sign out
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top", "left", "right"]}>
      <ScrollView className="flex-1 px-6 pt-6">
        <Text className="mb-6 text-2xl font-bold text-text-primary dark:text-text-primary-dark">Settings</Text>

        <Card className="mb-6">
          <CardHeader>Account</CardHeader>
          <CardContent className="gap-3">
            <Input label="Email" value={user?.email ?? ""} editable={false} />
            <Input label="Role" value={user?.role ?? ""} editable={false} className="capitalize" />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>Appearance</CardHeader>
          <CardContent>
            <OptionPicker
              label="Theme"
              options={THEME_OPTIONS}
              value={themePreference}
              onChange={(next) => setThemePreference(next as ThemePreference)}
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>Privacy &amp; Consent</CardHeader>
          <CardContent>
            {!privacyLoaded ? (
              <ActivityIndicator className="py-4" />
            ) : (
              <View className="gap-3">
                <ToggleRow
                  title="Performance & analytics"
                  description="Helps us improve the product."
                  value={analytics}
                  onChange={setAnalytics}
                />
                <ToggleRow
                  title="Marketing updates"
                  description="Product news and offers."
                  value={marketing}
                  onChange={setMarketing}
                />
                <ToggleRow
                  title="Coach-parent communication"
                  description="Messaging between coaches and parents."
                  value={comms}
                  onChange={setComms}
                />
                <OptionPicker
                  label="Profile visibility"
                  options={VISIBILITY_OPTIONS}
                  value={visibility}
                  onChange={setVisibility}
                />
              </View>
            )}
            {privacyError ? <Text className="mt-3 text-sm text-danger dark:text-danger-dark">{privacyError}</Text> : null}
            {privacySaved ? <Text className="mt-3 text-sm text-emerald-700">Preferences saved.</Text> : null}
            <Button className="mt-4" onPress={handleSavePrivacy} isLoading={privacySaving} disabled={!privacyLoaded}>
              Save preferences
            </Button>
          </CardContent>
        </Card>

        {isCoach ? (
          <Card className="mb-6">
            <CardHeader>Play-Cricket / ECB Integration</CardHeader>
            <CardContent>
              <Text className="mb-3 text-sm text-text-secondary dark:text-text-secondary-dark">
                Connect your ECB API key to import players and match data from Play-Cricket.
              </Text>

              {ecbKey.hasKey && !ecbShowInput ? (
                <View className="gap-2">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        ecbKey.verifiedAt
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}
                    >
                      {ecbKey.verifiedAt ? "✓ Connected" : "⚠ Not verified"}
                    </Text>
                    <Text className="font-mono text-sm text-text-secondary dark:text-text-secondary-dark">{ecbKey.maskedKey}</Text>
                  </View>
                  <View className="flex-row gap-4">
                    <Button variant="ghost" size="sm" onPress={() => setEcbShowInput(true)}>
                      Replace key
                    </Button>
                    <Button variant="ghost" size="sm" onPress={() => setConfirmRemoveEcbKey(true)}>
                      Remove
                    </Button>
                  </View>
                  {!ecbKey.verifiedAt ? (
                    <Button size="sm" isLoading={ecbValidating} onPress={handleValidateEcbKey}>
                      Validate now
                    </Button>
                  ) : null}
                </View>
              ) : (
                <View className="gap-2">
                  <Input
                    placeholder="Paste your ECB API key here…"
                    value={ecbInput}
                    onChangeText={setEcbInput}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                  <Button isLoading={ecbSaving} disabled={!ecbInput.trim()} onPress={handleSaveEcbKey}>
                    Save key
                  </Button>
                </View>
              )}

              {ecbError ? <Text className="mt-2 text-sm text-danger dark:text-danger-dark">{ecbError}</Text> : null}
              {ecbSuccess ? <Text className="mt-2 text-sm text-emerald-700">{ecbSuccess}</Text> : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="mb-10">
          <CardContent>
            <Button variant="danger" onPress={() => setConfirmingSignOut(true)}>
              Sign out
            </Button>
          </CardContent>
        </Card>
      </ScrollView>

      <ConfirmDialog
        open={confirmRemoveEcbKey}
        title="Remove ECB API key?"
        message="You can add it again later."
        confirmLabel="Remove"
        variant="danger"
        onCancel={() => setConfirmRemoveEcbKey(false)}
        onConfirm={handleRemoveEcbKey}
      />

      <ConfirmDialog
        open={confirmingSignOut}
        title="Sign out of Koda?"
        message="You'll need to sign back in next time."
        confirmLabel="Sign out"
        variant="danger"
        isLoading={isSigningOut}
        onCancel={() => setConfirmingSignOut(false)}
        onConfirm={() => {
          setConfirmingSignOut(false);
          setIsSigningOut(true);
          dispatch(logoutThunk()).finally(() => setIsSigningOut(false));
        }}
      />
    </SafeAreaView>
  );
}
