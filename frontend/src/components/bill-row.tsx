import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { amountLabel, billStatus, dueLabel, formatDate } from "@/src/bills";
import { useTogglePaid } from "@/src/hooks/use-bills";
import { fonts, makeStyles, radius, spacing, ThemeColors, useTheme } from "@/src/theme";
import type { Bill } from "@/src/types";

export function statusColor(c: ThemeColors, b: Bill) {
  const s = billStatus(b);
  return s === "paid" ? c.success : s === "overdue" ? c.error : s === "soon" ? c.warning : c.info;
}

export function BillRow({ bill, testIDPrefix = "bill" }: { bill: Bill; testIDPrefix?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toggle = useTogglePaid();
  const color = statusColor(colors, bill);

  return (
    <Pressable
      testID={`${testIDPrefix}-row-${bill.id}`}
      onPress={() => router.push({ pathname: "/bill-form", params: { id: bill.id } })}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
    >
      <Pressable
        testID={`${testIDPrefix}-toggle-paid-${bill.id}`}
        hitSlop={8}
        onPress={() => toggle.mutate({ bill, paid: !bill.paid })}
        style={[styles.check, { borderColor: color }, bill.paid && { backgroundColor: color }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: bill.paid }}
      >
        {bill.paid ? <Ionicons name="checkmark" size={18} color={colors.onSuccess} /> : null}
      </Pressable>

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={[styles.name, bill.paid && styles.namePaid]} numberOfLines={1} testID={`${testIDPrefix}-name-${bill.id}`}>
            {bill.name}
          </Text>
          {bill.recurring ? <Ionicons name="repeat" size={14} color={colors.muted} /> : null}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {bill.category} · <Text style={{ color }}>{dueLabel(bill)}</Text>
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.amount} testID={`${testIDPrefix}-amount-${bill.id}`}>{amountLabel(bill.amount)}</Text>
        <View style={[styles.datePill, { backgroundColor: colors.surfaceTertiary }]}>
          <Text style={styles.date}>{formatDate(bill.due_date, false)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, minHeight: 60 },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  titleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: c.onSurfaceSecondary, flexShrink: 1 },
  namePaid: { color: c.muted, textDecorationLine: "line-through" },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: c.muted },
  right: { alignItems: "flex-end", gap: 4 },
  amount: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceSecondary },
  datePill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  date: { fontFamily: fonts.bold, fontSize: 12, color: c.onSurfaceTertiary },
}));

export function BillSection({
  title, icon, tone, bills, footer, testID,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "error" | "warning" | "info" | "success";
  bills: Bill[];
  footer?: React.ReactNode;
  testID: string;
}) {
  const styles = useSectionStyles();
  const { colors } = useTheme();
  if (!bills.length) return null;
  const color = colors[tone];
  const soft = colors[`${tone}Soft` as const];
  return (
    <View testID={testID} style={styles.card}>
      <View style={[styles.header, { backgroundColor: soft }]}>
        <View style={[styles.iconBox, { backgroundColor: color }]}>
          <Ionicons name={icon} size={16} color={colors.surfaceSecondary} />
        </View>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <View style={[styles.count, { borderColor: color }]}>
          <Text style={[styles.countText, { color }]}>{bills.length}</Text>
        </View>
      </View>
      <View style={styles.list}>
        {bills.map((b, i) => (
          <View key={b.id} style={i > 0 ? styles.divider : undefined}>
            <BillRow bill={b} testIDPrefix={testID} />
          </View>
        ))}
        {footer}
      </View>
    </View>
  );
}

const useSectionStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBox: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 17 },
  count: { minWidth: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { fontFamily: fonts.bold, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: c.divider },
}));
