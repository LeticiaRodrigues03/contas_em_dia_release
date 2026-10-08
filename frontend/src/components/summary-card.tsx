import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { formatMoney, monthSummary, MONTHS } from "@/src/bills";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Bill } from "@/src/types";

export function SummaryCard({
  bills, year, month, onChangeMonth,
}: { bills: Bill[]; year: number; month: number; onChangeMonth: (delta: number) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const s = monthSummary(bills, year, month);
  const progress = s.total ? s.paidCount / s.total : 0;

  return (
    <View testID="summary-card" style={styles.card}>
      <View style={styles.top}>
        <Pressable testID="summary-prev-month" hitSlop={10} style={styles.nav} onPress={() => onChangeMonth(-1)}>
          <Ionicons name="chevron-back" size={20} color={colors.onBrandTertiary} />
        </Pressable>
        <Text testID="summary-month-label" style={styles.month}>Resumo de {MONTHS[month]} {year}</Text>
        <Pressable testID="summary-next-month" hitSlop={10} style={styles.nav} onPress={() => onChangeMonth(1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.onBrandTertiary} />
        </Pressable>
      </View>

      <Text style={styles.label}>A pagar</Text>
      <Text testID="summary-pending-total" style={styles.big}>{formatMoney(s.pendingTotal)}</Text>

      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pago</Text>
          <Text testID="summary-paid-total" style={styles.statValue}>{formatMoney(s.paidTotal)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Contas</Text>
          <Text testID="summary-count" style={styles.statValue}>{s.paidCount}/{s.total} pagas</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Atrasadas</Text>
          <Text testID="summary-overdue-count" style={[styles.statValue, s.overdueCount > 0 && { color: colors.error }]}>
            {s.overdueCount}
          </Text>
        </View>
      </View>

      <Pressable
        testID="summary-open-report"
        style={({ pressed }) => [styles.report, pressed && { opacity: 0.8 }]}
        onPress={() => router.push({ pathname: "/report", params: { y: String(year), m: String(month) } })}
      >
        <Ionicons name="pie-chart-outline" size={18} color={colors.onBrandSecondary} />
        <Text style={styles.reportText}>Gastos por categoria · Compartilhar</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.onBrandSecondary} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.brandSecondary },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  nav: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: c.brandSecondary },
  month: { fontFamily: fonts.semibold, fontSize: 14, color: c.onBrandTertiary },
  label: { fontFamily: fonts.medium, fontSize: 13, color: c.onBrandTertiary },
  big: { fontFamily: fonts.display, fontSize: 34, color: c.onSurface, letterSpacing: -0.5, marginTop: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: c.brandSecondary, marginVertical: spacing.md, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: c.brandPrimary },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  statValue: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceSecondary, marginTop: 2 },
  report: {
    marginTop: spacing.md, minHeight: 44, borderRadius: radius.md, backgroundColor: c.brandSecondary,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.md,
  },
  reportText: { fontFamily: fonts.bold, fontSize: 13, color: c.onBrandSecondary, flexShrink: 1 },
}));
