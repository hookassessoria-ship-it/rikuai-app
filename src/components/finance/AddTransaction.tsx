import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, CreditCard, Banknote, Wallet } from "lucide-react";
import { Transaction, PaymentMethod, RESERVE_CATEGORY } from "@/types/finance";
import { Bill } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useT, tCategory } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";

const BASE_INCOME_CATEGORIES  = ["Salário", "Freelance", "Vendas", "Investimentos", "Outros"];
const BASE_EXPENSE_CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Investimento", RESERVE_CATEGORY, "Outros"];

const PAYMENT_METHODS: { id: PaymentMethod; labelKey: string; icon: React.ReactNode }[] = [
  { id: "dinheiro", labelKey: "pay_dinheiro", icon: <Banknote  className="w-3.5 h-3.5" /> },
  { id: "débito",   labelKey: "pay_debito",   icon: <Wallet    className="w-3.5 h-3.5" /> },
  { id: "crédito",  labelKey: "pay_credito",  icon: <CreditCard className="w-3.5 h-3.5" /> },
];

interface AddTransactionProps {
  onAdd:                    (t: Omit<Transaction, "id">) => void;
  creditCards:              Bill[];
  customIncomeCategories?:  string[];
  customExpenseCategories?: string[];
}

export function AddTransaction({ onAdd, creditCards, customIncomeCategories = [], customExpenseCategories = [] }: AddTransactionProps) {
  const t = useT();
  const currencySymbol = formatMoney(0).replace(/[\d.,\s]/g, "");
  const INCOME_CATEGORIES  = [...BASE_INCOME_CATEGORIES, ...customIncomeCategories];
  const EXPENSE_CATEGORIES = [...BASE_EXPENSE_CATEGORIES, ...customExpenseCategories];
  const [type,          setType]          = useState<"receita" | "despesa">("receita");
  const [amount,        setAmount]        = useState("");
  const [category,      setCategory]      = useState("");
  const [description,   setDescription]   = useState("");
  const [date,          setDate]          = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [creditCardId,  setCreditCardId]  = useState("");

  const categories = type === "receita" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;
    onAdd({
      type,
      amount:        parseFloat(amount.replace(",", ".")),
      category,
      description,
      date,
      paymentMethod: type === "despesa" ? paymentMethod : undefined,
      creditCardId:  type === "despesa" && paymentMethod === "crédito" ? creditCardId : undefined,
    });
    setAmount("");
    setDescription("");
    setCategory("");
    setPaymentMethod("dinheiro");
    setCreditCardId("");
  };

  const isValid = !!amount && !!category && (
    type === "receita" ||
    paymentMethod !== "crédito" ||
    !!creditCardId
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t("add_title")}</h2>
        <p className="text-xs text-muted-custom mt-0.5">{t("add_subtitle")}</p>
      </div>

      {/* ── Type Toggle ── */}
      <div className="flex rounded-2xl overflow-hidden border border-border p-1 bg-surface">
        <button
          type="button"
          onClick={() => { setType("receita"); setCategory(""); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
            type === "receita"
              ? "bg-income text-on-accent shadow-lg"
              : "text-muted-custom hover:text-foreground"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          {t("add_receita")}
        </button>
        <button
          type="button"
          onClick={() => { setType("despesa"); setCategory(""); }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
            type === "despesa"
              ? "bg-expense text-on-accent shadow-lg"
              : "text-muted-custom hover:text-foreground"
          )}
        >
          <TrendingDown className="w-4 h-4" />
          {t("add_despesa")}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ── Amount ── */}
        <div>
          <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block mb-2">
            {t("add_value")}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-custom font-bold text-sm select-none">
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0"
              required
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface border border-border text-foreground placeholder:text-foreground-subtle text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
            />
          </div>
        </div>

        {/* ── Category ── */}
        <div>
          <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block mb-2">
            {t("add_category")}
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150",
                  category === cat
                    ? type === "receita"
                      ? "bg-income/20 border-income/60 text-income"
                      : "bg-expense/20 border-expense/60 text-expense"
                    : "bg-surface-raised border-border text-muted-custom hover:border-border hover:text-foreground"
                )}
              >
                {tCategory(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Payment Method (expenses only) ── */}
        {type === "despesa" && (
          <div>
            <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block mb-2">
              {t("add_payment_method")}
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setPaymentMethod(m.id); setCreditCardId(""); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150",
                    paymentMethod === m.id
                      ? "bg-primary/20 border-primary/60 text-primary"
                      : "bg-surface-raised border-border text-muted-custom hover:text-foreground"
                  )}
                >
                  {m.icon}
                  {t(m.labelKey)}
                </button>
              ))}
            </div>

            {/* Card selector */}
            {paymentMethod === "crédito" && creditCards.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block">
                  {t("add_which_card")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {creditCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCreditCardId(card.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                        creditCardId === card.id
                          ? "bg-primary/20 border-primary/60 text-primary"
                          : "bg-surface-raised border-border text-muted-custom hover:text-foreground"
                      )}
                    >
                      <CreditCard className="w-3 h-3" />
                      {card.name}
                    </button>
                  ))}
                </div>
                {paymentMethod === "crédito" && !creditCardId && (
                  <p className="text-[11px] text-warning mt-1">{t("add_select_card")}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Description ── */}
        <div>
          <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block mb-2">
            {t("add_description")} <span className="text-foreground-subtle normal-case font-normal">({t("optional")})</span>
          </label>
          <input
            type="text"
            placeholder={t("add_description_ph")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
          />
        </div>

        {/* ── Date ── */}
        <div>
          <label className="text-xs font-semibold text-muted-custom uppercase tracking-widest block mb-2">
            {t("add_date")}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!isValid}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg disabled:cursor-not-allowed disabled:opacity-40",
            type === "receita"
              ? "bg-income text-on-accent hover:opacity-90"
              : "bg-expense text-on-accent hover:opacity-90"
          )}
        >
          <Plus className="w-4 h-4" />
          {type === "receita" ? t("add_income_btn") : t("add_expense_btn")}
        </button>
      </form>

      <p className="text-[11px] text-foreground-subtle text-center">{t("add_local_storage_note")}</p>
    </div>
  );
}
