import type { AccountType } from "../support/domain";

export type AccountSpec = {
  name: string;
  type: AccountType;
  percent: number;
};

export function defaultAccountSpecs(): AccountSpec[] {
  return [
    { name: "Budget", type: "Spending", percent: 50 },
    { name: "Savings", type: "Saving", percent: 30 },
    { name: "Emergency Fund", type: "Saving", percent: 20 },
  ];
}

export function accountSpec(
  name: string,
  type: AccountType = "Spending",
  percent = 0,
): AccountSpec {
  return { name, type, percent };
}
