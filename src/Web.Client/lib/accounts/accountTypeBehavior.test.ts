import { describe, expect, it } from "vitest";
import {
  ACCOUNT_TYPE_BEHAVIOR,
  ACCOUNT_TYPES,
  cardOwedStatus,
  envelopeTotal,
} from "@/lib/accounts/accountTypeBehavior";

describe("ACCOUNT_TYPE_BEHAVIOR", () => {
  it("shows owed as the negated balance for a credit card", () => {
    const card = ACCOUNT_TYPE_BEHAVIOR.CreditCard;

    expect(card.displayAmount(-250)).toBe(250);
    expect(card.displayAmount(40)).toBe(-40);
  });

  it("returns a zero balance as +0 for a credit card", () => {
    expect(Object.is(ACCOUNT_TYPE_BEHAVIOR.CreditCard.displayAmount(0), 0)).toBe(true);
  });

  it("leaves spending and saving balances as stored", () => {
    expect(ACCOUNT_TYPE_BEHAVIOR.Spending.displayAmount(400)).toBe(400);
    expect(ACCOUNT_TYPE_BEHAVIOR.Saving.displayAmount(-30)).toBe(-30);
  });

  it("labels each type", () => {
    expect(ACCOUNT_TYPE_BEHAVIOR.Spending.label).toBe("Spending");
    expect(ACCOUNT_TYPE_BEHAVIOR.Saving.label).toBe("Saving");
    expect(ACCOUNT_TYPE_BEHAVIOR.CreditCard.label).toBe("Credit Card");
  });

  it("keeps the picker options in order with their full labels", () => {
    expect(ACCOUNT_TYPES).toEqual(["Spending", "Saving", "CreditCard"]);
    expect(ACCOUNT_TYPE_BEHAVIOR.Saving.optionLabel).toBe("Saving (money you keep)");
    expect(ACCOUNT_TYPE_BEHAVIOR.CreditCard.optionLabel).toBe(
      "Credit Card (pay off what you spend)",
    );
  });

  it("does not let a credit card receive an allocation", () => {
    expect(ACCOUNT_TYPE_BEHAVIOR.CreditCard.canReceiveAllocation).toBe(false);
    expect(ACCOUNT_TYPE_BEHAVIOR.CreditCard.isCard).toBe(true);
    expect(ACCOUNT_TYPE_BEHAVIOR.Spending.canReceiveAllocation).toBe(true);
    expect(ACCOUNT_TYPE_BEHAVIOR.Saving.isCard).toBe(false);
  });
});

describe("cardOwedStatus", () => {
  it("is owed when money is owed, paid at zero, and in credit below zero", () => {
    expect(cardOwedStatus(250)).toBe("owed");
    expect(cardOwedStatus(0)).toBe("paid");
    expect(cardOwedStatus(-40)).toBe("inCredit");
  });
});

describe("envelopeTotal", () => {
  it("sums spending and saving balances", () => {
    expect(
      envelopeTotal([
        { type: "Spending", balance: 400 },
        { type: "Saving", balance: 300 },
      ]),
    ).toBe(700);
  });

  it("excludes a credit card so its owed balance does not reduce the total", () => {
    expect(
      envelopeTotal([
        { type: "Spending", balance: 400 },
        { type: "CreditCard", balance: -250 },
        { type: "Saving", balance: 300 },
      ]),
    ).toBe(700);
  });

  it("is zero when there are no accounts or only cards", () => {
    expect(envelopeTotal([])).toBe(0);
    expect(envelopeTotal([{ type: "CreditCard", balance: -90 }])).toBe(0);
  });
});
