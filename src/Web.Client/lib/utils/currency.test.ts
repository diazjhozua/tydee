import { describe, expect, it } from "vitest";
import { SUPPORTED_CURRENCIES, currencySymbol, formatMoney } from "@/lib/utils/currency";

describe("formatMoney", () => {
  it("formats whole and fractional amounts with the narrow symbol", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });

  it("uses the currency's own decimal rules", () => {
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
  });

  it("keeps the minus sign for negative amounts", () => {
    expect(formatMoney(-12.5, "USD")).toBe("-$12.50");
  });
});

describe("currencySymbol", () => {
  it("returns only the currency symbol", () => {
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("PHP")).toBe("₱");
  });
});

describe("SUPPORTED_CURRENCIES", () => {
  it("covers the currencies offered in settings", () => {
    expect(SUPPORTED_CURRENCIES).toEqual([
      "PHP",
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "AUD",
      "CAD",
      "SGD",
    ]);
  });
});
