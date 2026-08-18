// Preços editáveis dos planos do Riku AI.
// Valores em centavos para evitar float. Mensal.
export const PRICING = {
  personal: {
    id: "personal_monthly",
    label: "Pessoal",
    priceCents: 2990, // R$ 29,90
    currency: "BRL",
    seats: 1,
    description: "Uso individual, 1 workspace",
  },
  business: {
    id: "business_monthly",
    label: "Empresa",
    priceCents: 7990, // R$ 79,90
    currency: "BRL",
    seats: 3,
    description: "Até 3 pessoas no mesmo workspace",
  },
} as const;

// Desconto aplicado a um segundo workspace assinado pelo mesmo usuário.
export const SECOND_WORKSPACE_DISCOUNT_PCT = 50;

/**
 * Retorna o preço em centavos aplicando o desconto quando este é o
 * 2º (ou mais) workspace assinado pelo mesmo usuário.
 */
export function priceForWorkspace(
  plan: keyof typeof PRICING,
  activeWorkspaceCount: number,
): number {
  const base = PRICING[plan].priceCents;
  if (activeWorkspaceCount >= 1) {
    return Math.round(base * (1 - SECOND_WORKSPACE_DISCOUNT_PCT / 100));
  }
  return base;
}

export function formatPriceCents(cents: number, currency = "BRL", locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}
