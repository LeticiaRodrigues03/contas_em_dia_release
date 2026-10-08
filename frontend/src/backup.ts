import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { api } from "@/src/api";
import type { BillInput } from "@/src/types";

export async function exportBackup(): Promise<number> {
  const data = await api.exportBackup();
  const content = JSON.stringify(data, null, 2);
  const name = `contas-em-dia-backup-${data.exported_at.slice(0, 10)}.json`;
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true });
    file.write(content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Salvar backup" });
    }
  }
  return data.bills.length;
}

/** Returns parsed bills from a picked backup file, or null if the user cancelled. */
export async function pickBackup(): Promise<BillInput[] | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;
  const text = Platform.OS === "web" ? await (await fetch(uri)).text() : await new File(uri).text();
  let parsed: { app?: string; bills?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Arquivo inválido. Escolha um backup do Contas em Dia.");
  }
  if (!Array.isArray(parsed.bills)) throw new Error("Arquivo inválido. Escolha um backup do Contas em Dia.");
  return parsed.bills as BillInput[];
}
