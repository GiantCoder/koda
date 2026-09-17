import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAppSelector } from "@/store/hooks";

/**
 * Phase 2 replaces the single placeholder screen with a real tab bar --
 * the first new navigation concept since Phase 0's Stack-only setup.
 *
 * Phase 4 added "progress" (grade trend + shot mix). Phase 5 adds
 * "messages" (real conversations, see src/app/messages/[conversationId].tsx)
 * -- Notifications deliberately did NOT get its own tab (six tabs felt like
 * one too many); it's reached via a bell icon on the dashboard instead
 * (src/app/notifications.tsx, a root-level stack screen).
 *
 * Phase 6 adds "team" -- hidden for PLAYER (a roster of "just yourself"
 * isn't useful, and it's already covered by Profile) via `href: null`,
 * which removes both the tab button and route access without needing a
 * second layout tree.
 */
export default function AppLayout() {
  const user = useAppSelector((state) => state.auth.user);
  const showTeamTab = user?.role !== "PLAYER";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2D6A4F",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          href: showTeamTab ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
