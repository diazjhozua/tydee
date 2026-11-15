import { Account, AccountType } from "@/lib/types/account";

export type AccountTypeBehavior = {
  label: string;
  optionLabel: string;
  canReceiveAllocation: boolean;
  isCard: boolean;
  // Keys into ACCOUNT_ICON_OPTIONS and ACCOUNT_COLOR_OPTIONS (components/shared/AccountIcon).
  defaultIcon: string;
  defaultColor: string;
  // The amount the UI shows for a stored balance.
  displayAmount: (balance: number) => number;
};

const asStored = (balance: number) => balance;

export const ACCOUNT_TYPE_BEHAVIOR: Record<AccountType, AccountTypeBehavior> = {
  Spending: {
    label: "Spending",
    optionLabel: "Spending (day-to-day budget)",
    canReceiveAllocation: true,
    isCard: false,
    defaultIcon: "wallet",
    defaultColor: "sky",
    displayAmount: asStored,
  },
  Saving: {
    label: "Saving",
    optionLabel: "Saving (money you keep)",
    canReceiveAllocation: true,
    isCard: false,
    defaultIcon: "piggy-bank",
    defaultColor: "emerald",
    displayAmount: asStored,
  },
  CreditCard: {
    label: "Credit Card",
    optionLabel: "Credit Card (pay off what you spend)",
    canReceiveAllocation: false,
    isCard: true,
    defaultIcon: "credit-card",
    defaultColor: "rose",
    // A negative stored balance means money is owed. `0 - balance` rather
    // than `-balance` so a zero balance stays +0.
    displayAmount: (balance) => 0 - balance,
  },
};

// Order used by the account type picker.
export const ACCOUNT_TYPES: AccountType[] = ["Spending", "Saving", "CreditCard"];

export type CardOwedStatus = "owed" | "paid" | "inCredit";

export function cardOwedStatus(owed: number): CardOwedStatus {
  if (owed > 0) {
    return "owed";
  }
  return owed < 0 ? "inCredit" : "paid";
}

// The accounts page total. Card balances are money owed, not funds on hand, so
// they stay out of the sum; a card's own row still shows its owed amount.
export function envelopeTotal(accounts: Pick<Account, "type" | "balance">[]): number {
  return accounts
    .filter((account) => !ACCOUNT_TYPE_BEHAVIOR[account.type].isCard)
    .reduce((sum, account) => sum + account.balance, 0);
}
