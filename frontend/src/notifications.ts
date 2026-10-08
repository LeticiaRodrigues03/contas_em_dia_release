import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { formatDate, amountLabel, parseDate } from "@/src/bills";
import type { Prefs } from "@/src/prefs";
import type { Bill } from "@/src/types";

const supported = Platform.OS !== "web";
const CHANNEL = "contas_channel";
const REMINDER_HOUR = 9;
const MAX_SCHEDULED = 60; // iOS keeps at most 64 pending local notifications

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: "Lembretes de contas",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const res = await Notifications.requestPermissionsAsync();
    return res.granted;
  } catch {
    return false;
  }
}

export async function cancelAllReminders() {
  if (!supported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

function at(iso: string, daysBefore: number): Date {
  const d = parseDate(iso);
  d.setDate(d.getDate() - daysBefore);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
}

/** Re-creates every reminder from the current bill list (idempotent). */
export async function syncReminders(bills: Bill[], prefs: Prefs) {
  if (!supported) return;
  await cancelAllReminders();
  if (!prefs.notificationsEnabled) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await ensureChannel();
    const now = Date.now();
    const jobs: { date: Date; title: string; body: string }[] = [];
    for (const b of bills) {
      if (b.paid) continue;
      const due = formatDate(b.due_date);
      const before = at(b.due_date, prefs.daysBefore);
      if (before.getTime() > now) {
        jobs.push({
          date: before,
          title: "Conta a vencer",
          body: `${b.name} vence em ${due} (${amountLabel(b.amount)})`,
        });
      }
      const onDay = at(b.due_date, 0);
      if (prefs.notifyOnDueDay && onDay.getTime() > now) {
        jobs.push({ date: onDay, title: "Conta vence hoje", body: `${b.name} vence hoje · ${amountLabel(b.amount)}` });
      }
    }
    jobs.sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const j of jobs.slice(0, MAX_SCHEDULED)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: j.title, body: j.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.date, channelId: CHANNEL },
      });
    }
  } catch {
    // scheduling failures must never break the app
  }
}

export async function sendTestNotification(): Promise<boolean> {
  if (!(await requestPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    content: { title: "🔔 Teste de notificação", body: "Se você está vendo isso, os lembretes estão funcionando." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL },
  });
  return true;
}

export const notificationsSupported = supported;
