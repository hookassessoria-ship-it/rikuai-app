import { useState, useEffect, type ReactNode } from "react";
import { House, Plus, Receipt, BookOpen, Settings as SettingsIcon, Loader2, Users, X } from "lucide-react";

/** Mantém cada aba montada: abrir a IA (ou trocar de aba) nunca perde formulários preenchidos. */
function Pane({ active, children }: { active: boolean; children: ReactNode }) {
  return <div hidden={!active} className={active ? "animate-fade-in" : undefined}>{children}</div>;
}

import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFinance } from "@/hooks/useFinance";
import { hasLegacyLocalData } from "@/hooks/useFinance";
import { Dashboard, formatBRL } from "@/components/finance/Dashboard";
import { AddTransaction } from "@/components/finance/AddTransaction";
import { BillsList } from "@/components/finance/BillsList";
import { TransactionList } from "@/components/finance/TransactionList";
import { CategoryChart, DonutChart } from "@/components/finance/CategoryChart";
import { SpendingLineChart } from "@/components/finance/SpendingLineChart";
import { InsightCard } from "@/components/finance/InsightCard";
import { FinancialPlan } from "@/components/finance/FinancialPlan";
import { Advisor } from "@/components/finance/Advisor";
import { SettingsPanel } from "@/components/finance/SettingsPanel";
import { NotificationBell, useAlerts } from "@/components/finance/NotificationCenter";
import { WelcomeModal } from "@/components/finance/WelcomeModal";
import { MonthlyHistory } from "@/components/finance/MonthlyHistory";

import { ImportLegacyModal } from "@/components/finance/ImportLegacyModal";
import { SocialTab } from "@/components/finance/SocialTab";
import { HomeHero } from "@/components/finance/HomeHero";
import { UserAvatar } from "@/components/UserAvatar";
import mark from "@/assets/riku-mark.png.asset.json";
import { sfx } from "@/lib/sfx";
import { DREAM_CATEGORY } from "@/types/finance";

import { useT, setLanguage, getLanguage } from "@/lib/i18n";

/** Sonhos vive dentro de "Plano"; a IA vive só no botão flutuante (nunca na nav). */
type Tab = "dashboard" | "add" | "bills" | "plan" | "social";


