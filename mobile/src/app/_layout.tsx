import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import { store } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { bootstrapAuth } from "@/store/authSlice";

SplashScreen.preventAutoHideAsync();

function AuthBootstrapper() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(bootstrapAuth()).finally(() => {
      SplashScreen.hideAsync();
    });
  }, [dispatch]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthBootstrapper />
    </Provider>
  );
}
