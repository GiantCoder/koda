import "../global.css";

import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { Provider } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { store } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { bootstrapAuth } from "@/store/authSlice";
import { initAppTheme } from "@/hooks/useAppTheme";
import { AnimatedSplash } from "@/components/AnimatedSplash";

SplashScreen.preventAutoHideAsync();

// Show alerts while the app is foregrounded too (default behaviour on some
// platforms is to suppress them since the user is already looking at the
// app) -- coaching feedback/messages are worth surfacing either way.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function AuthBootstrapper() {
  const dispatch = useAppDispatch();
  const [bootReady, setBootReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    Promise.all([dispatch(bootstrapAuth()), initAppTheme()]).finally(() => {
      // The native (static) splash screen has been showing since process
      // start; hand off to the animated in-JS splash the instant we have
      // something to render, rather than holding the native one up.
      setBootReady(true);
      SplashScreen.hideAsync();
    });
  }, [dispatch]);

  // Tapping a push notification navigates to the same actionUrl the
  // in-app notifications list already uses (see notifyUser() on the
  // backend). Not every actionUrl written for the web app necessarily has
  // a matching mobile screen (e.g. a couple of older ones point at
  // web-only pages) -- expo-router renders its not-found screen rather
  // than crashing for those, so this is safe to wire unconditionally.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionUrl = response.notification.request.content.data?.actionUrl;
      if (typeof actionUrl === "string" && actionUrl.startsWith("/")) {
        router.push(actionUrl as never);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!bootReady || !introDone) {
    return <AnimatedSplash onFinish={() => setIntroDone(true)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthBootstrapper />
    </Provider>
  );
}
