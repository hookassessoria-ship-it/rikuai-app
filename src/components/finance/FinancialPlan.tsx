import { Bill, Settings, Transaction } from "@/types/finance";
import { AlertTriangle, Calculator, CalendarDays, PiggyBank, TrendingUp, Sparkles, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { useT } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { DreamsTab } from "./DreamsTab";
import { useDreams } from "@/hooks/useDreams";
import { sfx } from "@/lib/sfx";

interface Props {
  planRule: {
    necessitiesIdeal: number; lifestyleIdeal: number; futureIdeal: number;
    necessitiesActual: number; lifestyleActual: number; futureActual: number;
  };
  totalIncome:        number;
  expectedIncome:     number;
  emergencyGoal:      number;
  emergencyProgress:  number;
  emergencyReserveSaved: number;
  fixedCostsMonth:    number;
  recurringFixedBase: number;
  emergencyAutoGoal:  number;
  emergencyMonthsGoal:number;
  emergencyCustomGoal: number | null | undefined;
  investedThisMonth:  number;
  dividasAtrasadas:   Bill[];
  onUpdateSettings:   (p: Partial<Settings>) => void;
  onUpdateBill:       (id: string, p: Partial<Bill>) => void;
  /** Debita o saldo quando o usuário aporta em um sonho. */
  onDreamSpend?:      (amount: number, dreamTitle: string) => void;
}

type SubTab = "plan" | "dreams" | "goals" | "calendar" | "simulators";

export function FinancialPlan({
  planRule, totalIncome, expectedIncome, emergencyGoal, emergencyProgress,
  emergencyReserveSaved, fixedCostsMonth, recurringFixedBase, emergencyAutoGoal,
  emergencyMonthsGoal, emergencyCustomGoal,
  investedThisMonth, dividasAtrasadas,
  onUpdateSettings, onUpdateBill, onDreamSpend,
}: Props) {
  const t = useT();
  const [sub, setSub] = useState<SubTab>("plan");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(emergencyCustomGoal ?? ""));
  const [monthsInput, setMonthsInput] = useState(String(emergencyMonthsGoal));

  // Dados de sonhos usados no calendário financeiro (prazos).
  const { dreams } = useDreams();

  // Simulador
  const [monthlyDeposit, setMonthlyDeposit] = useState("500");
  const [months, setMonths] = useState("12");
  const dep = parseFloat(monthlyDeposit) || 0;
  const mn  = parseInt(months) || 0;
  const rate = 0.01;
  const simData: { mes: number; total: number }[] = [];
  let total = 0;
  for (let i = 1; i <= mn; i++) { total = (total + dep) * (1 + rate); simData.push({ mes: i, total: Math.round(total) }); }
  const finalAmount = simData[simData.length - 1]?.total ?? 0;

  const incomeRef = totalIncome > 0 ? totalIncome : expectedIncome;
  const monthsToReserve = dep > 0 ? Math.ceil((emergencyGoal - emergencyReserveSaved) / dep) : 0;

  const segments: { key: SubTab; label: string; icon: JSX.Element }[] = [
    { key: "plan", label: t("plan_sub_plan"), icon: <Calculator className="w-3.5 h-3.5" /> },
    { key: "dreams", label: t("plan_sub_dreams"), icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: "goals", label: t("plan_reserve_title"), icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { key: "calendar", label: t("plan_sub_calendar"), icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { key: "simulators", label: t("plan_simulator_title"), icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  // Calendário financeiro: contas em atraso + prazos de sonhos, únicas fontes já disponíveis aqui.
  const calendarItems = useMemo(() => {
    const items: { id: string; date: string; title: string; kind: "bill" | "dream"; amount?: number }[] = [];
    for (const b of dividasAtrasadas) {
      items.push({ id: `bill-${b.id}`, date: b.dueDate, title: b.name, kind: "bill", amount: b.amount });
    }
    for (const d of dreams) {
      if (d.target_date) items.push({ id: `dream-${d.id}`, date: d.target_date, title: d.title, kind: "dream" });
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [dividasAtrasadas, dreams]);

  return (
    <div className="space-y-5 animate-slide-up pb-4">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-foreground">{t("plan_title")}</h2>
        <p className="text-xs text-muted-custom mt-0.5">{t("plan_subtitle")}</p>
      </div>

      {/* Sub-navegação estilo pílulas (iOS): tudo de planejamento em um só lugar */}
      <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-1 p-1 rounded-2xl bg-surface/70 border border-border/60 w-max min-w-full">
          {segments.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { sfx("tap"); setSub(key); }}
              aria-pressed={sub === key}
              className={`press flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                sub === key ? "bg-primary text-on-accent shadow-glow-purple scale-[1.02]" : "text-muted-custom hover:text-foreground"
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {sub === "dreams" && <DreamsTab onSpend={onDreamSpend} />}

      {sub === "plan" && (
        <div className="space-y-4">
          {/* 50/30/20 */}
          <div className="rounded-3xl p-5 gradient-card border border-border/60 shadow-card transition-transform">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-primary" />
              <p className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("plan_rule_title")}</p>
            </div>
            {incomeRef === 0 ? (
              <p className="text-xs text-muted-custom">{t("plan_rule_empty")}</p>
            ) : (
              <>
                <RuleBar label={t("plan_rule_necessities")} ideal={planRule.necessitiesIdeal} actual={planRule.necessitiesActual} color="hsl(var(--primary))" />
                <RuleBar label={t("plan_rule_lifestyle")} ideal={planRule.lifestyleIdeal} actual={planRule.lifestyleActual} color="hsl(var(--warning))" />
                <RuleBar label={t("plan_rule_future")} ideal={planRule.futureIdeal} actual={planRule.futureActual} color="hsl(var(--income))" />
                <p className="text-[10px] text-muted-custom mt-2">
                  {t("plan_rule_base", { amount: formatMoney(incomeRef), source: totalIncome > 0 ? t("plan_rule_base_current") : t("plan_rule_base_expected") })}
                </p>
              </>
            )}
          </div>

          {/* Investido este mês (categoria Investimento) */}
          <div className="rounded-3xl p-5 border border-warning/30 bg-warning/5 flex items-center justify-between shadow-card">
            <div>
              <p className="text-[11px] font-bold text-muted-custom uppercase tracking-widest">{t("plan_invested_title")}</p>
              <p className="text-[10px] text-muted-custom mt-0.5">{t("plan_invested_hint")}</p>
            </div>
            <p className="text-2xl font-black text-warning">{formatMoney(investedThisMonth)}</p>
          </div>

          {/* Dívidas em atraso */}
          {dividasAtrasadas.length > 0 && (
            <OverdueDebts dividasAtrasadas={dividasAtrasadas} onUpdateBill={onUpdateBill} t={t} />
          )}
        </div>
      )}

      {sub === "goals" && (
        <div className="space-y-4">
          {/* Reserva de Emergência — somente leitura, derivada das transações da categoria dedicada */}
          <div className="rounded-3xl p-5 gradient-card border border-border/60 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-income" />
                <p className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("plan_reserve_title")}</p>
              </div>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-2xl font-black text-income">{formatMoney(emergencyReserveSaved)}</p>
              <p className="text-xs text-muted-custom">{t("plan_reserve_goal", { amount: formatMoney(emergencyGoal) })}</p>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-overlay overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${emergencyProgress}%`, background: "linear-gradient(90deg, hsl(var(--income)), hsl(142 70% 60%))" }} />
            </div>
            <p className="text-[11px] text-muted-custom mt-2">{t("plan_reserve_via_tx")}</p>
            {/* Meta editável (apenas o alvo, não é um lançamento/alocação) */}
            <div className="mt-3 space-y-2 rounded-2xl bg-surface-overlay/60 border border-border/40 p-3.5">
              {editingGoal ? (
                <>
                  <label className="text-[10px] uppercase font-bold text-muted-custom">{t("plan_reserve_months_label")}</label>
                  <input
                    type="number" min={1} max={24} value={monthsInput}
                    onChange={(e) => setMonthsInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm"
                  />
                  <label className="text-[10px] uppercase font-bold text-muted-custom">{t("plan_reserve_goal_optional_label")}</label>
                  <input
                    type="number" placeholder={t("plan_reserve_goal_ph")} value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        const m = Math.max(1, Math.min(24, parseInt(monthsInput) || 6));
                        const g = parseFloat(goalInput.replace(",", "."));
                        onUpdateSettings({
                          emergencyMonthsGoal: m,
                          emergencyCustomGoal: goalInput.trim() && !isNaN(g) && g > 0 ? g : null,
                        });
                        setEditingGoal(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold">{t("plan_save_goal")}</button>
                    <button onClick={() => setEditingGoal(false)}
                      className="flex-1 py-2 rounded-lg border border-border text-muted-custom text-xs font-bold">{t("plan_cancel")}</button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted-custom">
                      {emergencyCustomGoal
                        ? t("plan_reserve_custom_goal")
                        : t("plan_reserve_auto_goal", { months: String(emergencyMonthsGoal), amount: formatMoney(recurringFixedBase) })}
                    </p>
                    <p className="text-[10px] text-foreground-subtle mt-0.5">
                      {t("plan_reserve_auto_calc", { amount: formatMoney(emergencyAutoGoal) })}
                      {dep > 0 && monthsToReserve > 0 && t("plan_reserve_saving_pace", { amount: formatMoney(dep), months: String(monthsToReserve) })}
                    </p>
                  </div>
                  <button onClick={() => {
                    setMonthsInput(String(emergencyMonthsGoal));
                    setGoalInput(String(emergencyCustomGoal ?? ""));
                    setEditingGoal(true);
                  }}
                    className="shrink-0 text-[11px] font-bold text-primary hover:underline">{t("plan_edit")}</button>
                </div>
              )}
            </div>
          </div>

          {dividasAtrasadas.length > 0 && (
            <OverdueDebts dividasAtrasadas={dividasAtrasadas} onUpdateBill={onUpdateBill} t={t} />
          )}
        </div>
      )}

      {sub === "calendar" && (
        <div className="rounded-3xl p-5 gradient-card border border-border/60 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("plan_calendar_title")}</p>
          </div>
          {calendarItems.length === 0 ? (
            <p className="text-xs text-muted-custom">{t("plan_calendar_empty")}</p>
          ) : (
            <div className="space-y-2">
              {calendarItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-overlay/60 border border-border/40 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-custom">{formatDate(item.date)}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${
                    item.kind === "bill" ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary"
                  }`}>
                    {item.kind === "bill" ? formatMoney(item.amount ?? 0) : "🎯"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {sub === "simulators" && (
        <div className="rounded-3xl p-5 gradient-card border border-border/60 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-warning" />
            <p className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("plan_simulator_title")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-muted-custom uppercase font-bold">{t("plan_deposit_label")}</label>
              <input type="number" value={monthlyDeposit} onChange={(e) => setMonthlyDeposit(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-raised border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted-custom uppercase font-bold">{t("plan_term_label")}</label>
              <input type="number" value={months} onChange={(e) => setMonths(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-surface-raised border border-border text-foreground text-sm" />
            </div>
          </div>
          <div className="rounded-2xl p-3.5 bg-surface-overlay mb-3">
            <p className="text-[10px] text-muted-custom uppercase font-bold">{t("plan_after_months", { months: String(mn) })}</p>
            <p className="text-2xl font-black text-warning">{formatMoney(finalAmount)}</p>
            <p className="text-[10px] text-muted-custom">{t("plan_deposited", { deposited: formatMoney(dep * mn), yield: formatMoney(finalAmount - dep * mn) })}</p>
          </div>
          {simData.length > 0 && (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simData}>
                  <XAxis dataKey="mes" stroke="hsl(var(--foreground-muted))" fontSize={10} />
                  <YAxis stroke="hsl(var(--foreground-muted))" fontSize={10} width={50} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v: number) => formatMoney(v)} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverdueDebts({ dividasAtrasadas, onUpdateBill, t }: {
  dividasAtrasadas: Bill[];
  onUpdateBill: (id: string, p: Partial<Bill>) => void;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="rounded-3xl p-5 border border-danger/30 bg-danger/5 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-danger" />
        <p className="text-xs font-bold text-danger uppercase tracking-widest">{t("plan_overdue_title")}</p>
      </div>
      <div className="space-y-2">
        {dividasAtrasadas.map((d) => {
          const due = new Date(d.dueDate + "T00:00:00");
          const days = Math.floor((Date.now() - due.getTime()) / 86400000);
          const months = days / 30;
          const interest = d.interestRate ? d.amount * (Math.pow(1 + d.interestRate / 100, months) - 1) : 0;
          return (
            <div key={d.id} className="rounded-2xl p-3.5 bg-surface border border-danger/15">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-foreground">{d.name}</p>
                <p className="text-sm font-bold text-danger">{formatMoney(d.amount)}</p>
              </div>
              <p className="text-[11px] text-muted-custom">
                {t("plan_overdue_days", { days: String(days), amount: formatMoney(interest) })}
              </p>
              <input type="text" placeholder={t("plan_negotiation_ph")}
                defaultValue={d.negotiation ?? ""}
                onBlur={(e) => onUpdateBill(d.id, { negotiation: e.target.value })}
                className="w-full mt-2 px-2 py-1.5 rounded-lg bg-surface-overlay text-xs text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleBar({ label, ideal, actual, color }: { label: string; ideal: number; actual: number; color: string }) {
  const pct = ideal > 0 ? Math.min((actual / ideal) * 100, 150) : 0;
  const over = actual > ideal;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-foreground font-semibold">{label}</span>
        <span className={over ? "text-danger font-bold" : "text-muted-custom"}>
          {formatMoney(actual)} / {formatMoney(ideal)}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface-overlay overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, background: over ? "hsl(var(--danger))" : color }} />
      </div>
    </div>
  );
}
