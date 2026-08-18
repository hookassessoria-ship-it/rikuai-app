import { Trash2, TrendingUp, TrendingDown, Calendar, CreditCard, Wallet, Banknote } from "lucide-react";
import { Transaction } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useT, tCategory } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";

interface TransactionListProps {
  transactions: Transaction[];
  onDelete:     (id: string) => void;
}

/** Compat: mantém o nome antigo, agora respeitando a moeda escolhida. */
export function formatBRL(amount: number) {
  return formatMoney(amount);
}

const PAYMENT_ICONS = {
  "dinheiro": <Banknote  className="w-3 h-3" />,
  "débito":   <Wallet    className="w-3 h-3" />,
  "crédito":  <CreditCard className="w-3 h-3" />,
};

const PAYMENT_KEYS: Record<string, string> = {
  "dinheiro": "pay_dinheiro",
  "débito":   "pay_debito",
  "crédito":  "pay_credito",
};

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const t = useT();
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sorted.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-4xl mb-3">💸</div>
        <p className="text-sm font-semibold text-foreground">{t("tx_empty")}</p>
        <p className="text-xs text-muted-custom mt-1">{t("tx_empty_hint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4">
      <p className="text-xs font-bold text-muted-custom uppercase tracking-widest px-1">
        {t("tx_recent")}
      </p>
      {sorted.slice(0, 30).map((tx) => (
        <div
          key={tx.id}
          className="flex items-center gap-3 rounded-2xl p-3.5 bg-surface border border-border/60 hover:border-border transition-colors"
        >
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              tx.type === "receita" ? "bg-income/15" : "bg-expense/15"
            )}
          >
            {tx.type === "receita"
              ? <TrendingUp  className="w-4 h-4 text-income" />
              : <TrendingDown className="w-4 h-4 text-expense" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {tx.description || tCategory(tx.category)}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-foreground-subtle" />
                <p className="text-[11px] text-muted-custom">
                  {formatDate(tx.date)} · {tCategory(tx.category)}
                </p>
              </div>
              {tx.paymentMethod && (
                <div
                  className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{
                    color: tx.paymentMethod === "crédito" ? "hsl(var(--primary))" : "hsl(var(--foreground-muted))",
                    background: tx.paymentMethod === "crédito" ? "hsl(var(--primary) / 0.12)" : "hsl(var(--surface-overlay))",
                  }}
                >
                  {PAYMENT_ICONS[tx.paymentMethod]}
                  {t(PAYMENT_KEYS[tx.paymentMethod] ?? "")}
                </div>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className={cn("text-sm font-black", tx.type === "receita" ? "text-income" : "text-expense")}>
              {tx.type === "receita" ? "+" : "-"}{formatMoney(tx.amount)}
            </p>
          </div>
          <button
            onClick={() => onDelete(tx.id)}
            className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-all ml-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
