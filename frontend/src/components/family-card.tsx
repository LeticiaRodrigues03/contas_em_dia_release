import Ionicons from "@react-native-vector-icons/ionicons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useFamily } from "@/src/hooks/use-family";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

/** Home card that makes the shared "Conta Familiar" feature discoverable. */
export function FamilyCard() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data: family } = useFamily();

  const open = () => router.push("/family");

  if (family) {
    const others = family.members.length - 1;
    return (
      <Pressable testID="home-family-card" onPress={open} style={({ pressed }) => [styles.card, styles.cardActive, pressed && { opacity: 0.85 }]}>
        <View style={[styles.icon, { backgroundColor: colors.brandPrimary }]}>
          <Ionicons name="people" size={22} color={colors.onBrandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{family.name}</Text>
          <Text style={styles.sub}>
            {others === 0 ? "Só você por enquanto · toque para convidar" : `${family.members.length} pessoas compartilham estas contas`}
          </Text>
        </View>
        <View style={styles.avatars}>
          {family.members.slice(0, 3).map((m, i) => (
            <View key={m.id} style={[styles.avatar, { marginLeft: i ? -10 : 0, backgroundColor: colors.brandPrimary }]}>
              <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    );
  }

  return (
    <Pressable testID="home-family-card" onPress={open} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={[styles.icon, { backgroundColor: colors.brandTertiary }]}>
        <Ionicons name="people-outline" size={22} color={colors.brandPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Conta Familiar</Text>
        <Text style={styles.sub}>Divida as contas com quem mora com você: casal ou família vendo e pagando juntos.</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Convidar</Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg,
    backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border,
  },
  cardActive: { backgroundColor: c.brandTertiary, borderColor: c.brandSecondary },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displaySemi, fontSize: 16, color: c.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 18, marginTop: 2 },
  cta: { paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.pill, backgroundColor: c.brandPrimary, justifyContent: "center" },
  ctaText: { fontFamily: fonts.bold, fontSize: 13, color: c.onBrandPrimary },
  avatars: { flexDirection: "row" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.surfaceSecondary },
  avatarText: { fontFamily: fonts.bold, fontSize: 12, color: c.onBrandPrimary },
}));
