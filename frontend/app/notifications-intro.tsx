import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, haptic, useToast } from "@/src/components/ui";
import { requestPermission } from "@/src/notifications";
import { usePrefs } from "@/src/prefs";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const BENEFITS = [
  { icon: "time-outline" as const, text: "Aviso 5, 3 ou 1 dia antes do vencimento" },
  { icon: "today-outline" as const, text: "Lembrete às 9h no dia em que a conta vence" },
  { icon: "shield-checkmark-outline" as const, text: "Sem propaganda: só lembretes das suas contas" },
];

/** Shown once, on first access, before the system permission dialog (Android 13+ / iOS). */
export default function NotificationsIntro() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { update } = usePrefs();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const finish = (enabled: boolean) => {
    update({ notificationPromptDone: true, notificationsEnabled: enabled });
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const enable = async () => {
    setBusy(true);
    const granted = await requestPermission();
    setBusy(false);
    if (granted) {
      haptic("success");
      toast("Lembretes ativados");
    } else {
      toast("Você pode ativar depois em Ajustes → Notificações", "info");
    }
    finish(granted);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]} testID="notifications-intro">
      <View style={styles.hero}>
        <Ionicons name="notifications" size={56} color={colors.brandPrimary} />
      </View>
      <Text style={styles.title}>Nunca mais perca um vencimento</Text>
      <Text style={styles.text}>
        O Contas em Dia usa notificações apenas para lembrar você das contas que estão perto de vencer.
      </Text>

      <View style={styles.list}>
        {BENEFITS.map((b) => (
          <View key={b.text} style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons name={b.icon} size={20} color={colors.brandPrimary} />
            </View>
            <Text style={styles.itemText}>{b.text}</Text>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Button testID="notifications-intro-enable" label="Ativar lembretes" icon="notifications-outline" onPress={enable} loading={busy} />
      <Button testID="notifications-intro-skip" label="Agora não" variant="ghost" onPress={() => finish(false)} disabled={busy} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface, paddingHorizontal: spacing.xl, gap: spacing.md },
  hero: { alignSelf: "center", width: 112, height: 112, borderRadius: 56, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 26, color: c.onSurface, textAlign: "center" },
  text: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  list: { gap: spacing.sm, marginTop: spacing.lg },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceSecondary },
}));
