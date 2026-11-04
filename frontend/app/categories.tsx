import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PromptModal } from "@/src/components/prompt-modal";
import { Button, haptic, useToast } from "@/src/components/ui";
import { confirm } from "@/src/confirm";
import { useCreateCategory, useCustomCategories, useDeleteCategory, useRenameCategory } from "@/src/hooks/use-categories";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { CustomCategory } from "@/src/types";

export default function CategoriesScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { data, isLoading } = useCustomCategories();
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const del = useDeleteCategory();
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "rename"; cat: CustomCategory } | null>(null);
  const [error, setError] = useState("");

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/settings"));

  const onConfirm = (name: string) => {
    setError("");
    if (!modal) return;
    const opts = {
      onSuccess: () => {
        haptic("success");
        toast(modal.mode === "create" ? "Categoria criada" : "Categoria renomeada");
        setModal(null);
      },
      onError: (e: Error) => setError(e.message),
    };
    if (modal.mode === "create") create.mutate(name, opts);
    else rename.mutate({ id: modal.cat.id, name }, opts);
  };

  const onDelete = async (cat: CustomCategory) => {
    const ok = await confirm(
      "Excluir categoria",
      `As contas em "${cat.name}" não serão apagadas: elas passam para a categoria "Outros".`,
      "Excluir",
    );
    if (!ok) return;
    del.mutate(cat.id, {
      onSuccess: () => toast("Categoria excluída", "info"),
      onError: (e) => toast((e as Error).message, "error"),
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable testID="categories-back-button" onPress={back} style={styles.headerBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Categorias</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Text style={styles.sectionTitle}>Minhas categorias</Text>
        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: spacing.lg }} color={colors.brandPrimary} />
          ) : data && data.custom.length ? (
            data.custom.map((cat, i) => (
              <View key={cat.id} style={[styles.row, i > 0 && styles.divider]} testID={`category-row-${cat.id}`}>
                <View style={styles.rowIcon}>
                  <Ionicons name="pricetag-outline" size={18} color={colors.brandPrimary} />
                </View>
                <Text style={styles.rowTitle} numberOfLines={1}>{cat.name}</Text>
                <Pressable testID={`category-rename-${cat.id}`} onPress={() => { setError(""); setModal({ mode: "rename", cat }); }} style={styles.action} hitSlop={6}>
                  <Ionicons name="create-outline" size={20} color={colors.onSurfaceTertiary} />
                </Pressable>
                <Pressable testID={`category-delete-${cat.id}`} onPress={() => onDelete(cat)} style={styles.action} hitSlop={6}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            ))
          ) : (
            <View style={styles.empty} testID="categories-empty">
              <Text style={styles.emptyText}>Você ainda não criou categorias. Elas aparecem aqui e no cadastro de contas.</Text>
            </View>
          )}
        </View>
        <Button testID="categories-create-button" label="Criar nova categoria" icon="add" onPress={() => { setError(""); setModal({ mode: "create" }); }} />

        <Text style={styles.sectionTitle}>Categorias padrão</Text>
        <View style={styles.chips}>
          {(data?.defaults ?? []).map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.hint}>As categorias padrão não podem ser alteradas.</Text>
      </ScrollView>

      <PromptModal
        visible={!!modal}
        testID="category-modal"
        title={modal?.mode === "rename" ? "Renomear categoria" : "Nova categoria"}
        message={modal?.mode === "rename" ? "Todas as contas desta categoria serão atualizadas." : "Ela ficará disponível em todas as suas contas e nos filtros."}
        placeholder="Ex.: Pets, Assinaturas, Filhos"
        initialValue={modal?.mode === "rename" ? modal.cat.name : ""}
        confirmLabel={modal?.mode === "rename" ? "Salvar" : "Criar"}
        maxLength={30}
        autoCapitalize="words"
        loading={create.isPending || rename.isPending}
        error={error}
        onCancel={() => setModal(null)}
        onConfirm={onConfirm}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  headerBtn: { width: 44, minHeight: 44, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary, textTransform: "uppercase", letterSpacing: 0.8, marginTop: spacing.sm },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 60 },
  divider: { borderTopWidth: 1, borderTopColor: c.divider },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: c.onSurfaceSecondary },
  action: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  empty: { padding: spacing.lg },
  emptyText: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill, justifyContent: "center", backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceTertiary },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: c.muted },
}));
