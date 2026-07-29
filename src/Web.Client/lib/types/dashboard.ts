import { AccountType } from "@/lib/types/account";

export type AccountBalance = {
  accountId: string;
  name: string;
  type: AccountType;
  allocationPercent: number;
  balance: number;
};

export type ActivityItem = {
  id: string;
  kind: "income" | "expense";
  amount: number;
  description: string;
  date: string;
};

export type Dashboard = {
  accountBalances: AccountBalance[];
  totalSpentThisMonth: number;
  recentActivity: ActivityItem[];
};
