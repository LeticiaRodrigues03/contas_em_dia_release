import { storage } from "@/src/utils/storage";
import type { AuthOut, BackupOut, Bill, BillInput, ImportOut, PaidOut, User } from "@/src/types";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const TOKEN_KEY = "contas_em_dia_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

function errorMessage(body: unknown): string {
  const detail = (body as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as { loc?: string[]; msg?: string };
    const field = first.loc?.[first.loc.length - 1];
    if (field === "email") return "Informe um e-mail válido";
    if (field === "password") return "A senha deve ter pelo menos 6 caracteres";
    if (field === "name") return "Informe o nome";
    return first.msg ?? "Dados inválidos";
  }
  return "Não foi possível conectar. Verifique sua internet.";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await storage.secureGet(TOKEN_KEY, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Tente novamente.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, errorMessage(body));
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthOut>("/auth/register", json("POST", { name, email, password })),
  login: (email: string, password: string) =>
    request<AuthOut>("/auth/login", json("POST", { email, password })),
  me: () => request<User>("/auth/me"),
  deleteAccount: () => request<void>("/auth/me", json("DELETE")),

  listBills: () => request<Bill[]>("/bills"),
  getBill: (id: string) => request<Bill>(`/bills/${id}`),
  createBill: (data: BillInput) => request<Bill>("/bills", json("POST", data)),
  updateBill: (id: string, data: BillInput) => request<Bill>(`/bills/${id}`, json("PUT", data)),
  setPaid: (id: string, paid: boolean) => request<PaidOut>(`/bills/${id}/paid`, json("PATCH", { paid })),
  deleteBill: (id: string) => request<void>(`/bills/${id}`, json("DELETE")),

  exportBackup: () => request<BackupOut>("/backup/export"),
  importBackup: (bills: BillInput[], replace: boolean) =>
    request<ImportOut>("/backup/import", json("POST", { bills, replace })),
};

export const BILLS_KEY = ["bills"] as const;
