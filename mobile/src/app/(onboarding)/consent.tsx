import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { OptionPicker } from "@/components/ui/OptionPicker";
import {
  getConsentStatus,
  requestGuardianConsent,
  resendGuardianConsent,
  type ConsentStatusResponse,
} from "@/api/onboarding";

const RELATIONSHIPS = [
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

const POLL_INTERVAL_MS = 20000;

/**
 * Real guardian-consent flow (see the Phase 1 discussion): this fetches
 * app/api/onboarding/consent/status on mount and shows one of three views --
 * a form (nothing submitted yet), a waiting view (submitted, polling for
 * approval), or a rejected view -- rather than the web app's mock, which
 * fakes approval with a local button tap.
 *
 * Also doubles as the resume point for anyone whose onboarding isn't marked
 * complete: APPROVED / NOT_REQUIRED here means "nothing to do", so this
 * redirects straight on to /privacy without showing any UI.
 */
export default function ConsentScreen() {
  const [phase, setPhase] = useState<"loading" | "form" | "waiting" | "rejected" | "error">("loading");
  const [status, setStatus] = useState<ConsentStatusResponse | null>(null);

  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [relationship, setRelationship] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await getConsentStatus();
      setStatus(result);

      if (result.consentStatus === "APPROVED" || result.consentStatus === "NOT_REQUIRED") {
        router.replace("/(onboarding)/privacy");
        return;
      }
      if (result.consentStatus === "REJECTED") {
        setPhase("rejected");
        return;
      }
      // PENDING
      setPhase(result.guardianEmail ? "waiting" : "form");
    } catch (err) {
      console.error("[onboarding/consent] Failed to load consent status:", err);
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (phase !== "waiting") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(refreshStatus, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, refreshStatus]);

  const isFormValid = guardianName.trim().length > 0 && /\S+@\S+\.\S+/.test(guardianEmail) && relationship && confirmed;

  const handleSubmitConsentRequest = async () => {
    if (!relationship) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await requestGuardianConsent({ guardianName, guardianEmail, guardianRelationship: relationship as never });
      await refreshStatus();
    } catch (err) {
      console.error("[onboarding/consent] Failed to submit consent request:", err);
      setFormError("Couldn't send the consent request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendGuardianConsent();
    } catch (err) {
      console.error("[onboarding/consent] Failed to resend consent email:", err);
    } finally {
      setResending(false);
    }
  };

  if (phase === "loading") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator size="large" color="#208AEF" />
      </SafeAreaView>
    );
  }

  if (phase === "error") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="mb-4 text-center text-sm text-danger">
          Couldn't load your consent status. Check your connection and try again.
        </Text>
        <Button onPress={refreshStatus}>Retry</Button>
      </SafeAreaView>
    );
  }

  if (phase === "waiting") {
    return (
      <SafeAreaView className="flex-1 justify-center bg-surface px-6">
        <Card>
          <CardHeader>Waiting for Guardian Approval</CardHeader>
          <CardContent>
            <Text className="mb-6 text-sm text-text-secondary">
              We've sent a consent request to{" "}
              <Text className="font-medium text-text-primary">{status?.guardianEmail}</Text>. This
              screen checks automatically every 20 seconds, or tap below to check now.
            </Text>
            <View className="gap-3">
              <Button onPress={refreshStatus}>Check status now</Button>
              <Button variant="secondary" onPress={handleResend} isLoading={resending}>
                Resend email
              </Button>
            </View>
          </CardContent>
        </Card>
      </SafeAreaView>
    );
  }

  if (phase === "rejected") {
    return (
      <SafeAreaView className="flex-1 justify-center bg-surface px-6">
        <Card>
          <CardHeader>Consent Was Declined</CardHeader>
          <CardContent>
            <Text className="mb-6 text-sm text-text-secondary">
              Your guardian didn't approve this request. You can send a new request with correct
              details, or reach out to your guardian directly.
            </Text>
            <Button onPress={() => setPhase("form")}>Send a new request</Button>
          </CardContent>
        </Card>
      </SafeAreaView>
    );
  }

  // phase === "form"
  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10">
        <Card>
          <CardHeader>Guardian Consent Required</CardHeader>
          <CardContent>
            <Text className="mb-6 text-sm text-text-secondary">
              Because of your age, we need a parent or guardian to approve your account before you
              can continue.
            </Text>
            <View className="gap-4">
              <Input label="Guardian full name" value={guardianName} onChangeText={setGuardianName} autoCapitalize="words" />
              <Input
                label="Guardian email"
                value={guardianEmail}
                onChangeText={setGuardianEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <OptionPicker label="Relationship" options={RELATIONSHIPS} value={relationship} onChange={setRelationship} />
              <Checkbox
                checked={confirmed}
                onToggle={setConfirmed}
                label="I confirm I am providing my guardian's real contact details."
              />
              {formError ? <Text className="text-sm text-danger">{formError}</Text> : null}
              <Button onPress={handleSubmitConsentRequest} disabled={!isFormValid} isLoading={submitting}>
                Send consent request
              </Button>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
