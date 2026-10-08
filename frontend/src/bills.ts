import type { Bill } from "@/src/types";

export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function daysUntil(iso: string): number {
  return Math.round((parseDate(iso).getTime() - today().getTime()) / 86400000);
}

export function formatDate(iso: string, withYear = true): string {
  const [y, m, d] = iso.split("-");
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export function formatMoney(v: number): string {
  return money.format(v);
}

export function amountLabel(v: number): string {
  return v > 0 ? formatMoney(v) : "Valor não informado";
}

export type BillStatus = "paid" | "overdue" | "soon" | "future";

/** Same rules as the original app: overdue < today, soon = 0..5 days, future > 5 days. */
export function billStatus(b: Bill): BillStatus {
  if (b.paid) return "paid";
  const diff = daysUntil(b.due_date);
  if (diff < 0) return "overdue";
  if (diff <= 5) return "soon";
  return "future";
}

export function dueLabel(b: Bill): string {
  if (b.paid) return "Paga";
  const diff = daysUntil(b.due_date);
  if (diff < -1) return `Venceu há ${-diff} dias`;
  if (diff === -1) return "Venceu ontem";
  if (diff === 0) return "Vence hoje";
  if (diff === 1) return "Vence amanhã";
  return `Vence em ${diff} dias`;
}

export function groupBills(bills: Bill[]) {
  const overdue: Bill[] = [];
  const soon: Bill[] = [];
  const future: Bill[] = [];
  const paid: Bill[] = [];
  for (const b of bills) {
    const s = billStatus(b);
    if (s === "overdue") overdue.push(b);
    else if (s === "soon") soon.push(b);
    else if (s === "future") future.push(b);
    else paid.push(b);
  }
  paid.sort((a, b) => b.due_date.localeCompare(a.due_date));
  return { overdue, soon, future, paid };
}

export function inMonth(iso: string, year: number, month: number): boolean {
  const d = parseDate(iso);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function monthSummary(bills: Bill[], year: number, month: number) {
  const list = bills.filter((b) => inMonth(b.due_date, year, month));
  const pending = list.filter((b) => !b.paid);
  const paid = list.filter((b) => b.paid);
  const sum = (arr: Bill[]) => arr.reduce((acc, b) => acc + (b.amount || 0), 0);
  return {
    total: list.length,
    pendingCount: pending.length,
    paidCount: paid.length,
    pendingTotal: sum(pending),
    paidTotal: sum(paid),
    overdueCount: pending.filter((b) => daysUntil(b.due_date) < 0).length,
  };
}

/** Spending per category in a month (all bills, paid + pending), largest first. */
export function categoryBreakdown(bills: Bill[], year: number, month: number) {
  const map = new Map<string, { total: number; paid: number; count: number }>();
  for (const b of bills) {
    if (!inMonth(b.due_date, year, month)) continue;
    const cur = map.get(b.category) ?? { total: 0, paid: 0, count: 0 };
    cur.total += b.amount || 0;
    if (b.paid) cur.paid += b.amount || 0;
    cur.count += 1;
    map.set(b.category, cur);
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.total - a.total || b.count - a.count);
}

/** "12345" (cents typed) -> 123.45 */
export function centsToNumber(digits: string): number {
  const n = parseInt(digits.replace(/\D/g, "") || "0", 10);
  return n / 100;
}
