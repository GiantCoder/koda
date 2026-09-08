/**
 * Tiny local flag for "has this device finished onboarding". There's no
 * server-side equivalent yet -- the backend tracks consent/privacy/profile
 * as independent pieces of state but nothing that says "onboarding done"
 * (the web app fakes this the same way, with a localStorage flag). Kept in
 * SecureStore purely for consistency with tokenStore.ts, not because this
 * value is sensitive.
 *
 * Known limitation: this doesn't track *which* onboarding step was last
 * completed, just done/not-done. A user who force-quits mid-onboarding
 * (e.g. while waiting days for guardian approval) resumes at the consent
 * step if still pending, or the privacy step otherwise -- see
 * src/app/index.tsx. Good enough for Phase 1; worth revisiting if that
 * turns out to be annoying in practice.
 */
import * as SecureStore from "expo-secure-store";

const ONBOARDING_COMPLETE_KEY = "koda_onboarding_complete";

export async function getOnboardingComplete(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY)) === "true";
  } catch (err) {
    console.warn("[onboardingStore] Failed to read onboarding flag:", err);
    return false;
  }
}

export async function setOnboardingComplete(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, value ? "true" : "false");
  } catch (err) {
    console.warn("[onboardingStore] Failed to persist onboarding flag:", err);
  }
}

export async function clearOnboardingComplete(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY);
  } catch (err) {
    console.warn("[onboardingStore] Failed to clear onboarding flag:", err);
  }
}
