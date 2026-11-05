import type { TydeeApi } from "../api";
import type { AccountResponse, AccountType } from "../api/types";
import type { AccountSpec } from "../builders/account.builder";
import { defaultAccountSpecs } from "../builders/account.builder";
import type { ExpenseSpec } from "../builders/expense.builder";
import type { IncomeSpec } from "../builders/income.builder";
import type { RecurringSpec } from "../builders/recurring.builder";
import type { TransferSpec } from "../builders/transfer.builder";
import { todayIso } from "../support/time";

/**
 * Seeds data through the API so specs never resolve account ids themselves.
 * Every spec owns its own user, so names only need to be unique within a test.
 */
export class Seed {
  readonly accounts = new Map<string, AccountResponse>();

  constructor(private readonly api: TydeeApi) {}

  async withAccounts(specs: AccountSpec[] = defaultAccountSpecs()): Promise<void> {
    if (this.accounts.size > 0) {
      throw new Error("withAccounts can only be called once per test.");
    }

    for (const spec of specs) {
      await this.api.accounts.create({ name: spec.name, type: spec.type });
    }

    await this.refreshAccounts();

    await this.api.accounts.updateTemplate(
      specs.map((spec) => ({
        accountId: this.account(spec.name).id,
        percent: spec.percent,
      })),
    );

    await this.refreshAccounts();
  }

  account(name: string): AccountResponse {
    const account = this.accounts.get(name);

    if (!account) {
      throw new Error(
        `Unknown account "${name}". Known accounts: ${[...this.accounts.keys()].join(", ")}.`,
      );
    }

    return account;
  }

  async refreshAccounts(): Promise<void> {
    const accounts = await this.api.accounts.list();

    this.accounts.clear();

    for (const account of accounts) {
      this.accounts.set(account.name, account);
    }
  }

  async income(spec: IncomeSpec): Promise<string> {
    const allocations = Object.entries(spec.split).map(([name, amount]) => ({
      accountId: this.account(name).id,
      amount,
    }));

    const response = await this.api.incomes.create({
      amount: spec.amount,
      source: spec.source,
      date: spec.date,
      allocations,
    });

    await this.refreshAccounts();

    return response.id;
  }

  /** Splits an income by the stored allocation template, fixing rounding on the last line. */
  async incomeFromTemplate(
    amount: number,
    source = "Salary",
    date = todayIso(),
  ): Promise<string> {
    const accounts = [...this.accounts.values()];
    const split: Record<string, number> = {};
    let assigned = 0;

    accounts.forEach((account, index) => {
      if (index === accounts.length - 1) {
        split[account.name] = Math.round((amount - assigned) * 100) / 100;
        return;
      }

      const share = Math.round(amount * account.allocationPercent) / 100;
      split[account.name] = share;
      assigned += share;
    });

    return this.income({ amount, source, date, split });
  }

  async expense(spec: ExpenseSpec): Promise<string> {
    const response = await this.api.expenses.create({
      accountId: this.account(spec.accountName).id,
      amount: spec.amount,
      note: spec.note,
      category: spec.category,
      date: spec.date,
      recurringExpenseId: spec.recurringExpenseId ?? null,
    });

    await this.refreshAccounts();

    return response.id;
  }

  async transfer(spec: TransferSpec): Promise<string> {
    const response = await this.api.transfers.create({
      fromAccountId: this.account(spec.fromName).id,
      toAccountId: this.account(spec.toName).id,
      amount: spec.amount,
      date: spec.date,
    });

    await this.refreshAccounts();

    return response.id;
  }

  async recurring(spec: RecurringSpec): Promise<string> {
    const response = await this.api.recurring.create({
      name: spec.name,
      accountId: this.account(spec.accountName).id,
      amount: spec.amount,
      category: spec.category,
      note: spec.note,
    });

    return response.id;
  }

  async suggestion(message: string, category: string | null = null, rating: number | null = null) {
    return this.api.suggestions.create({ message, category, rating });
  }

  async addAccount(name: string, type: AccountType = "Spending"): Promise<AccountResponse> {
    await this.api.accounts.create({ name, type });
    await this.refreshAccounts();

    return this.account(name);
  }
}
