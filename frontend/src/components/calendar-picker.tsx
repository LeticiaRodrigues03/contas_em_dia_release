import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { MONTHS, parseDate, toIso, today } from "@/src/bills";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Inline month calendar; works identically on iOS, Android and web. */
export function CalendarPicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const selected = parseDate(value);
  const [cursor, setCursor] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const todayIso = toIso(today());
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <View testID="calendar-picker" style={styles.wrap}>
      <View style={styles.header}>
        <Pressable testID="calendar-prev-month" hitSlop={10} style={styles.nav} onPress={() => setCursor(new Date(year, month - 1, 1))}>
          <Ionicons name="chevron-back" size={20} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.month} testID="calendar-month-label">{MONTHS[month]} {year}</Text>
        <Pressable testID="calendar-next-month" hitSlop={10} style={styles.nav} onPress={() => setCursor(new Date(year, month + 1, 1))}>
          <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEK.map((w, i) => (
          <Text key={`w${i}`} style={styles.week}>{w}</Text>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const iso = toIso(new Date(year, month, d));
          const isSel = iso === value;
          const isToday = iso === todayIso;
          return (
            <Pressable
              key={iso}
              testID={`calendar-day-${iso}`}
              onPress={() => onChange(iso)}
              style={[styles.cell, isSel && { backgroundColor: colors.brandPrimary }, !isSel && isToday && styles.today]}
            >
              <Text style={[styles.day, isSel && { color: colors.onBrandPrimary }]}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { backgroundColor: c.surfaceTertiary, borderRadius: radius.md, padding: spacing.md },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  nav: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  month: { fontFamily: fonts.displaySemi, fontSize: 16, color: c.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  week: { width: "14.28%", textAlign: "center", fontFamily: fonts.bold, fontSize: 12, color: c.muted, paddingVertical: 6 },
  cell: { width: "14.28%", aspectRatio: 1, maxHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.pill },
  today: { borderWidth: 1.5, borderColor: c.brandPrimary },
  day: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
}));
