import { useState } from "react";
import {
  Plus, Trash2, Check, Calendar, ChevronDown, CreditCard, Filter, AlertCircle, RotateCcw,
} from "lucide-react";
import { Bill, BillType } from "@/types/finance";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { formatMoney, formatDate, getCurrency } from "@/lib/format";

/** Compat: mantém o nome antigo, agora respeitando a moeda escolhida. */
export function formatBRL(amount: number) {
  return formatMoney(amount);
}

type FilterKey = "todas" | "atrasadas" | "hoje" | "semana" | "mes" | "futuras" | "cartoes";

const FILTERS: { id: FilterKey; key: string }[] = [
  { id: "todas",     key: "bills_filter_all" },
  { id: "atrasadas", key: "bills_filter_overdue" },
  { id: "hoje",      key: "bills_filter_today" },
  { id: "semana",    key: "bills_filter_week" },
  { id: "mes",       key: "bills_filter_month" },
  { id: "futuras",   key: "bills_filter_future" },
  { id: "cartoes",   key: "bills_filter_cards" },
];

const BILL_TYPES: { id: BillType; key: string }[] = [
  { id: "fixa",     key: "fixa" },
  { id: "variavel", key: "variavel" },
  { id: "divida",   key: "divida" },
  { id: "cartao",   key: "cartao" },
];

interface BillsListProps {
  bills:        Bill[];
  onAdd:        (b: Omit<Bill, "id" | "paid">) => void;
  onTogglePaid: (id: string) => void;
  onDelete:     (id: string) => void;
  onUpdate:     (id: string, patch: Partial<Bill>) => void;
}

