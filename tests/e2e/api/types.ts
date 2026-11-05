import type { AccountType } from "../support/domain";

export type { AccountType };

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
};

export type MeResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  isAdmin: boolean;
};

export type AccountResponse = {
  id: string;
  name: string;
  type: AccountType;
  allocationPercent: number;
  balance: number;
  isArchived: boolean;
  displayOrder: number;
  icon: string | null;
  color: string | null;
};

export type AccountBalanceItem = {
  accountId: string;
  name: string;
  type: AccountType;
  allocationPercent: number;
  balance: number;
  icon: string | null;
  color: string | null;
};

export type CategorySpendItem = {
  category: string | null;
  amount: number;
};

export type ActivityItem = {
  id: string;
  kind: "expense" | "income" | "adjustment" | "transfer";
  amount: number;
  description: string;
  category: string | null;
  date: string;
  allocations: { accountName: string; amount: number }[];
};

export type DashboardResponse = {
  accountBalances: AccountBalanceItem[];
  totalSpentThisMonth: number;
  spentByCategory: CategorySpendItem[];
  recentActivity: ActivityItem[];
};

export type ExpenseResponse = {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  note: string | null;
  category: string | null;
  date: string;
  recurringExpenseId: string | null;
};

export type IncomeResponse = {
  id: string;
  amount: number;
  source: string;
  date: string;
  allocations: { accountId: string; amount: number }[];
};

export type RecurringExpenseResponse = {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  amount: number;
  category: string | null;
  note: string | null;
  isArchived: boolean;
};

export type AdminUserResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isAdmin: boolean;
  isLocked: boolean;
};

export type StatsResponse = {
  users: number;
  verifiedUsers: number;
  accounts: number;
  expenses: number;
  openSuggestions: number;
};

export type AdminSuggestionResponse = {
  id: string;
  userId: string;
  userEmail: string;
  message: string;
  category: string | null;
  rating: number | null;
  status: string;
  adminNote: string | null;
  createdAtUtc: string;
};

export type ProblemDetails = {
  title?: string;
  status?: number;
  detail?: string;
  errors?: { code: string; description: string; type: number }[];
};
