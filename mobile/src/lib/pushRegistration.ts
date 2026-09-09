/**
 * expo-notifications device registration -- Phase 8. Requests permission,
 * fetches an Expo push token, and registers it with the backend (see
 * api/pushNotifications.ts and the new PushToken model/route). Called from
 * authSlice's bootstrapAuth/loginThunk (register) and logoutThunk
 * (unregister), the same places session state itself is established/torn
 * down, rather than a separate effect that has to stay in sync with them.
 *
 * Best-effort throughout: a user who denies the permission, or a simulator
 * with no push capability, should never block sign-in/sign-out -- every
 * failure here is caught and logged, never thrown.
 */
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { registerPushToken, unregisterPushToken } from "@/api/pushNotifications";

const STORED_TOKEN_KEY = "koda_expo_push_token";

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORED_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function registerForPushNotificationsAsync(): Promise<void> {
  try {
    if (!Device.isDevice) {
      // Simulators/emulators can't receive push -- nothing to register.
      return;
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    await SecureStore.setItemAsync(STORED_TOKEN_KEY, token);
  } catch (err) {
    console.warn("[pushRegistration] Failed to register for push notifications:", err);
  }
}

export async function unregisterCurrentPushToken(): Promise<void> {
  try {
    const token = await getStoredToken();
    if (!token) return;
    await unregisterPushToken(token);
    await SecureStore.deleteItemAsync(STORED_TOKEN_KEY);
  } catch (err) {
    console.warn("[pushRegistration] Failed to unregister push token:", err);
  }
}
