export type AccountType = "Spending" | "Saving";

export type Account = {
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

export type CreateAccountRequest = {
  name: string;
  type: AccountType;
  allocationPercent: number;
  icon: string | null;
  color: string | null;
};

export type UpdateAccountRequest = {
  name: string;
  type: AccountType;
  icon: string | null;
  color: string | null;
};

export type AllocationTemplateItem = {
  accountId: string;
  percent: number;
};
