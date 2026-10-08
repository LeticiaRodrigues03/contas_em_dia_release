import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

const SECTIONS = [
  ["Quais dados coletamos", "Nome, e-mail e senha (armazenada apenas como hash criptográfico) para criar sua conta, e as contas que você cadastra: nome, valor, vencimento, categoria e observações."],
  ["Como usamos", "Os dados são usados exclusivamente para exibir suas contas, sincronizá-las entre seus aparelhos e agendar lembretes locais no seu dispositivo. Não vendemos nem compartilhamos seus dados com terceiros."],
  ["Notificações", "Os lembretes são notificações locais geradas no próprio aparelho. Você pode desativá-las a qualquer momento em Ajustes."],
  ["Seus direitos (LGPD)", "Você pode exportar todos os seus dados (Ajustes → Exportar backup) e excluir sua conta e todos os dados permanentemente (Ajustes → Excluir minha conta)."],
  ["Segurança", "A comunicação com o servidor é criptografada (HTTPS) e o acesso é protegido por token pessoal armazenado de forma segura no aparelho."],
  ["Contato", "Dúvidas sobre privacidade: entre em contato pelo e-mail de suporte informado na página do app na loja."],
];

export default function Privacy() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="privacy-back-button" onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Política de privacidade</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {SECTIONS.map(([t, b]) => (
          <View key={t} style={{ gap: spacing.xs }}>
            <Text style={styles.h}>{t}</Text>
            <Text style={styles.p}>{b}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.md, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  content: { padding: spacing.lg, gap: spacing.xl },
  h: { fontFamily: fonts.bold, fontSize: 16, color: c.brandPrimary },
  p: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: c.onSurfaceSecondary },
}));
