import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

import { Button } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

interface PromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  loading?: boolean;
  error?: string;
  testID: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

/** Small bottom-sheet style text prompt (used for category names and family codes). */
export function PromptModal({
  visible, title, message, placeholder, initialValue = "", confirmLabel = "Salvar", maxLength = 40,
  autoCapitalize = "sentences", loading, error, testID, onCancel, onConfirm,
}: PromptModalProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <Pressable style={styles.backdropTouch} onPress={onCancel} />
        <View style={styles.sheet} testID={testID}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TextInput
            testID={`${testID}-input`}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={maxLength}
            autoFocus
            autoCapitalize={autoCapitalize}
            returnKeyType="done"
            onSubmitEditing={() => value.trim() && onConfirm(value.trim())}
          />
          {error ? <Text testID={`${testID}-error`} style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button testID={`${testID}-cancel`} label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
            <Button testID={`${testID}-confirm`} label={confirmLabel} onPress={() => onConfirm(value.trim())} loading={loading} disabled={!value.trim()} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: c.scrim },
  backdropTouch: { flex: 1 },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  message: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, lineHeight: 20 },
  input: { minHeight: 52, borderRadius: radius.md, backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.lg, fontFamily: fonts.medium, fontSize: 16, color: c.onSurface },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: c.error },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
}));
