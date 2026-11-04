import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { PromptModal } from "@/src/components/prompt-modal";
import { Button, haptic, useToast } from "@/src/components/ui";
import { confirm } from "@/src/confirm";
import {
  useCreateFamily, useFamily, useJoinFamily, useLeaveFamily, useRegenerateFamilyCode, useRemoveFamilyMember,
} from "@/src/hooks/use-family";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const BENEFITS = [
  { icon: "eye-outline" as const, text: "Todos veem as mesmas contas, em tempo real" },
  { icon: "checkmark-done-outline" as const, text: "Qualquer pessoa pode marcar uma conta como paga" },
  { icon: "pricetags-outline" as const, text: "Categorias personalizadas compartilhadas" },
];

export default function FamilyScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();
  const { data: family, isLoading } = useFamily();
  const create = useCreateFamily();
  const join = useJoinFamily();
  const leave = useLeaveFamily();
  const remove = useRemoveFamilyMember();
  const regen = useRegenerateFamilyCode();
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const isOwner = !!family && family.owner_id === user?.id;

  const onCreate = (name: string) =>
    create.mutate(name, {
      onSuccess: () => {
        haptic("success");
        toast("Grupo criado! Compartilhe o código.");
        setModal(null);
      },
      onError: (e) => setError((e as Error).message),
    });

  const onJoin = (code: string) =>
    join.mutate(code, {
      onSuccess: (f) => {
        haptic("success");
        toast(`Você entrou em "${f.name}"`);
        setModal(null);
      },
      onError: (e) => setError((e as Error).message),
    });

  const shareCode = async () => {
    if (!family) return;
    const message = `Entre no meu grupo "${family.name}" no app Contas em Dia para acompanharmos as contas juntos.\n\nCódigo de convite: ${family.code}\n\nNo app: Início → Conta Familiar → Entrar com código.`;
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(message);
      toast("Convite copiado");
      return;
    }
    await Share.share({ message });
  };

  const copyCode = async () => {
    if (!family) return;
    await Clipboard.setStringAsync(family.code);
    haptic("light");
    toast("Código copiado", "info");
  };

  const onLeave = async () => {
    if (!family) return;
    const msg = family.members.length === 1
      ? "O grupo será encerrado. Suas contas continuam só com você."
      : "Você deixará de ver as contas das outras pessoas, e elas deixarão de ver as suas.";
    if (!(await confirm("Sair do grupo", msg, "Sair"))) return;
    leave.mutate(undefined, {
      onSuccess: () => toast("Você saiu do grupo", "info"),
      onError: (e) => toast((e as Error).message, "error"),
    });
  };

  const onRemove = async (id: string, name: string) => {
    if (!(await confirm("Remover pessoa", `${name} deixará de ver e gerenciar as contas do grupo.`, "Remover"))) return;
    remove.mutate(id, {
      onSuccess: () => toast(`${name} foi removido(a)`, "info"),
      onError: (e) => toast((e as Error).message, "error"),
    });
  };

  const onRegen = async () => {
    if (!(await confirm("Gerar novo código", "O código atual deixará de funcionar para novos convites.", "Gerar", false))) return;
    regen.mutate(undefined, { onSuccess: () => toast("Novo código gerado"), onError: (e) => toast((e as Error).message, "error") });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable testID="family-back-button" onPress={back} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Conta Familiar</Text>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.brandPrimary} />
      ) : family ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.groupCard} testID="family-group-card">
            <View style={styles.groupIcon}>
              <Ionicons name="people" size={28} color={colors.onBrandPrimary} />
            </View>
            <Text style={styles.groupName} testID="family-name">{family.name}</Text>
            <Text style={styles.groupSub}>
              {family.members.length === 1 ? "Convide alguém para começar a compartilhar" : `${family.members.length} pessoas compartilhando as contas`}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Código de convite</Text>
            <Text style={styles.cardSub}>Quem digitar este código no app passa a ver e gerenciar as mesmas contas que você.</Text>
            <Pressable testID="family-code" onPress={copyCode} style={styles.codeBox}>
              <Text style={styles.code}>{family.code}</Text>
              <Ionicons name="copy-outline" size={20} color={colors.brandPrimary} />
            </Pressable>
            <Button testID="family-share-code" label="Convidar pelo WhatsApp ou outro app" icon="share-social-outline" onPress={shareCode} />
            {isOwner ? (
              <Button testID="family-regenerate-code" label="Gerar novo código" variant="ghost" icon="refresh-outline" onPress={onRegen} loading={regen.isPending} />
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pessoas no grupo</Text>
            {family.members.map((m) => (
              <View key={m.id} style={styles.member} testID={`family-member-${m.id}`}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.name}{m.id === user?.id ? " (você)" : ""}
                  </Text>
                  <Text style={styles.memberEmail}>{m.is_owner ? "Criou o grupo · " : ""}{m.email}</Text>
                </View>
                {isOwner && m.id !== user?.id ? (
                  <Pressable testID={`family-remove-${m.id}`} onPress={() => onRemove(m.id, m.name)} hitSlop={8} style={styles.removeBtn}>
                    <Ionicons name="person-remove-outline" size={18} color={colors.error} />
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>

          <Button testID="family-leave" label="Sair do grupo" variant="danger" icon="log-out-outline" onPress={onLeave} loading={leave.isPending} />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <View style={styles.hero}>
            <Ionicons name="people" size={56} color={colors.brandPrimary} />
          </View>
          <Text style={styles.title}>Contas em casal ou em família</Text>
          <Text style={styles.text}>
            Crie um grupo e convide quem divide as despesas com você. Todos acompanham, cadastram e marcam as contas como pagas no mesmo lugar.
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
          <Button testID="family-create-button" label="Criar meu grupo" icon="add-circle-outline" onPress={() => { setError(""); setModal("create"); }} />
          <Button testID="family-join-button" label="Entrar com um código" variant="secondary" icon="key-outline" onPress={() => { setError(""); setModal("join"); }} />
        </ScrollView>
      )}

      <PromptModal
        visible={modal === "create"}
        testID="family-create-modal"
        title="Nome do grupo"
        message="Ex.: Nossa casa, Família Silva, Apê 302"
        placeholder="Nome do grupo"
        confirmLabel="Criar grupo"
        maxLength={40}
        autoCapitalize="words"
        loading={create.isPending}
        error={error}
        onCancel={() => setModal(null)}
        onConfirm={onCreate}
      />
      <PromptModal
        visible={modal === "join"}
        testID="family-join-modal"
        title="Código de convite"
        message="Peça o código de 6 letras para quem criou o grupo."
        placeholder="Ex.: K7PQ2M"
        confirmLabel="Entrar"
        maxLength={6}
        autoCapitalize="characters"
        loading={join.isPending}
        error={error}
        onCancel={() => setModal(null)}
        onConfirm={onJoin}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  headerBtn: { width: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  content: { padding: spacing.lg, gap: spacing.lg },
  hero: { alignSelf: "center", width: 112, height: 112, borderRadius: 56, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, textAlign: "center" },
  text: { fontFamily: fonts.regular, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 22 },
  list: { gap: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: c.border },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceSecondary },
  groupCard: { alignItems: "center", gap: spacing.xs, padding: spacing.xl, backgroundColor: c.brandTertiary, borderRadius: radius.lg },
  groupIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  groupName: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  groupSub: { fontFamily: fonts.medium, fontSize: 13, color: c.muted, textAlign: "center" },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: spacing.lg, gap: spacing.md },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.onSurface },
  cardSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted, lineHeight: 18, marginTop: -spacing.sm },
  codeBox: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, minHeight: 64, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, borderStyle: "dashed" },
  code: { fontFamily: fonts.display, fontSize: 32, letterSpacing: 6, color: c.brandPrimary },
  member: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 52 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.display, fontSize: 16, color: c.onBrandPrimary },
  memberName: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceSecondary },
  memberEmail: { fontFamily: fonts.regular, fontSize: 12, color: c.muted },
  removeBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center" },
}));
