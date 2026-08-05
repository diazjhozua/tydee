import { AccountType } from "@/lib/types/account";

export type AccountBalance = {
  accountId: string;
  name: string;
  type: AccountType;
  allocationPercent: number;
  balance: number;
};

export type ActivityAllocation = {
  accountName: string;
  amount: number;
};

export type ActivityItem = {
  id: string;
  kind: "income" | "expense" | "adjustment";
  amount: number;
  description: string;
  category: string | null;
  date: string;
  allocations: ActivityAllocation[];
};

export type Dashboard = {
  accountBalances: AccountBalance[];
  totalSpentThisMonth: number;
  recentActivity: ActivityItem[];
};
