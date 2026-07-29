export type AccountType = "Spending" | "Saving";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  allocationPercent: number;
  balance: number;
  isArchived: boolean;
};

export type CreateAccountRequest = {
  name: string;
  type: AccountType;
  allocationPercent: number;
};

export type UpdateAccountRequest = {
  name: string;
  type: AccountType;
};

export type AllocationTemplateItem = {
  accountId: string;
  percent: number;
};
