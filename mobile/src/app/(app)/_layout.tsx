import React from "react";
import { Text, type ColorValue } from "react-native";
import { Tabs } from "expo-router";

/**
 * Phase 2 replaces the single placeholder screen with a real tab bar --
 * the first new navigation concept since Phase 0's Stack-only setup.
 * Icons are plain emoji glyphs in a Text node rather than a vector-icon
 * library: keeps the "hand-rolled, minimal deps" approach from the rest of
 * the app, and a handful of tabs isn't enough to justify a new dependency.
 *
 * Phase 4 added "progress" (grade trend + shot mix). Phase 5 adds
 * "messages" (real conversations, see src/app/messages/[conversationId].tsx)
 * -- Notifications deliberately did NOT get its own tab (six tabs felt like
 * one too many); it's reached via a bell icon on the dashboard instead
 * (src/app/notifications.tsx, a root-level stack screen).
 */
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ color }) => <TabIcon glyph="🎥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <TabIcon glyph="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => <TabIcon glyph="📈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <TabIcon glyph="⚙️" color={color} />,
        }}
      />
    </Tabs>
  );
}
