// TS mirrors of backend Pydantic models (backend/models/*.py). Keep in sync.

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthOut {
  access_token: string;
  token_type: string;
  user: User;
}

export interface BillInput {
  name: string;
  amount: number; // 0 = "Valor não informado"
  due_date: string; // YYYY-MM-DD
  recurring: boolean;
  category: string;
  notes: string;
  paid: boolean;
}

export interface Bill extends BillInput {
  id: string;
  user_id: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaidOut {
  bill: Bill;
  next_bill: Bill | null;
}

export interface BackupOut {
  app: string;
  version: number;
  exported_at: string;
  bills: BillInput[];
}

export interface ImportOut {
  imported: number;
}

export interface CustomCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface CategoryListOut {
  defaults: string[];
  custom: CustomCategory[];
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  is_owner: boolean;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  members: FamilyMember[];
  created_at: string;
}

export const CATEGORIES = [
  "Moradia", "Energia", "Água", "Internet", "Telefone", "Cartão",
  "Transporte", "Saúde", "Educação", "Lazer", "Impostos", "Outros",
] as const;
