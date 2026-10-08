import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { groupBills } from "@/src/bills";
import { BillSection } from "@/src/components/bill-row";
import { SummaryCard } from "@/src/components/summary-card";
import { Button, Logo } from "@/src/components/ui";
import { useAuth } from "@/src/auth";
import { useBills } from "@/src/hooks/use-bills";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const PAID_PREVIEW = 3;

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useBills();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const bills = data ?? [];
  const g = groupBills(bills);
  const openNew = () => router.push("/bill-form");

  const changeMonth = (delta: number) =>
    setYm(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Logo />
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Contas em Dia</Text>
          <Text style={styles.tagline}>Suas contas, no dia certo</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator testID="home-loading" color={colors.brandPrimary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Não foi possível carregar</Text>
          <Text style={styles.emptyText}>Verifique sua conexão e tente novamente.</Text>
          <Button testID="home-retry-button" label="Tentar novamente" icon="refresh" onPress={() => refetch()} style={{ marginTop: spacing.lg }} />
        </View>
      ) : bills.length === 0 ? (
        <Animated.View entering={FadeInDown} style={styles.center} testID="home-empty-state">
          <View style={styles.emptyIcon}>
            <Ionicons name="wallet-outline" size={56} color={colors.brandPrimary} />
          </View>
          <Text style={styles.emptyTitle}>Tudo em dia por aqui 💚</Text>
          <Text style={styles.emptyText}>Cadastre suas contas e receba lembretes antes do vencimento.</Text>
          <Button testID="home-add-first-bill" label="Adicionar primeira conta" icon="add" onPress={openNew} style={{ marginTop: spacing.xl }} />
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
        >
          <Text testID="home-greeting" style={styles.greeting}>Olá, {firstName}</Text>
          <Animated.View entering={FadeInDown.duration(350)}>
            <SummaryCard bills={bills} year={ym.y} month={ym.m} onChangeMonth={changeMonth} />
          </Animated.View>

          {[
            { key: "overdue", title: "Contas atrasadas", icon: "alert" as const, tone: "error" as const, list: g.overdue },
            { key: "soon", title: "Próximos 5 dias", icon: "time" as const, tone: "warning" as const, list: g.soon },
            { key: "future", title: "Contas futuras", icon: "calendar" as const, tone: "info" as const, list: g.future },
          ].map((s, i) => (
            <Animated.View key={s.key} entering={FadeInDown.delay(80 * (i + 1)).duration(350)}>
              <BillSection testID={`section-${s.key}`} title={s.title} icon={s.icon} tone={s.tone} bills={s.list} />
            </Animated.View>
          ))}

          {g.overdue.length + g.soon.length + g.future.length === 0 ? (
            <View style={styles.allPaid} testID="home-all-paid">
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.allPaidText}>Nenhuma conta pendente. Tudo em dia! 💚</Text>
            </View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(320).duration(350)}>
            <BillSection
              testID="section-paid"
              title="Contas pagas"
              icon="checkmark"
              tone="success"
              bills={g.paid.slice(0, PAID_PREVIEW)}
              footer={
                <Pressable
                  testID="home-see-all-paid"
                  style={styles.seeAll}
                  onPress={() => router.push({ pathname: "/(tabs)/filter", params: { status: "paid" } })}
                >
                  <Ionicons name="time-outline" size={18} color={colors.brandPrimary} />
                  <Text style={styles.seeAllText}>Ver todas as contas pagas ({g.paid.length})</Text>
                </Pressable>
              }
            />
          </Animated.View>
        </ScrollView>
      )}

      {bills.length > 0 ? (
        <Pressable
          testID="home-add-bill-fab"
          onPress={openNew}
          style={({ pressed }) => [styles.fab, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
        >
          <Ionicons name="add" size={30} color={colors.onBrandPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  brand: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, letterSpacing: 0.3 },
  tagline: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  greeting: { fontFamily: fonts.displaySemi, fontSize: 22, color: c.onSurface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl },
  emptyIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, textAlign: "center", marginTop: spacing.sm },
  emptyText: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", marginTop: spacing.sm, maxWidth: 300 },
  allPaid: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, backgroundColor: c.successSoft, borderRadius: radius.lg },
  allPaidText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceSecondary, flex: 1 },
  seeAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 48, borderTopWidth: 1, borderTopColor: c.divider },
  seeAllText: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary },
  fab: {
    position: "absolute", right: spacing.lg, bottom: spacing.lg, width: 60, height: 60, borderRadius: 20,
    backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
}));
