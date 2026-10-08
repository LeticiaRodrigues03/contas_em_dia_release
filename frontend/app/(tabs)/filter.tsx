import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { billStatus, formatMoney, inMonth, MONTHS } from "@/src/bills";
import { BillRow } from "@/src/components/bill-row";
import { Chip } from "@/src/components/ui";
import { useBills } from "@/src/hooks/use-bills";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { CATEGORIES } from "@/src/types";

const STATUSES = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "overdue", label: "Atrasadas" },
  { key: "paid", label: "Pagas" },
] as const;
type StatusKey = (typeof STATUSES)[number]["key"];

export default function Filter() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ status?: string }>();
  const { data, isLoading } = useBills();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusKey>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [month, setMonth] = useState<{ y: number; m: number } | null>(null);

  useEffect(() => {
    if (params.status && STATUSES.some((s) => s.key === params.status)) setStatus(params.status as StatusKey);
  }, [params.status]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((b) => !q || b.name.toLowerCase().includes(q))
      .filter((b) => {
        const s = billStatus(b);
        if (status === "pending") return s !== "paid";
        if (status === "overdue") return s === "overdue";
        if (status === "paid") return s === "paid";
        return true;
      })
      .filter((b) => !category || b.category === category)
      .filter((b) => !month || inMonth(b.due_date, month.y, month.m))
      .sort((a, b) => (status === "paid" ? b.due_date.localeCompare(a.due_date) : a.due_date.localeCompare(b.due_date)));
  }, [data, query, status, category, month]);

  const total = results.reduce((acc, b) => acc + (b.amount || 0), 0);
  const shiftMonth = (delta: number) => {
    const base = month ?? { y: new Date().getFullYear(), m: new Date().getMonth() };
    const d = new Date(base.y, base.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Filtrar contas</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            testID="filter-search-input" value={query} onChangeText={setQuery} placeholder="Pesquisar por nome"
            placeholderTextColor={colors.muted} style={styles.searchInput} returnKeyType="search"
          />
          {query ? (
            <Pressable testID="filter-clear-search" onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {STATUSES.map((s) => (
            <Chip key={s.key} testID={`filter-status-${s.key}`} label={s.label} selected={status === s.key} onPress={() => setStatus(s.key)} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip testID="filter-category-all" label="Todas categorias" selected={!category} onPress={() => setCategory(null)} />
          {CATEGORIES.map((c) => (
            <Chip key={c} testID={`filter-category-${c}`} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        <View style={styles.monthRow}>
          <Pressable testID="filter-month-prev" style={styles.monthNav} onPress={() => shiftMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="filter-month-toggle" style={styles.monthLabelBox} onPress={() => (month ? setMonth(null) : shiftMonth(0))}>
            <Ionicons name="calendar-outline" size={16} color={colors.brandPrimary} />
            <Text testID="filter-month-label" style={styles.monthLabel}>{month ? `${MONTHS[month.m]} ${month.y}` : "Todos os meses"}</Text>
            {month ? <Ionicons name="close" size={16} color={colors.muted} /> : null}
          </Pressable>
          <Pressable testID="filter-month-next" style={styles.monthNav} onPress={() => shiftMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurface} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          results.length ? (
            <Text testID="filter-results-count" style={styles.count}>
              {results.length} {results.length === 1 ? "conta" : "contas"} · {formatMoney(total)}
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <BillRow bill={item} testIDPrefix="filter" />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty} testID="filter-empty-state">
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={40} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma conta encontrada</Text>
              <Text style={styles.emptyText}>Ajuste os filtros ou pesquise por outro nome.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.surfaceSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  search: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: c.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, borderWidth: 1, borderColor: c.border },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: c.onSurface, minHeight: 46 },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  monthRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  monthNav: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  monthLabelBox: { flex: 1, minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.pill, backgroundColor: c.brandTertiary },
  monthLabel: { fontFamily: fonts.bold, fontSize: 14, color: c.onBrandTertiary },
  list: { padding: spacing.lg, paddingBottom: 100, flexGrow: 1 },
  count: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, marginBottom: spacing.sm },
  sep: { height: 1, backgroundColor: c.divider },
  empty: { alignItems: "center", paddingTop: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, textAlign: "center", marginTop: spacing.xs },
}));
