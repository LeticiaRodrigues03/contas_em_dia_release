import { Alert, Platform } from "react-native";

/** Cross-platform confirm (Alert buttons are a no-op on web). */
export function confirm(title: string, message: string, confirmText = "Confirmar", destructive = true): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}