import { useIsPremium } from "@/hooks/useIsPremium";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [activeTab, setActiveTab]   = useState<Tab>("dashboard");
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvisor, setShowAdvisor] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const navigate = useNavigate();
  const f = useFinance();
  const t = useT();
  const { subscriptionActive } = useIsPremium(f.settings.isPremium);


  const tabs = [
    { id: "dashboard" as Tab, label: t("nav_home"),     icon: House },
    { id: "bills"     as Tab, label: t("nav_accounts"), icon: Receipt },
    { id: "add"       as Tab, label: t("nav_add"),      icon: Plus },
    { id: "plan"      as Tab, label: t("nav_plan"),     icon: BookOpen },
    { id: "social"    as Tab, label: t("nav_social"),   icon: Users },
  ];

  const go = (id: Tab) => { sfx(id === "add" ? "open" : "tap"); setActiveTab(id); };

  /** Aporte em sonho = despesa real na categoria "Sonhos" (debita o saldo na hora). */
  const handleDreamSpend = (amount: number, dreamTitle: string) => {
    f.addTransaction({
      type: "despesa",
      amount,
      category: DREAM_CATEGORY,
      description: t("dream_tx_desc", { title: dreamTitle }),
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: "dinheiro",
    });
  };


  // Sincroniza a assinatura real com o flag local imediatamente (sem reload).
  useEffect(() => {
    if (subscriptionActive && !f.settings.isPremium) {
      f.updateSettings({ isPremium: true });
    }
  }, [subscriptionActive, f.settings.isPremium]);

  // Verifica onboarding + carrega preferências de formatação.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("profiles").select("onboarded, language, currency").eq("id", data.user.id).maybeSingle()
        .then(async ({ data: p }) => {
          if (!p) return;
          if (p.onboarded === false) { navigate("/onboarding", { replace: true }); return; }
          setLanguage((p.language as any) || "pt-BR", (p.currency as any) || "BRL");
        });
    });
  }, [navigate]);

  // Show import modal once when workspace is ready and legacy data exists
  useEffect(() => {
    if (!f.loading && hasLegacyLocalData()) setShowImport(true);
  }, [f.loading]);

  const alerts = useAlerts({
    bills: f.bills, balance: f.balance, dailyGoal: f.dailyGoal,
    totalIncome: f.totalIncome, remainingDays: f.remainingDays, today: f.today,
    settings: f.settings,
  });

  const now       = new Date();
  const locale    = getLanguage();
  const dayName   = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now);
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(now);
  const fullDate  = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now);
  const hour      = now.getHours();
  const greeting  = hour < 12 ? t("home_greet_morning") : hour < 18 ? t("home_greet_afternoon") : t("home_greet_evening");
  const userName  = !f.settings.userName || f.settings.userName === "Você" ? "" : f.settings.userName;

  if (f.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col max-w-md mx-auto relative">

      {showImport && (
        <ImportLegacyModal
          onImport={() => { f.importFromLocalStorage(); setShowImport(false); toast.success(t("toast_data_imported")); }}
          onDismiss={() => { f.dismissLegacy(); setShowImport(false); }}
        />
      )}
      {!f.welcomeShown && !showImport && <WelcomeModal onClose={f.markWelcomeShown} />}
      {showSettings && (
        <SettingsPanel settings={f.settings} onUpdate={f.updateSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Header — avatar grande, saudação e ações (Apple/Linear) */}
      <header className="sticky top-0 z-20 glass px-5 pt-8 pb-3 flex-shrink-0 border-b border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar size={52} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-custom truncate">{fullDate}</p>
              <h1 className="text-xl font-black text-foreground tracking-tight truncate">
                {greeting} {userName}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <NotificationBell alerts={alerts} />
            <button onClick={() => { sfx("open"); setShowSettings(true); }} aria-label={t("nav_settings")}
              className="press p-2.5 rounded-full hover:bg-surface min-h-11 min-w-11 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-36">

        <Pane active={activeTab === "dashboard"}>

            <div className="pt-4 -mx-5 sm:mx-0">
              <HomeHero
                enabled={f.settings.liveWallpaper !== false}
                subtitle={t("home_hero_sub")}
                title={t("nav_home")}
              />
            </div>

            <Dashboard
              balance={f.balance}
              realAvailable={f.realAvailable}
              projectedBalance7d={f.projectedBalance7d}
              initialBalance={f.initialBalance}
              totalIncome={f.totalIncome}
              totalExpenses={f.totalExpenses}
              netResult={f.netResult}
              totalDebtsMonth={f.totalDebtsMonth}
              amountRemainingToPay={f.amountRemainingToPay}
              dailyGoal={f.dailyGoal}
              debtCoveragePercent={f.debtCoveragePercent}
              isOK={f.isOK}
              remainingDays={f.remainingDays}
              today={f.today}
              lastDayOfMonth={f.lastDayOfMonth}
              overdueAmount={f.overdueAmount}
              overdueCount={f.overdueBills.length}
              dueTodayAmount={f.dueTodayAmount}
              dueTodayCount={f.dueTodayBills.length}
              dueIn7DaysAmount={f.dueIn7DaysAmount}
              dueThisWeek={f.dueThisWeek}
              totalCardInvoices={f.totalCardInvoices}
              totalCardLimit={f.totalCardLimit}
              creditCards={f.creditCards}
              healthScore={f.healthScore}
              onUpdateInitialBalance={f.updateInitialBalance}
            />

            <div className="mt-4">
              <InsightCard
                topCategory={f.topCategory}
                isBesteirasHigh={f.isBesteirasHigh}
                besteirasAmount={f.besteirasAmount}
                netResult={f.netResult}
                totalExpenses={f.totalExpenses}
              />
            </div>

            <div className="mt-4 rounded-2xl p-4 shadow-card border border-border/60 gradient-card">
              <p className="text-xs font-bold text-muted-custom uppercase tracking-widest mb-3">{t("dash_chart_daily")}</p>
              <SpendingLineChart data={f.spendingByDay} />
            </div>

            <div className="mt-4 rounded-2xl p-4 shadow-card border border-border/60 gradient-card">
              <p className="text-xs font-bold text-muted-custom uppercase tracking-widest mb-3">{t("dash_chart_where")}</p>
              <CategoryChart data={f.expenseChartData} />
            </div>

            <div className="mt-4 rounded-2xl p-4 shadow-card border border-border/60 gradient-card">
              <p className="text-xs font-bold text-muted-custom uppercase tracking-widest mb-3">{t("dash_chart_from")}</p>
              <DonutChart data={f.incomeChartData} type="income" title={t("dash_total_income")} emptyText={t("dash_no_income")} />
            </div>

            <div className="mt-4">
              <MonthlyHistory data={f.monthlyHistory} />
            </div>

            <TransactionList transactions={f.transactions} onDelete={f.deleteTransaction} />
          </Pane>



        <Pane active={activeTab === "add"}>
          <AddTransaction
            creditCards={f.creditCards}
            customIncomeCategories={f.settings.customIncomeCategories}
            customExpenseCategories={f.settings.customExpenseCategories}
            onAdd={(tx) => {
              f.addTransaction(tx);
              const newBal = f.balance + (tx.type === "receita" ? tx.amount : -tx.amount);
              toast.success(t(tx.type === "receita" ? "toast_income_added" : "toast_expense_added"), {
                description: t("toast_new_balance", { amount: formatBRL(newBal) }),
              });
              setActiveTab("dashboard");
            }}
          />
        </Pane>


        <Pane active={activeTab === "bills"}>
          <BillsList
            bills={f.bills}
            onAdd={f.addBill}
            onTogglePaid={(id) => {
              const b = f.bills.find((x) => x.id === id);
              f.toggleBillPaid(id);
              if (b && !b.paid) {
                toast.success(t("toast_bill_paid", { name: b.name }), {
                  description: t("toast_bill_paid_desc", { amount: formatBRL(b.amount) }),
                });
              }
            }}
            onDelete={f.deleteBill}
            onUpdate={f.updateBill}
          />
        </Pane>


        <Pane active={activeTab === "plan"}>
          <FinancialPlan
            planRule={f.planRule}
            totalIncome={f.totalIncome}
            expectedIncome={f.settings.expectedIncome}
            emergencyGoal={f.emergencyGoal}
            emergencyProgress={f.emergencyProgress}
            emergencyReserveSaved={f.emergencyReserveSaved}
            fixedCostsMonth={f.fixedCostsMonth}
            recurringFixedBase={f.recurringFixedBase}
            emergencyAutoGoal={f.emergencyAutoGoal}
            emergencyMonthsGoal={f.settings.emergencyMonthsGoal ?? 6}
            emergencyCustomGoal={f.settings.emergencyCustomGoal ?? null}
            investedThisMonth={f.investedThisMonth}
            dividasAtrasadas={f.dividasAtrasadas}
            onUpdateSettings={f.updateSettings}
            onUpdateBill={f.updateBill}
            onDreamSpend={handleDreamSpend}
          />
        </Pane>


        <Pane active={activeTab === "social"}><SocialTab /></Pane>
      </main>

      {/* IA como camada por cima do app: nunca desmonta a tela/formulário atual */}
      {showAdvisor && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background/95 backdrop-blur-xl animate-slide-up">
          <div className="mx-auto w-full max-w-md flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-border/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-full gradient-brand shadow-brand flex items-center justify-center">
                <img src={mark.url} alt="" aria-hidden className="w-5 h-5" />
              </span>
              <h2 className="text-base font-black text-foreground truncate">{t("nav_advisor")}</h2>
            </div>
            <button onClick={() => { sfx("tap"); setShowAdvisor(false); }} aria-label={t("close")}
              className="press p-2.5 rounded-full hover:bg-surface min-h-11 min-w-11 flex items-center justify-center">
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mx-auto w-full max-w-md px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Advisor
              messages={f.advisorMessages}
              setMessages={f.setAdvisorMessages}
              onClear={f.clearAdvisor}
              buildContext={f.buildAdvisorContext}
              personality={f.settings.aiPersonality}
            />
          </div>
        </div>
      )}

      {/* Botão flutuante da IA (Saturno RikuAI) */}
      {!showAdvisor && (
        <button
          onClick={() => { sfx("ai"); setShowAdvisor(true); }}
          aria-label={t("nav_advisor")}
          className="press fixed z-30 right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:right-[calc(50%-14rem)] w-14 h-14 rounded-full gradient-brand shadow-brand flex items-center justify-center ring-1 ring-primary-foreground/25 hover:scale-105"
        >
          <span aria-hidden className="absolute inset-0 rounded-full gradient-brand blur-lg opacity-60" />
          <img src={mark.url} alt="" aria-hidden className="relative w-8 h-8 drop-shadow" />
        </button>
      )}


      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-2">
        <div className="glass rounded-[26px] border border-border/60 flex items-center p-1.5 shadow-card">
          {tabs.map((tab) => {
            const Icon     = tab.icon;
            const isActive = activeTab === tab.id;
            const isAdd    = tab.id === "add";
            return (
              <button key={tab.id} onClick={() => go(tab.id)} aria-label={tab.label} aria-current={isActive ? "page" : undefined}
                className={cn(
                  "press flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-11 rounded-[18px] transition-colors",
                  isAdd ? "gradient-brand shadow-brand" : isActive ? "bg-surface-overlay" : "hover:bg-surface-raised",
                )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isAdd ? "text-on-accent" : isActive ? "text-primary" : "text-muted-custom",
                )} />
                <span className={cn(
                  "text-[10px] font-bold tracking-wide",
                  isAdd ? "text-on-accent" : isActive ? "text-primary" : "text-muted-custom",
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
