// Formatação de moeda/data respeitando as preferências do usuário.
// Fallback: pt-BR / BRL, para não quebrar telas antigas.

export type SupportedCurrency = "BRL" | "USD" | "EUR" | "GBP" | "JPY" | "ARS" | "MXN" | "CAD" | "AUD" | "CHF";
export type SupportedLocale = "pt-BR" | "en-US" | "es-ES" | "es-MX" | "fr-FR" | "de-DE" | "it-IT" | "ja-JP";

export const CURRENCY_OPTIONS: { code: SupportedCurrency; label: string; symbol: string }[] = [
  { code: "BRL", label: "Real brasileiro",   symbol: "R$" },
  { code: "USD", label: "US Dollar",         symbol: "$"  },
  { code: "EUR", label: "Euro",              symbol: "€"  },
  { code: "GBP", label: "British Pound",     symbol: "£"  },
  { code: "JPY", label: "Japanese Yen",      symbol: "¥"  },
  { code: "ARS", label: "Peso argentino",    symbol: "$"  },
  { code: "MXN", label: "Peso mexicano",     symbol: "$"  },
  { code: "CAD", label: "Canadian Dollar",   symbol: "$"  },
  { code: "AUD", label: "Australian Dollar", symbol: "$"  },
  { code: "CHF", label: "Swiss Franc",       symbol: "Fr" },
];

export const LOCALE_OPTIONS: { code: SupportedLocale; label: string }[] = [
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "en-US", label: "English (US)" },
  { code: "es-ES", label: "Español (España)" },
  { code: "es-MX", label: "Español (México)" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "it-IT", label: "Italiano" },
  { code: "ja-JP", label: "日本語" },
];

let _locale: SupportedLocale = "pt-BR";
let _currency: SupportedCurrency = "BRL";

export function setFormattingPrefs(locale: SupportedLocale, currency: SupportedCurrency) {
  _locale = locale;
  _currency = currency;
}

export function getCurrency(): SupportedCurrency { return _currency; }
export function getLocale():   SupportedLocale   { return _locale; }

export function formatMoney(amount: number, currency?: SupportedCurrency, locale?: SupportedLocale): string {
  return new Intl.NumberFormat(locale ?? _locale, { style: "currency", currency: currency ?? _currency }).format(amount || 0);
}

export function formatDate(iso: string, locale?: SupportedLocale): string {
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  return new Intl.DateTimeFormat(locale ?? _locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

/** Compatibilidade — mantém a assinatura antiga usada por vários componentes. */
export function formatBRL(amount: number): string {
  return formatMoney(amount);
}
