import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, BILLS_KEY } from "@/src/api";
import { useAuth } from "@/src/auth";
import { exportBackup, pickBackup } from "@/src/backup";
import { Chip, haptic, useToast } from "@/src/components/ui";
import { confirm } from "@/src/confirm";
import { notificationsSupported, requestPermission, sendTestNotification } from "@/src/notifications";
import { ThemePref, usePrefs } from "@/src/prefs";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon, title, subtitle, right, onPress, testID, danger, loading,
}: {
  icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; right?: ReactNode;
  onPress?: () => void; testID: string; danger?: boolean; loading?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const tint = danger ? colors.error : colors.brandPrimary;
  return (
    <Pressable testID={testID} disabled={!onPress || loading} onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.7 }]}>
      <View style={[styles.rowIcon, { backgroundColor: danger ? colors.errorSoft : colors.brandTertiary }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.error }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={tint} /> : right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export default function Settings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuth();
  const { prefs, update } = usePrefs();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"export" | "import" | "delete" | null>(null);

  const toggleNotifications = async (v: boolean) => {
    if (v && notificationsSupported && !(await requestPermission())) {
      toast("Permita as notificações nas configurações do aparelho", "error");
    }
    update({ notificationsEnabled: v });
    toast(v ? "Notificações ativadas" : "Notificações desativadas", "info");
  };

  const doExport = async () => {
    setBusy("export");
    try {
      const n = await exportBackup();
      toast(`Backup gerado com ${n} contas`);
    } catch (e) {
      toast((e as Error).message || "Falha ao exportar", "error");
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setBusy("import");
    try {
      const bills = await pickBackup();
      if (!bills) return;
      const replace = await confirm(
        "Importar backup",
        `${bills.length} contas encontradas. Deseja substituir todas as contas atuais? (Cancelar = apenas adicionar)`,
        "Substituir",
      );
      const res = await api.importBackup(bills, replace);
      await qc.invalidateQueries({ queryKey: BILLS_KEY });
      toast(`${res.imported} contas importadas`);
    } catch (e) {
      toast((e as Error).message || "Falha ao importar", "error");
    } finally {
      setBusy(null);
    }
  };

  const doLogout = async () => {
    if (await confirm("Sair", "Deseja sair da sua conta neste aparelho?", "Sair", false)) {
      await logout();
      router.replace("/login");
    }
  };

  const doDelete = async () => {
    haptic("warning");
    if (!(await confirm("Excluir conta", "Todos os seus dados serão apagados permanentemente. Esta ação não pode ser desfeita.", "Excluir tudo"))) return;
    setBusy("delete");
    try {
      await deleteAccount();
      router.replace("/login");
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(null);
    }
  };

  const themeOptions: { key: ThemePref; label: string }[] = [
    { key: "system", label: "Sistema" },
    { key: "light", label: "Claro" },
    { key: "dark", label: "Escuro" },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Configurações</Text>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text testID="settings-user-name" style={styles.profileName}>{user?.name}</Text>
          <Text testID="settings-user-email" style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <Section title="Notificações">
        <Row
          testID="settings-notifications-row" icon="notifications-outline" title="Ativar notificações"
          subtitle={notificationsSupported ? "Receber lembretes de contas" : "Disponível no app para Android e iOS"}
          right={
            <Switch
              testID="settings-notifications-switch" value={prefs.notificationsEnabled} onValueChange={toggleNotifications}
              trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary}
            />
          }
        />
        <View style={[styles.inner, !prefs.notificationsEnabled && { opacity: 0.4 }]} pointerEvents={prefs.notificationsEnabled ? "auto" : "none"}>
          <Text style={styles.innerTitle}>Avisar quantos dias antes?</Text>
          <View style={styles.chips}>
            {[5, 3, 1].map((d) => (
              <Chip
                key={d} testID={`settings-days-before-${d}`} label={d === 1 ? "1 dia" : `${d} dias`} selected={prefs.daysBefore === d}
                onPress={() => {
                  update({ daysBefore: d });
                  toast(`Lembrete ${d === 1 ? "1 dia" : `${d} dias`} antes`, "info");
                }}
              />
            ))}
          </View>
        </View>
        <Row
          testID="settings-due-day-row" icon="today-outline" title="Lembrar no dia do vencimento" subtitle="Às 9h do dia em que a conta vence"
          right={
            <Switch
              testID="settings-due-day-switch" value={prefs.notifyOnDueDay} disabled={!prefs.notificationsEnabled}
              onValueChange={(v) => update({ notifyOnDueDay: v })}
              trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary}
            />
          }
        />
        {notificationsSupported ? (
          <Row
            testID="settings-test-notification" icon="paper-plane-outline" title="Testar notificação"
            onPress={async () => toast((await sendTestNotification()) ? "Notificação enviada" : "Permissão negada", "info")}
          />
        ) : null}
      </Section>

      <Section title="Aparência">
        <View style={styles.inner}>
          <Text style={styles.innerTitle}>Tema</Text>
          <View style={styles.chips}>
            {themeOptions.map((o) => (
              <Chip key={o.key} testID={`settings-theme-${o.key}`} label={o.label} selected={prefs.theme === o.key} onPress={() => update({ theme: o.key })} />
            ))}
          </View>
        </View>
      </Section>

      <Section title="Dados">
        <Row testID="settings-export-backup" icon="cloud-download-outline" title="Exportar backup" subtitle="Salvar suas contas em um arquivo JSON" onPress={doExport} loading={busy === "export"} />
        <Row testID="settings-import-backup" icon="cloud-upload-outline" title="Importar backup" subtitle="Restaurar contas de um arquivo" onPress={doImport} loading={busy === "import"} />
      </Section>

      <Section title="Sobre">
        <Row testID="settings-privacy" icon="shield-checkmark-outline" title="Política de privacidade" onPress={() => router.push("/privacy")} />
        <Row testID="settings-version" icon="information-circle-outline" title="Versão" right={<Text style={styles.rowSub}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>} />
      </Section>

      <Section title="Conta">
        <Row testID="settings-logout" icon="log-out-outline" title="Sair" onPress={doLogout} />
        <Row testID="settings-delete-account" icon="trash-outline" title="Excluir minha conta" subtitle="Apaga todos os dados permanentemente" danger onPress={doDelete} loading={busy === "delete"} />
      </Section>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 100, gap: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 20, color: c.onBrandPrimary },
  profileName: { fontFamily: fonts.bold, fontSize: 16, color: c.onSurface },
  profileEmail: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary, textTransform: "uppercase", letterSpacing: 0.8 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, minHeight: 60, borderBottomWidth: 1, borderBottomColor: c.divider },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurfaceSecondary },
  rowSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, marginTop: 1 },
  inner: { padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: c.divider },
  innerTitle: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceSecondary },
  chips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
}));
