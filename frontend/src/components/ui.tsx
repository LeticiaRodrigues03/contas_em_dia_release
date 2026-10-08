import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleProp, Text, View, ViewStyle } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function haptic(kind: "light" | "medium" | "success" | "warning" | "selection" = "light") {
  if (Platform.OS === "web") return;
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "warning") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === "selection") void Haptics.selectionAsync();
  else void Haptics.impactAsync(kind === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

/** Brand mark: official logo in a rounded(12) green-tinted box, as in the original app bar. */
export function Logo({ size = 40 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      testID="app-logo"
      style={{
        width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.brandTertiary,
        alignItems: "center", justifyContent: "center", padding: size * 0.12,
      }}
    >
      <Image source={require("../../assets/images/logo.png")} style={{ width: "100%", height: "100%" }} contentFit="contain" />
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  testID: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, testID, variant = "primary", icon, loading, disabled, style }: ButtonProps) {
  const { colors } = useTheme();
  const bg = { primary: colors.brandPrimary, secondary: colors.brandSecondary, danger: colors.errorSoft, ghost: "transparent" }[variant];
  const fg = { primary: colors.onBrandPrimary, secondary: colors.onBrandSecondary, danger: colors.error, ghost: colors.brandPrimary }[variant];
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        haptic("light");
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: 52, borderRadius: radius.md, backgroundColor: bg, flexDirection: "row",
          alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
          <Text style={{ color: fg, fontFamily: fonts.bold, fontSize: 16 }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID: string }) {
  const styles = useChipStyles();
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        haptic("selection");
        onPress();
      }}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.text, selected && styles.textOn]}>{label}</Text>
    </Pressable>
  );
}

const useChipStyles = makeStyles((c) => ({
  chip: {
    minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, justifyContent: "center",
    backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border,
  },
  chipOn: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  text: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceTertiary },
  textOn: { color: c.onBrandPrimary },
}));

// ---------------------------------------------------------------------------
// Toast (snackbar), mirrors showSnack() from the original app
// ---------------------------------------------------------------------------
type ToastKind = "success" | "error" | "info";
const ToastContext = createContext<(msg: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, kind, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const bg = toast?.kind === "error" ? colors.error : toast?.kind === "info" ? colors.surfaceInverse : colors.brandPrimary;
  const fg = toast?.kind === "error" ? colors.onError : toast?.kind === "info" ? colors.onSurfaceInverse : colors.onBrandPrimary;
  const icon = toast?.kind === "error" ? "alert-circle" : toast?.kind === "info" ? "information-circle" : "checkmark-circle";

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.key}
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutDown}
          pointerEvents="none"
          style={{
            position: "absolute", left: spacing.lg, right: spacing.lg, bottom: insets.bottom + 150,
            backgroundColor: bg, borderRadius: radius.md, padding: spacing.lg, flexDirection: "row",
            alignItems: "center", gap: spacing.md,
          }}
        >
          <Ionicons name={icon} size={24} color={fg} />
          <Text testID="toast-message" style={{ color: fg, fontFamily: fonts.semibold, fontSize: 15, flex: 1 }}>
            {toast.msg}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
