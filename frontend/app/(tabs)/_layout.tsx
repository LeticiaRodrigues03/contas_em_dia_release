import Ionicons from "@react-native-vector-icons/ionicons";
import { Redirect, router, Tabs } from "expo-router";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { useBills } from "@/src/hooks/use-bills";
import { getPermissionState, notificationsSupported, syncReminders } from "@/src/notifications";
import { usePrefs } from "@/src/prefs";
import { fonts, useTheme } from "@/src/theme";

function ReminderSync() {
  const { data } = useBills();
  const { prefs, ready, update } = usePrefs();
  const asked = useRef(false);

  // First access: explain, then ask (once). Never re-prompt on later launches.
  useEffect(() => {
    if (!ready || prefs.notificationPromptDone || asked.current || !notificationsSupported) return;
    asked.current = true;
    void getPermissionState().then((p) => {
      if (p.granted) update({ notificationPromptDone: true });
      else if (p.canAskAgain) router.push("/notifications-intro");
      else update({ notificationPromptDone: true, notificationsEnabled: false });
    });
  }, [ready, prefs.notificationPromptDone, update]);

  useEffect(() => {
    if (ready && data) void syncReminders(data, prefs);
  }, [data, prefs, ready]);
  return null;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!loading && !user) return <Redirect href="/login" />;

  return (
    <>
      <ReminderSync />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brandPrimary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border, height: 60 + insets.bottom },
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
          sceneStyle: { backgroundColor: colors.surface },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Início",
            tabBarButtonTestID: "tab-home",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="filter"
          options={{
            title: "Filtrar",
            tabBarButtonTestID: "tab-filter",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "filter" : "filter-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Ajustes",
            tabBarButtonTestID: "tab-settings",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