export function BillsList({ bills, onAdd, onTogglePaid, onDelete, onUpdate }: BillsListProps) {
  const t = useT();
  const [showForm, setShowForm] = useState(false);
  const [filter,   setFilter]   = useState<FilterKey>("mes");

  // Form state
  const [billType, setBillType] = useState<BillType>("fixa");
  const [name,     setName]     = useState("");
  const [amount,   setAmount]   = useState("");
  const [dueDate,  setDueDate]  = useState(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; });
  const [recurring,setRecurring]= useState(true);
  const [interestRate, setInterestRate] = useState("");
  const [cardLimit,setCardLimit]= useState("");
  const [closingDay,setClosingDay]= useState("");
  const [dueDay,   setDueDay]   = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !dueDate) return;
    onAdd({
      name,
      amount: parseFloat(amount.replace(",", ".")),
      dueDate,
      category: billType === "cartao" ? ("Cart" + "ão") : billType === "divida" ? "Pessoal" : "Moradia",
      billType,
      recurring: billType === "cartao" ? true : recurring,
      interestRate: billType === "divida" && interestRate ? parseFloat(interestRate) : undefined,
      cardLimit:    billType === "cartao" && cardLimit ? parseFloat(cardLimit) : undefined,
      closingDay:   billType === "cartao" && closingDay ? parseInt(closingDay) : undefined,
      dueDay:       billType === "cartao" && dueDay ? parseInt(dueDay) : undefined,
      transactions: billType === "cartao" ? [] : undefined,
    });
    setName(""); setAmount(""); setInterestRate(""); setCardLimit(""); setClosingDay(""); setDueDay("");
    setShowForm(false);
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const todayISO = today.toISOString().split("T")[0];
  const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 7);
  const isCurrentMonth = (b: Bill) => {
    const [y, m] = b.dueDate.split("-").map(Number);
    return y === today.getFullYear() && m - 1 === today.getMonth();
  };

  const filterBill = (b: Bill): boolean => {
    if (filter === "cartoes")   return b.billType === "cartao";
    if (b.billType === "cartao") return false;
    const due = new Date(b.dueDate + "T00:00:00");
    if (filter === "atrasadas") return !b.paid && due < today;
    if (filter === "hoje")      return !b.paid && b.dueDate === todayISO;
    if (filter === "semana")    return !b.paid && due >= today && due <= sevenDays;
    if (filter === "mes")       return isCurrentMonth(b);
    if (filter === "futuras")   return due > new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return true;
  };

  const filtered = bills.filter(filterBill).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const pending  = filtered.filter((b) => !b.paid || b.billType === "cartao");
  const paid     = filtered.filter((b) => b.paid && b.billType !== "cartao");
  const totalPending = pending.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{t("bills_title")}</h2>
          <p className="text-xs text-muted-custom mt-0.5">
            {t("bills_items", { count: pending.length, total: formatMoney(totalPending) })}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
            showForm ? "bg-surface-overlay text-muted-custom border border-border"
                     : "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30",
          )}>
          <Plus className="w-3.5 h-3.5" />
          {showForm ? t("cancel") : t("bills_new")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
              filter === f.id ? "bg-primary/20 border-primary/60 text-primary" : "bg-surface-raised border-border text-muted-custom",
            )}>
            {t(f.key)}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="rounded-2xl p-4 bg-surface border border-primary/25 space-y-3 animate-slide-up">
          <p className="text-xs font-bold text-primary uppercase tracking-widest">{t("bills_new_title")}</p>

          <div>
            <label className="text-[10px] font-bold text-muted-custom uppercase tracking-wide mb-1.5 block">{t("bills_type")}</label>
            <div className="grid grid-cols-2 gap-1.5">
              {BILL_TYPES.map((bt) => (
                <button key={bt.id} type="button" onClick={() => setBillType(bt.id)}
                  className={cn(
                    "text-left px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition-all",
                    billType === bt.id ? "bg-primary/15 border-primary/60 text-primary"
                                      : "bg-surface-raised border-border text-muted-custom hover:text-foreground",
                  )}>
                  <p className="font-bold">{t(`bills_type_${bt.key}`)}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">{t(`bills_type_${bt.key}_desc`)}</p>
                </button>
              ))}
            </div>
          </div>

          <input type="text" placeholder={t("bills_name_ph")} value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary/50" />

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-custom font-bold text-xs">{getCurrency()}</span>
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} step="0.01" min="0" required
              className="w-full pl-14 pr-4 py-3 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle font-bold focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="text-[10px] text-muted-custom mb-1 block">{t("bills_due")}</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-surface-raised border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          {(billType === "fixa" || billType === "divida") && (
            <label className="flex items-center gap-2 text-xs text-muted-custom">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)}
                className="w-4 h-4 accent-primary" />
              {t("bills_recurring")}
            </label>
          )}

          {billType === "divida" && (
            <input type="number" step="0.1" placeholder={t("bills_interest_ph")} value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle text-xs focus:outline-none focus:ring-2 focus:ring-primary/50" />
          )}

          {billType === "cartao" && (
            <div className="grid grid-cols-3 gap-2">
              <input type="number" placeholder={t("bills_limit_ph")} value={cardLimit} onChange={(e) => setCardLimit(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle text-xs" />
              <input type="number" min="1" max="31" placeholder={t("bills_closing_ph")} value={closingDay} onChange={(e) => setClosingDay(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle text-xs" />
              <input type="number" min="1" max="31" placeholder={t("bills_dueday_ph")} value={dueDay} onChange={(e) => setDueDay(e.target.value)}
                className="px-3 py-2.5 rounded-xl bg-surface-raised border border-border text-foreground placeholder:text-foreground-subtle text-xs" />
            </div>
          )}

          <button type="submit" disabled={!name || !amount}
            className="w-full py-3 rounded-xl bg-primary text-on-accent font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all">
            {t("bills_save")}
          </button>
        </form>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          {pending.map((bill) => (
            <BillItem key={bill.id} bill={bill} onToggle={() => onTogglePaid(bill.id)} onDelete={() => onDelete(bill.id)} onUpdate={(p) => onUpdate(bill.id, p)} />
          ))}
        </div>
      )}

      {paid.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-custom uppercase tracking-widest px-1 pt-2">
            {t("bills_paid_in_filter", { count: paid.length })}
          </p>
          {paid.map((bill) => (
            <BillItem key={bill.id} bill={bill} onToggle={() => onTogglePaid(bill.id)} onDelete={() => onDelete(bill.id)} onUpdate={(p) => onUpdate(bill.id, p)} />
          ))}
        </div>
      )}

      {filtered.length === 0 && !showForm && (
        <div className="text-center py-14 text-muted-custom">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-semibold text-foreground">{t("bills_empty_title")}</p>
          <p className="text-xs mt-1">{t("bills_empty_hint")}</p>
        </div>
      )}
    </div>
  );
}

