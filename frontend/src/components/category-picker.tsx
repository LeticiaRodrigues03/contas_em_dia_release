import Ionicons from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { PromptModal } from "@/src/components/prompt-modal";
import { Chip, haptic, useToast } from "@/src/components/ui";
import { useCategories, useCreateCategory } from "@/src/hooks/use-categories";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface CategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
  testIDPrefix: string;
}

/** Default + custom category chips with an inline "create new category" action. */
export function CategoryPicker({ value, onChange, testIDPrefix }: CategoryPickerProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const categories = useCategories();
  const create = useCreateCategory();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const submit = (name: string) => {
    setError("");
    create.mutate(name, {
      onSuccess: (cat) => {
        haptic("success");
        toast(`Categoria "${cat.name}" criada`);
        onChange(cat.name);
        setOpen(false);
      },
      onError: (e) => setError((e as Error).message),
    });
  };

  return (
    <View style={styles.chips}>
      {categories.map((c) => (
        <Chip key={c} testID={`${testIDPrefix}-category-${c}`} label={c} selected={value === c} onPress={() => onChange(c)} />
      ))}
      <Pressable
        testID={`${testIDPrefix}-category-new`}
        onPress={() => {
          haptic("selection");
          setError("");
          setOpen(true);
        }}
        style={styles.newChip}
      >
        <Ionicons name="add" size={16} color={colors.brandPrimary} />
        <Text style={styles.newText}>Nova categoria</Text>
      </Pressable>

      <PromptModal
        visible={open}
        testID="new-category-modal"
        title="Nova categoria"
        message="Ela ficará disponível em todas as suas contas e nos filtros."
        placeholder="Ex.: Pets, Assinaturas, Filhos"
        confirmLabel="Criar"
        maxLength={30}
        autoCapitalize="words"
        loading={create.isPending}
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={submit}
      />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  newChip: {
    minHeight: 38, paddingHorizontal: spacing.md, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1.5, borderStyle: "dashed", borderColor: c.brandPrimary, backgroundColor: c.brandTertiary,
  },
  newText: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary },
}));
