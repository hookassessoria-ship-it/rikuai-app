import { describe, expect, it, beforeEach } from "vitest";
import { formatDate, formatMoney, setFormattingPrefs } from "@/lib/format";

const nb = (s: string) => s.replace(/\u00a0|\u202f/g, " ");

describe("formatMoney", () => {
  beforeEach(() => setFormattingPrefs("pt-BR", "BRL"));

  it("formats BRL in pt-BR", () => {
    expect(nb(formatMoney(1234.5))).toBe("R$ 1.234,50");
  });

  it("formats USD in en-US", () => {
    setFormattingPrefs("en-US", "USD");
    expect(nb(formatMoney(1234.5))).toBe("$1,234.50");
  });

  it("formats EUR in de-DE", () => {
    setFormattingPrefs("de-DE", "EUR");
    expect(nb(formatMoney(1234.5))).toBe("1.234,50 €");
  });

  it("honours explicit overrides regardless of global prefs", () => {
    setFormattingPrefs("pt-BR", "BRL");
    expect(nb(formatMoney(10, "USD", "en-US"))).toBe("$10.00");
  });

  it("treats invalid amounts as zero", () => {
    setFormattingPrefs("pt-BR", "BRL");
    expect(nb(formatMoney(NaN as unknown as number))).toBe("R$ 0,00");
  });
});

describe("formatDate", () => {
  it("uses dd/mm/yyyy for pt-BR", () => {
    setFormattingPrefs("pt-BR", "BRL");
    expect(formatDate("2026-03-19")).toBe("19/03/2026");
  });

  it("uses mm/dd/yyyy for en-US", () => {
    setFormattingPrefs("en-US", "USD");
    expect(formatDate("2026-03-19")).toBe("03/19/2026");
  });

  it("does not shift the day across timezones for date-only strings", () => {
    setFormattingPrefs("pt-BR", "BRL");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });

  it("accepts full ISO timestamps", () => {
    setFormattingPrefs("pt-BR", "BRL");
    expect(formatDate("2026-03-19T15:04:05.000Z")).toMatch(/^19\/03\/2026$|^20\/03\/2026$/);
  });
});
