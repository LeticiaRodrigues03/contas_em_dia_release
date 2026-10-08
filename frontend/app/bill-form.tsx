import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, BILLS_KEY } from "@/src/api";
import { centsToNumber, formatDate, formatMoney, toIso, today } from "@/src/bills";
import { CalendarPicker } from "@/src/components/calendar-picker";
import { Button, Chip, haptic, useToast } from "@/src/components/ui";
import { useDeleteBill } from "@/src/hooks/use-bills";
import { queryClient } from "@/src/query-client";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Bill, BillInput, CATEGORIES } from "@/src/types";

export default function BillForm() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const cached = queryClient.getQueryData<Bill[]>(BILLS_KEY)?.find((b) => b.id === id);
  const { data: bill, isLoading } = useQuery({
    queryKey: ["bill", id],
    queryFn: () => api.getBill(id!),
    enabled: isEdit,
    initialData: cached,
  });

  const [name, setName] = useState("");
  const [cents, setCents] = useState("");
  const [dueDate, setDueDate] = useState(toIso(today()));
  const [showCal, setShowCal] = useState(false);
  const [category, setCategory] = useState<string>("Outros");
  const [recurring, setRecurring] = useState(false);
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    if (bill && loadedId !== bill.id) {
      setName(bill.name);
      setCents(bill.amount > 0 ? String(Math.round(bill.amount * 100)) : "");
      setDueDate(bill.due_date);
      setCategory(bill.category);
      setRecurring(bill.recurring);
      setPaid(bill.paid);
      setNotes(bill.notes);
      setLoadedId(bill.id);
    }
  }, [bill, loadedId]);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const del = useDeleteBill(close);

  const save = useMutation({
    mutationFn: (data: BillInput) => (isEdit ? api.updateBill(id!, data) : api.createBill(data)),
    onSuccess: () => {
      haptic("success");
      toast(isEdit ? "Conta atualizada" : "Conta cadastrada");
      void queryClient.invalidateQueries({ queryKey: BILLS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["bill", id] });
      close();
    },
    onError: (e) => setError((e as Error).message),
  });

  const submit = () => {
    setError("");
    if (!name.trim()) return setError("Informe o nome da conta");
    save.mutate({ name: name.trim(), amount: centsToNumber(cents), due_date: dueDate, recurring, paid, category, notes: notes.trim() });
  };

  const amount = centsToNumber(cents);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable testID="bill-form-cancel" onPress={close} style={styles.headerBtn} hitSlop={8}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Editar conta" : "Nova conta"}</Text>
        <Pressable testID="bill-form-save-header" onPress={submit} style={[styles.headerBtn, { alignItems: "flex-end" }]} hitSlop={8} disabled={save.isPending}>
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>

      {isEdit && isLoading && !bill ? (
        <ActivityIndicator testID="bill-form-loading" style={{ marginTop: spacing.xxl }} color={colors.brandPrimary} />
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Nome da conta</Text>
            <TextInput
              testID="bill-form-name-input" value={name} onChangeText={setName} placeholder="Ex.: Energia, Aluguel, Cartão"
              placeholderTextColor={colors.muted} style={styles.input} maxLength={80}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Valor (opcional)</Text>
            <TextInput
              testID="bill-form-amount-input" value={amount > 0 ? formatMoney(amount) : ""}
              onChangeText={(t) => setCents(t.replace(/\D/g, "").slice(0, 11))}
              placeholder="R$ 0,00" placeholderTextColor={colors.muted} style={styles.input} keyboardType="number-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Vencimento</Text>
            <Pressable testID="bill-form-due-date-button" style={styles.dateBtn} onPress={() => setShowCal((v) => !v)}>
              <Ionicons name="calendar-outline" size={20} color={colors.brandPrimary} />
              <Text testID="bill-form-due-date-value" style={styles.dateText}>{formatDate(dueDate)}</Text>
              <Text style={styles.dateAction}>{showCal ? "Fechar" : "Alterar"}</Text>
            </Pressable>
            {showCal ? (
              <CalendarPicker
                value={dueDate}
                onChange={(iso) => {
                  setDueDate(iso);
                  setShowCal(false);
                }}
              />
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Categoria</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Chip key={c} testID={`bill-form-category-${c}`} label={c} selected={category === c} onPress={() => setCategory(c)} />
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Conta recorrente</Text>
                <Text style={styles.switchSub}>Repete todo mês ao marcar como paga</Text>
              </View>
              <Switch testID="bill-form-recurring-switch" value={recurring} onValueChange={setRecurring}
                trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary} />
            </View>
            <View style={[styles.switchRow, styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Já está paga</Text>
                <Text style={styles.switchSub}>Marque se esta conta já foi quitada</Text>
              </View>
              <Switch testID="bill-form-paid-switch" value={paid} onValueChange={setPaid}
                trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }} thumbColor={colors.surfaceSecondary} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              testID="bill-form-notes-input" value={notes} onChangeText={setNotes} placeholder="Código de barras, chave Pix, lembretes..."
              placeholderTextColor={colors.muted} style={[styles.input, styles.notes]} multiline maxLength={500} textAlignVertical="top"
            />
          </View>

          {error ? <Text testID="bill-form-error" style={styles.error}>{error}</Text> : null}

          <Button testID="bill-form-save-button" label={isEdit ? "Salvar alterações" : "Cadastrar conta"} icon="checkmark" onPress={submit} loading={save.isPending} />
          {isEdit && bill ? (
            <Button testID="bill-form-delete-button" label="Excluir conta" icon="trash-outline" variant="danger" onPress={() => del.ask(bill)} loading={del.isPending} />
          ) : null}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: c.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: c.border },
  headerBtn: { width: 84, minHeight: 44, justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  cancel: { fontFamily: fonts.semibold, fontSize: 15, color: c.muted },
  saveText: { fontFamily: fonts.bold, fontSize: 15, color: c.brandPrimary },
  content: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceTertiary },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.medium, fontSize: 16, color: c.onSurface },
  notes: { minHeight: 96, paddingTop: spacing.md },
  dateBtn: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateText: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: c.onSurface },
  dateAction: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, minHeight: 64 },
  divider: { borderTopWidth: 1, borderTopColor: c.divider },
  switchTitle: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurfaceSecondary },
  switchSub: { fontFamily: fonts.regular, fontSize: 13, color: c.muted },
  error: { fontFamily: fonts.semibold, fontSize: 14, color: c.error },
}));
