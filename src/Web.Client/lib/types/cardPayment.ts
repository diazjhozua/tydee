export type CreateCardPaymentRequest = {
  fromAccountId: string;
  cardAccountId: string;
  amount: number;
  date: string;
};

export type PaymentState = "Settled" | "InCredit" | "PartiallyPaid" | "Unpaid";

export type CardStatementPayment = {
  id: string;
  fromAccountId: string;
  fromAccountName: string;
  amount: number;
  date: string;
};

export type CardStatement = {
  accountId: string;
  name: string;
  // Positive when money is owed, negative when the card is in credit.
  owed: number;
  paidThisMonth: number;
  paymentState: PaymentState;
  payments: CardStatementPayment[];
};
