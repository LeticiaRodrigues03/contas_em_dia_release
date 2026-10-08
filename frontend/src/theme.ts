// Design tokens for "Contas em Dia". Light + dark, keys match /app/design_guidelines.json.
// Style with makeStyles; for non-style color props read useTheme().colors.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FAFAFA",
  onSurface: "#171717",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#262626",
  surfaceTertiary: "#F5F5F5",
  onSurfaceTertiary: "#404040",
  surfaceInverse: "#171717",
  onSurfaceInverse: "#FAFAFA",
  muted: "#737373",

  brand: "#059669",
  onBrand: "#FFFFFF",
  brandPrimary: "#059669",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#D1FAE5",
  onBrandSecondary: "#065F46",
  brandTertiary: "#ECFDF5",
  onBrandTertiary: "#047857",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  // Soft tints of the status colors, used behind status sections
  successSoft: "#ECFDF5",
  warningSoft: "#FFFBEB",
  errorSoft: "#FEF2F2",
  infoSoft: "#EFF6FF",

  border: "#E5E5E5",
  borderStrong: "#D4D4D4",
  divider: "#F5F5F5",
  scrim: "rgba(0,0,0,0.55)",
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  surface: "#121212",
  onSurface: "#F5F5F5",
  surfaceSecondary: "#1E1E1E",
  onSurfaceSecondary: "#E5E5E5",
  surfaceTertiary: "#262626",
  onSurfaceTertiary: "#A3A3A3",
  surfaceInverse: "#FAFAFA",
  onSurfaceInverse: "#171717",
  muted: "#A3A3A3",

  brand: "#10B981",
  onBrand: "#000000",
  brandPrimary: "#10B981",
  onBrandPrimary: "#000000",
  brandSecondary: "#064E3B",
  onBrandSecondary: "#D1FAE5",
  brandTertiary: "#022C22",
  onBrandTertiary: "#6EE7B7",

  success: "#34D399",
  onSuccess: "#000000",
  warning: "#FBBF24",
  onWarning: "#000000",
  error: "#F87171",
  onError: "#000000",
  info: "#60A5FA",
  onInfo: "#000000",

  successSoft: "#062A1F",
  warningSoft: "#2B2107",
  errorSoft: "#2E1212",
  infoSoft: "#0F1D33",

  border: "#404040",
  borderStrong: "#525252",
  divider: "#262626",
  scrim: "rgba(0,0,0,0.65)",
};

export const fonts = {
  display: "Outfit_700Bold",
  displaySemi: "Outfit_600SemiBold",
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

// In-app override (works on native and web; Appearance.setColorScheme is a no-op on web)
let override: ColorScheme | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function setColorScheme(scheme: ColorScheme | null) {
  override = scheme;
  Appearance.setColorScheme?.(scheme ?? "unspecified");
  listeners.forEach((fn) => fn());
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const forced = useSyncExternalStore(subscribe, () => override, () => override);
  const effective = forced ?? system;
  const scheme: ColorScheme = effective === "dark" && themes.dark ? "dark" : "light";
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