function BillItem({ bill, onToggle, onDelete }: { bill: Bill; onToggle: () => void; onDelete: () => void; onUpdate: (p: Partial<Bill>) => void }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const today     = new Date(); today.setHours(0,0,0,0);
  const due       = new Date(bill.dueDate + "T00:00:00");
  const isOverdue = !bill.paid && due < today && bill.billType !== "cartao";
  const daysUntil = !bill.paid ? Math.ceil((due.getTime() - today.getTime()) / 86400000) : null;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3;
  const overdueDays = isOverdue ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
  const isCard    = bill.billType === "cartao";
  const cardUsedPct = isCard && bill.cardLimit ? Math.min((bill.amount / bill.cardLimit) * 100, 100) : 0;

  const typeBadge = {
    fixa:     { key: "bills_badge_fixa",     color: "text-primary",  bg: "bg-primary/15" },
    variavel: { key: "bills_badge_variavel", color: "text-foreground-muted", bg: "bg-surface-overlay" },
    divida:   { key: "bills_badge_divida",   color: "text-danger",   bg: "bg-danger/15" },
    cartao:   { key: "bills_badge_cartao",   color: "text-primary",  bg: "bg-primary/15" },
  }[bill.billType];

  return (
    <div className={cn(
      "rounded-2xl border transition-all",
      bill.paid     ? "bg-surface/40 border-border/30"
      : isOverdue   ? "bg-danger/5 border-danger/30"
      : isDueSoon   ? "bg-warning/5 border-warning/25"
                    : "bg-surface border-border/60",
    )}>
      <div className="flex items-center gap-3 p-3.5">
        {!isCard && (
          <button onClick={onToggle}
            className={cn(
              "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
              bill.paid   ? "bg-income border-income"
              : isOverdue ? "border-danger/60 hover:border-danger"
              : isDueSoon ? "border-warning/60 hover:border-warning"
                          : "border-border hover:border-primary",
            )}>
            {bill.paid && <Check className="w-3.5 h-3.5 text-on-accent" />}
          </button>
        )}
        {isCard && (
          <div className="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className={cn("text-sm font-bold", bill.paid ? "line-through text-muted-custom" : "text-foreground")}>
              {bill.name}
            </p>
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", typeBadge.color, typeBadge.bg)}>
              {t(typeBadge.key)}
            </span>
            {bill.recurring && !isCard && (
              <RotateCcw className="w-3 h-3 text-primary/70" />
            )}
            {isOverdue && (
              <span className="text-[10px] font-bold text-danger bg-danger/12 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" /> {t("bills_overdue_days", { days: overdueDays })}
              </span>
            )}
            {isDueSoon && !isOverdue && (
              <span className="text-[10px] font-bold text-warning bg-warning/12 px-1.5 py-0.5 rounded-md">
                {daysUntil === 0 ? t("bills_today_badge") : t("bills_days_badge", { days: daysUntil! })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-foreground-subtle" />
            <p className="text-xs text-foreground-subtle">
              {t("bills_due_on", { date: formatDate(bill.dueDate) })}
              {isCard && bill.closingDay ? ` · ${t("bills_closes_on", { day: bill.closingDay })}` : ""}
            </p>
          </div>
          {isCard && bill.cardLimit && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-muted-custom mb-1">
                <span>{formatMoney(bill.amount)} / {formatMoney(bill.cardLimit)}</span>
                <span>{cardUsedPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${cardUsedPct}%`,
                    background: cardUsedPct >= 80 ? "hsl(var(--danger))" : cardUsedPct >= 60 ? "hsl(var(--warning))" : "hsl(var(--primary))",
                  }} />
              </div>
            </div>
          )}
          {bill.billType === "divida" && bill.interestRate ? (
            <p className="text-[10px] text-warning mt-1">{t("bills_interest", { rate: bill.interestRate })}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="text-right">
            <p className={cn("text-sm font-bold",
              bill.paid ? "text-income" : isOverdue ? "text-danger" : isDueSoon ? "text-warning" : "text-foreground",
            )}>
              {formatMoney(bill.amount)}
            </p>
            <p className="text-[10px] text-foreground-subtle">
              {bill.paid ? t("bills_paid") : isCard ? t("bills_invoice") : t("bills_pending")}
            </p>
          </div>
          {(isCard && (bill.transactions?.length ?? 0) > 0) && (
            <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg text-muted-custom hover:text-foreground">
              <ChevronDown className={cn("w-4 h-4 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
          {isCard && bill.amount > 0 && (
            <button onClick={onToggle}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-income/15 text-income hover:bg-income/25 transition-all">
              {t("bills_pay")}
            </button>
          )}
          <button onClick={onDelete} className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isCard && expanded && (bill.transactions?.length ?? 0) > 0 && (
        <div className="px-4 pb-3 border-t border-border/30 mt-1 pt-3 space-y-2">
          <p className="text-[10px] font-bold text-muted-custom uppercase tracking-widest mb-2">{t("bills_entries")}</p>
          {bill.transactions!.map((tx, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground">{tx.description}</span>
              <span className="font-semibold text-expense">{formatMoney(tx.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
