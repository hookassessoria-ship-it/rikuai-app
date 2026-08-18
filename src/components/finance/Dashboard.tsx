import {
  Wallet, AlertCircle, Target, CalendarDays, Pencil, Calendar,
  CreditCard, Award, Info, X,
} from "lucide-react";
import { useState } from "react";
import { Bill } from "@/types/finance";
import { useT } from "@/lib/i18n";
import { formatMoney, formatDate, getCurrency } from "@/lib/format";

/** Compat: telas antigas importam formatBRL daqui. Agora respeita a moeda escolhida. */
export function formatBRL(amount: number) {
  return formatMoney(amount);
}

interface DashboardProps {
  balance:              number;
  realAvailable:        number;
  projectedBalance7d:   number;
  initialBalance:       number;
  totalIncome:          number;
  totalExpenses:        number;
  netResult:            number;
  totalDebtsMonth:      number;
  amountRemainingToPay: number;
  dailyGoal:            number;
  debtCoveragePercent:  number;
  isOK:                 boolean;
  remainingDays:        number;
  today:                number;
  lastDayOfMonth:       number;
  overdueAmount:        number;
  overdueCount:         number;
  dueTodayAmount:       number;
  dueTodayCount:        number;
  dueIn7DaysAmount:     number;
  dueThisWeek:          Bill[];
  totalCardInvoices:    number;
  totalCardLimit:       number;
  creditCards:          Bill[];
  healthScore:          { score: number; grade: string };
  onUpdateInitialBalance: (v: number) => void;
}

const gradeColor = (grade: string) => ({
  A: "hsl(var(--income))",
  B: "hsl(142 70% 55%)",
  C: "hsl(var(--warning))",
  D: "hsl(28 92% 55%)",
  E: "hsl(14 90% 58%)",
  F: "hsl(var(--danger))",
}[grade] ?? "hsl(var(--warning))");

