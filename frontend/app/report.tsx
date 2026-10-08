import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { categoryBreakdown, formatMoney, monthSummary, MONTHS } from "@/src/bills";
import { Button, useToast } from "@/src/components/ui";
import { useBills } from "@/src/hooks/use-bills";
import { fonts, makeStyles, radius, spacing, ThemeColors, useTheme } from "@/src/theme";

/** Category bar colors: brand greens + the app's status hues (no off-brand purples). */
const palette = (c: ThemeColors) => [c.brandPrimary, c.warning, c.info, c.error, c.success, c.onBrandTertiary, c.muted];

export default function Report() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ y?: string; m?: string }>();
  const now = new Date();
  const [ym, setYm] = useState({
    y: params.y ? Number(params.y) : now.getFullYear(),
    m: params.m ? Number(params.m) : now.getMonth(),
  });
  const { data } = useBills();
  const bills = data ?? [];
  const cats = categoryBreakdown(bills, ym.y, ym.m);
  const s = monthSummary(bills, ym.y, ym.m);
  const monthTotal = s.pendingTotal + s.paidTotal;
  const max = Math.max(...cats.map((c) => c.total), 1);
  const pct = s.total ? Math.round((s.paidCount / s.total) * 100) : 0;
  const colorsList = palette(colors);
  const shotRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const shift = (d: number) =>
    setYm(({ y, m }) => {
      const n = new Date(y, m + d, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  const label = `${MONTHS[ym.m]} ${ym.y}`;

  const shareText = () => {
    const top = cats.slice(0, 3).map((c) => `• ${c.category}: ${formatMoney(c.total)}`).join("\n");
    const msg =
      `📊 Meu resumo de ${label} no *Contas em Dia*\n\n` +
      `✅ ${s.paidCount} de ${s.total} contas pagas (${pct}%)\n` +
      `💰 Pago: ${formatMoney(s.paidTotal)}\n⏳ A pagar: ${formatMoney(s.pendingTotal)}\n` +
      (top ? `\nMaiores gastos:\n${top}\n` : "") +
      `\nOrganize suas contas também com o app Contas em Dia 💚 — suas contas, no dia certo.`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    void Linking.openURL(url).catch(() => toast("Não foi possível abrir o WhatsApp", "error"));
  };

  const shareImage = async () => {
    setSharing(true);
    try {
      const uri = await captureRef(shotRef, { format: "png", quality: 1 });
      if (!uri || !(await Sharing.isAvailableAsync())) throw new Error();
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Compartilhar resumo" });
    } catch {
      toast("Não foi possível gerar a imagem", "error");
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="report-back-button" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Relatório do mês</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={styles.monthRow}>
          <Pressable testID="report-prev-month" style={styles.nav} onPress={() => shift(-1)}>
            <Ionicons name="chevron-back" size={18} color={colors.onSurface} />
          </Pressable>
          <Text testID="report-month-label" style={styles.month}>{label}</Text>
          <Pressable testID="report-next-month" style={styles.nav} onPress={() => shift(1)}>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* Gráfico de gastos por categoria */}
        <View style={styles.card} testID="report-category-chart">
          <Text style={styles.cardTitle}>Gastos por categoria</Text>
          <Text style={styles.cardSub}>Total do mês: {formatMoney(monthTotal)}</Text>
          {cats.length === 0 ? (
            <Text testID="report-empty" style={styles.empty}>Nenhuma conta neste mês.</Text>
          ) : (
            <>
              <View style={styles.stack}>
                {cats.map((c, i) =>
                  c.total > 0 ? (
                    <View key={c.category} style={{ flex: c.total, backgroundColor: colorsList[i % colorsList.length] }} />
                  ) : null,
                )}
              </View>
              {cats.map((c, i) => {
                const color = colorsList[i % colorsList.length];
                const share = monthTotal ? Math.round((c.total / monthTotal) * 100) : 0;
                return (
                  <View key={c.category} style={styles.catRow} testID={`report-category-${c.category}`}>
                    <View style={styles.catTop}>
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={styles.catName}>{c.category}</Text>
                      <Text style={styles.catPct}>{share}%</Text>
                      <Text style={styles.catValue}>{formatMoney(c.total)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${(c.total / max) * 100}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.catMeta}>
                      {c.count} {c.count === 1 ? "conta" : "contas"} · pago {formatMoney(c.paid)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Cartão de resumo para compartilhar */}
        <Text style={styles.section}>Cartão para compartilhar</Text>
        <View ref={shotRef} collapsable={false} style={styles.shareCard} testID="report-share-card">
            <View style={styles.shareHead}>
              <Image source={require("../assets/images/logo.png")} style={styles.shareLogo} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.shareBrand}>Contas em Dia</Text>
                <Text style={styles.shareTag}>Suas contas, no dia certo</Text>
              </View>
            </View>
            <Text style={styles.shareMonth}>Resumo de {label}</Text>
            <Text style={styles.sharePct}>{pct}% das contas pagas</Text>
            <View style={styles.shareBar}>
              <View style={[styles.shareFill, { width: `${pct}%` }]} />
            </View>
            <View style={styles.shareStats}>
              <View style={styles.shareStat}>
                <Text style={styles.shareLabel}>Pago</Text>
                <Text style={styles.shareValue}>{formatMoney(s.paidTotal)}</Text>
              </View>
              <View style={styles.shareStat}>
                <Text style={styles.shareLabel}>A pagar</Text>
                <Text style={styles.shareValue}>{formatMoney(s.pendingTotal)}</Text>
              </View>
            </View>
            <Text style={styles.shareFoot}>{s.paidCount} de {s.total} contas em dia 💚</Text>
          </View>

        <Button testID="report-share-whatsapp" label="Compartilhar no WhatsApp" icon="logo-whatsapp" onPress={shareText} />
        {Platform.OS !== "web" ? (
          <Button testID="report-share-image" label="Compartilhar como imagem" icon="image-outline" variant="secondary" onPress={shareImage} loading={sharing} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.md, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  content: { padding: spacing.lg, gap: spacing.lg },
  monthRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  nav: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: c.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  month: { flex: 1, textAlign: "center", fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface },
  cardSub: { fontFamily: fonts.medium, fontSize: 13, color: c.muted, marginTop: -spacing.sm },
  empty: { fontFamily: fonts.medium, fontSize: 14, color: c.muted, paddingVertical: spacing.lg, textAlign: "center" },
  stack: { flexDirection: "row", height: 14, borderRadius: 7, overflow: "hidden", backgroundColor: c.surfaceTertiary, gap: 2 },
  catRow: { gap: 6 },
  catTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceSecondary },
  catPct: { fontFamily: fonts.semibold, fontSize: 12, color: c.muted },
  catValue: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurfaceSecondary, minWidth: 90, textAlign: "right" },
  track: { height: 8, borderRadius: 4, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  catMeta: { fontFamily: fonts.regular, fontSize: 12, color: c.muted },
  section: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary, textTransform: "uppercase", letterSpacing: 0.8 },
  shareCard: { backgroundColor: c.brandTertiary, borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, borderColor: c.brandSecondary, gap: spacing.sm },
  shareHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  shareLogo: { width: 44, height: 44 },
  shareBrand: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  shareTag: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  shareMonth: { fontFamily: fonts.semibold, fontSize: 14, color: c.onBrandTertiary },
  sharePct: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
  shareBar: { height: 10, borderRadius: 5, backgroundColor: c.brandSecondary, overflow: "hidden" },
  shareFill: { height: 10, borderRadius: 5, backgroundColor: c.brandPrimary },
  shareStats: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  shareStat: { flex: 1, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md },
  shareLabel: { fontFamily: fonts.medium, fontSize: 12, color: c.muted },
  shareValue: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceSecondary, marginTop: 2 },
  shareFoot: { fontFamily: fonts.semibold, fontSize: 13, color: c.onBrandTertiary, marginTop: spacing.sm },
}));
