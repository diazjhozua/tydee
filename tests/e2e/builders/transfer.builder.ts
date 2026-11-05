import { todayIso } from "../support/time";

export type TransferSpec = {
  fromName: string;
  toName: string;
  amount: number;
  date: string;
};

export function transferSpec(
  fromName: string,
  toName: string,
  amount: number,
  date = todayIso(),
): TransferSpec {
  return { fromName, toName, amount, date };
}