export function Dashboard(p: DashboardProps) {
  const t = useT();
  const [editingBalance, setEditingBalance] = useState(false);
  const [showProjected, setShowProjected] = useState(false);
  const [balanceInput,   setBalanceInput]   = useState(String(p.initialBalance));
  const monthProgress = Math.round((p.today / p.lastDayOfMonth) * 100);

  const handleBalanceSave = () => {
    const v = parseFloat(balanceInput.replace(",", "."));
    if (!isNaN(v)) p.onUpdateInitialBalance(v);
    setEditingBalance(false);
  };

  const cardUsedPct = p.totalCardLimit > 0 ? (p.totalCardInvoices / p.totalCardLimit) * 100 : 0;

  return (
    <div className="space-y-4 animate-slide-up">

      {/* HERO */}
      <div className="rounded-3xl p-6 relative overflow-hidden border"
        style={{
          background: p.isOK
            ? "linear-gradient(145deg, hsl(264 80% 15%), hsl(252 20% 8%))"
            : "linear-gradient(145deg, hsl(4 86% 14%), hsl(252 20% 8%))",
          borderColor: p.isOK ? "hsl(264 80% 35% / 0.5)" : "hsl(4 86% 40% / 0.4)",
          boxShadow: p.isOK
            ? "0 0 40px hsl(264 80% 62% / 0.15)"
            : "0 0 40px hsl(4 86% 60% / 0.15)",
        }}>
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: p.isOK ? "hsl(264 80% 62%)" : "hsl(4 86% 60%)" }} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-muted-custom uppercase tracking-widest mb-1">
                {t("dash_real_balance")}
              </p>
              <p className="text-4xl font-black tracking-tight leading-none"
                style={{ color: p.realAvailable >= 0 ? "hsl(var(--income))" : "hsl(var(--danger))" }}>
                {formatMoney(p.realAvailable)}
              </p>
              <p className="text-[11px] text-muted-custom mt-1.5">
                {t("dash_current_balance")}: {formatMoney(p.balance)} ·{" "}
                <button
                  onClick={() => setShowProjected(true)}
                  className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:text-foreground transition-colors">
                  {t("dash_projected_7d")}:{" "}
                  <span style={{ color: p.projectedBalance7d >= 0 ? "hsl(var(--income))" : "hsl(var(--danger))" }}>
                    {formatMoney(p.projectedBalance7d)}
                  </span>
                  <Info className="w-3 h-3 opacity-60" />
                </button>
              </p>

              <div className="flex items-center gap-2 mt-2">
                {editingBalance ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-custom">{t("dash_initial")}: {getCurrency()}</span>
                    <input autoFocus type="number" value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      onBlur={handleBalanceSave}
                      onKeyDown={(e) => e.key === "Enter" && handleBalanceSave()}
                      className="w-24 bg-surface-overlay border border-primary/40 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/60" />
                  </div>
                ) : (
                  <button onClick={() => { setBalanceInput(String(p.initialBalance)); setEditingBalance(true); }}
                    className="flex items-center gap-1 text-[11px] text-muted-custom hover:text-foreground">
                    {t("dash_initial_balance")}: {formatMoney(p.initialBalance)} <Pencil className="w-3 h-3 opacity-50" />
                  </button>
                )}
              </div>
            </div>

            {/* Health grade */}
            <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl border"
              style={{
                background: `${gradeColor(p.healthScore.grade)}22`,
                borderColor: `${gradeColor(p.healthScore.grade)}66`,
              }}>
              <Award className="w-3.5 h-3.5" style={{ color: gradeColor(p.healthScore.grade) }} />
              <span className="text-2xl font-black leading-none" style={{ color: gradeColor(p.healthScore.grade) }}>
                {p.healthScore.grade}
              </span>
              <span className="text-[9px] font-bold text-muted-custom uppercase">{t("dash_health")}</span>
            </div>
          </div>

          {/* Month progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-custom flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {t("dash_month")}
              </span>
              <span className="text-[11px] text-muted-custom">
                {t("dash_day_of", { day: p.today, total: p.lastDayOfMonth })}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${monthProgress}%`,
                  background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary-glow)))",
                }} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeframe cards */}
      <div className="grid grid-cols-2 gap-3">
        <TimeframeCard
          label={t("dash_overdue_today")}
          amount={p.overdueAmount + p.dueTodayAmount}
          count={p.overdueCount + p.dueTodayCount}
          danger
          icon={<AlertCircle className="w-3.5 h-3.5" />}
        />
        <TimeframeCard
          label={t("dash_due_week")}
          amount={p.dueIn7DaysAmount}
          warning
          icon={<Calendar className="w-3.5 h-3.5" />}
        />
        <TimeframeCard
          label={t("dash_due_month")}
          amount={p.totalDebtsMonth}
          icon={<Wallet className="w-3.5 h-3.5" />}
        />
        <TimeframeCard
          label={t("dash_credit_card")}
          amount={p.totalCardInvoices}
          subtext={p.totalCardLimit > 0
            ? t("dash_of_limit", { pct: cardUsedPct.toFixed(0), total: formatMoney(p.totalCardLimit) })
            : undefined}
          icon={<CreditCard className="w-3.5 h-3.5" />}
        />
      </div>

      {/* Resumo mensal */}
      <div className="rounded-2xl p-4 gradient-card shadow-card border border-border/60">
        <p className="text-xs font-bold text-muted-custom uppercase tracking-widest mb-3">{t("dash_month_summary")}</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[10px] text-muted-custom uppercase font-semibold mb-1">{t("dash_income")}</p>
            <p className="text-base font-black text-income leading-tight">{formatMoney(p.totalIncome)}</p>
          </div>
          <div className="text-center border-x border-border/40">
            <p className="text-[10px] text-muted-custom uppercase font-semibold mb-1">{t("dash_spent")}</p>
            <p className="text-base font-black text-expense leading-tight">{formatMoney(p.totalExpenses)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-custom uppercase font-semibold mb-1">{t("dash_result")}</p>
            <p className="text-base font-black leading-tight"
              style={{ color: p.netResult >= 0 ? "hsl(var(--income))" : "hsl(var(--danger))" }}>
              {p.netResult >= 0 ? "+" : ""}{formatMoney(p.netResult)}
            </p>
          </div>
        </div>
      </div>

      {/* Meta do mês */}
      <div className="rounded-2xl p-5 shadow-card border relative overflow-hidden"
        style={{
          background: p.dailyGoal > 0
            ? "linear-gradient(145deg, hsl(38 92% 55% / 0.14), hsl(252 20% 8%))"
            : "linear-gradient(145deg, hsl(142 70% 48% / 0.12), hsl(252 20% 8%))",
          borderColor: p.dailyGoal > 0 ? "hsl(38 92% 55% / 0.35)" : "hsl(142 70% 48% / 0.25)",
        }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("dash_month_goal")}</span>
          <Target className="w-4 h-4 text-muted-custom" />
        </div>
        {p.dailyGoal > 0 ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-black text-warning">{formatMoney(p.dailyGoal)}</p>
              <p className="text-[10px] text-muted-custom mt-1 uppercase font-semibold">{t("dash_per_day")}</p>
            </div>
            <div className="border-x border-border/40">
              <p className="text-xl font-black text-foreground">{p.remainingDays}</p>
              <p className="text-[10px] text-muted-custom mt-1 uppercase font-semibold">{t("dash_days_left")}</p>
            </div>
            <div>
              <p className="text-xl font-black text-danger">{formatMoney(p.amountRemainingToPay)}</p>
              <p className="text-[10px] text-muted-custom mt-1 uppercase font-semibold">{t("dash_to_cover")}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-1">
            <p className="text-2xl font-black text-income">{t("dash_month_covered")}</p>
            <p className="text-xs text-muted-custom mt-1">{t("dash_month_covered_hint")}</p>
          </div>
        )}
      </div>

      {/* Progresso de pagamentos */}
      <div className="rounded-2xl p-4 gradient-card shadow-card border border-border/60">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("dash_month_payments")}</span>
          <span className="text-sm font-black"
            style={{ color: p.debtCoveragePercent >= 80 ? "hsl(var(--income))" : p.debtCoveragePercent >= 40 ? "hsl(var(--warning))" : "hsl(var(--danger))" }}>
            {p.debtCoveragePercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden bg-surface-overlay">
          <div className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${p.debtCoveragePercent}%`,
              background: p.debtCoveragePercent >= 80
                ? "linear-gradient(90deg, hsl(142 70% 48%), hsl(142 70% 60%))"
                : p.debtCoveragePercent >= 40
                ? "linear-gradient(90deg, hsl(38 92% 55%), hsl(38 92% 65%))"
                : "linear-gradient(90deg, hsl(4 86% 60%), hsl(38 92% 55%))",
            }} />
        </div>
      </div>

      {/* Modal projeção */}
      {showProjected && (
        <div
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowProjected(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-surface p-5 shadow-card animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-black text-foreground">{t("dash_projected_7d")}</h3>
                <p className="text-[11px] text-muted-custom mt-0.5">{t("dash_projected_how")}</p>
              </div>
              <button onClick={() => setShowProjected(false)} className="p-1.5 rounded-lg hover:bg-surface-overlay">
                <X className="w-4 h-4 text-muted-custom" />
              </button>
            </div>

            <div className="rounded-xl bg-surface-overlay border border-border/60 p-3 text-xs text-foreground space-y-1.5 mb-4">
              <div className="flex justify-between"><span className="text-muted-custom">{t("dash_real_balance")}</span><span className="font-bold">{formatMoney(p.realAvailable)}</span></div>
              <div className="flex justify-between"><span className="text-muted-custom">{t("dash_minus_due_7d")}</span><span className="font-bold text-danger">−{formatMoney(p.dueIn7DaysAmount)}</span></div>
              <div className="h-px bg-border/60 my-1" />
              <div className="flex justify-between text-sm"><span className="font-bold">{t("dash_projected_7d")}</span>
                <span className="font-black" style={{ color: p.projectedBalance7d >= 0 ? "hsl(var(--income))" : "hsl(var(--danger))" }}>{formatMoney(p.projectedBalance7d)}</span>
              </div>
            </div>

            <p className="text-[11px] font-bold text-muted-custom uppercase tracking-widest mb-2">
              {t("dash_included_bills", { count: p.dueThisWeek.length })}
            </p>
            {p.dueThisWeek.length === 0 ? (
              <p className="text-xs text-muted-custom py-3 text-center">{t("dash_no_bills_7d")}</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {p.dueThisWeek
                  .slice()
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-surface-overlay">
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground font-semibold truncate">{b.name}</p>
                        <p className="text-[10px] text-muted-custom">{formatDate(b.dueDate)} · {b.category}</p>
                      </div>
                      <span className="text-danger font-black ml-2">{formatMoney(b.amount)}</span>
                    </div>
                  ))}
              </div>
            )}

            <p className="text-[10px] text-muted-custom mt-4 leading-snug">{t("dash_projected_note")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TimeframeCard({ label, amount, count, subtext, danger, warning, icon }: {
  label: string; amount: number; count?: number; subtext?: string; danger?: boolean; warning?: boolean; icon: React.ReactNode;
}) {
  const t = useT();
  const color = danger ? "hsl(var(--danger))" : warning ? "hsl(var(--warning))" : "hsl(var(--foreground))";
  const bg    = danger ? "hsl(4 86% 60% / 0.10)" : warning ? "hsl(38 92% 55% / 0.10)" : undefined;
  const border= danger ? "hsl(4 86% 60% / 0.3)" : warning ? "hsl(38 92% 55% / 0.25)" : "hsl(var(--border))";
  return (
    <div className="rounded-2xl p-3.5 shadow-card border"
      style={{ background: bg ?? "var(--gradient-card)", borderColor: border }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] font-bold text-muted-custom uppercase tracking-widest leading-tight">{label}</span>
      </div>
      <p className="text-lg font-black leading-tight" style={{ color: amount > 0 ? color : "hsl(var(--foreground-muted))" }}>
        {formatMoney(amount)}
      </p>
      <p className="text-[10px] text-muted-custom mt-1">
        {subtext ?? (count !== undefined ? t("dash_bills_count", { count }) : "")}
      </p>
    </div>
  );
}
