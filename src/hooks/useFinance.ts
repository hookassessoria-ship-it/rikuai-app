import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Transaction, Bill, FinanceState, Settings, AdvisorMessage, BillType,
  FIXED_EXPENSE_CATEGORIES, RESERVE_CATEGORY,
} from "@/types/finance";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const STORAGE_KEY     = "finance_data_v4";
const OLD_STORAGE_KEY = "finance_data_v3";

const DEFAULT_SETTINGS: Settings = {
  userName: "Você",
  expectedIncome: 0,
  monthStartDay: 1,
  minBalanceAlert: 200,
  customIncomeCategories: [],
  customExpenseCategories: [],
  emergencyReserveSaved: 0,
  emergencyMonthsGoal: 6,
  emergencyCustomGoal: null,
  aiPersonality: "direto",
  colorTheme: "purple",
  isPremium: false,
  notifyBills: true,
  notifyGoals: true,
  notifyDreams: true,
  notifySystem: true,
};

function billTypeFromOldCategory(cat: string): BillType {
  if (cat === "Cartão")  return "cartao";
  if (cat === "Dívida")  return "divida";
  if (cat === "Outros")  return "variavel";
  return "fixa";
}

function defaultState(): FinanceState {
  return {
    transactions:    [],
    bills:           [],
    initialBalance:  0,
    settings:        DEFAULT_SETTINGS,
    welcomeShown:    false,
    advisorMessages: [],
  };
}

// Helper: add N months to YYYY-MM-DD
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return dt.toISOString().split("T")[0];
}

function isInCurrentMonth(iso: string, year: number, month: number): boolean {
  const [y, m] = iso.split("-").map(Number);
  return y === year && m - 1 === month;
}

function normalize(parsed: any): FinanceState {
  const base = defaultState();
  if (!parsed || typeof parsed !== "object") return base;
  return {
    ...base,
    ...parsed,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    advisorMessages: parsed.advisorMessages ?? [],
    transactions: parsed.transactions ?? [],
    bills: parsed.bills ?? base.bills,
    initialBalance: typeof parsed.initialBalance === "number" ? parsed.initialBalance : base.initialBalance,
    welcomeShown: !!parsed.welcomeShown,
  };
}

function readLocalLegacy(): FinanceState | null {
  try {
    const v4 = localStorage.getItem(STORAGE_KEY);
    if (v4) return normalize(JSON.parse(v4));
    const v3 = localStorage.getItem(OLD_STORAGE_KEY);
    if (v3) {
      const old = JSON.parse(v3) as { transactions: Transaction[]; bills: any[]; initialBalance: number };
      const migratedBills: Bill[] = (old.bills ?? []).map((b: any) => ({
        ...b,
        billType:  billTypeFromOldCategory(b.category),
        recurring: ["Moradia", "Serviços"].includes(b.category),
        transactions: b.transactions ?? [],
      }));
      return normalize({
        transactions: old.transactions ?? [],
        bills: migratedBills,
        initialBalance: old.initialBalance ?? 1200,
        settings: DEFAULT_SETTINGS,
        welcomeShown: false,
        advisorMessages: [],
      });
    }
  } catch (e) { console.error("Erro lendo legacy", e); }
  return null;
}

export function hasLegacyLocalData(): boolean {
  return !!(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY));
}

// Empty state for new workspaces (no demo bills — cloud starts clean).
function emptyState(): FinanceState {
  return {
    transactions: [], bills: [], initialBalance: 0,
    settings: DEFAULT_SETTINGS, welcomeShown: false, advisorMessages: [],
  };
}

export function useFinance() {
  const { activeWorkspace, loading: wsLoading } = useWorkspace();
  const [state, setState] = useState<FinanceState>(emptyState);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef<number | null>(null);
  const skipNextSave = useRef(true); // skip save right after loading from cloud

  // Load state when active workspace changes
  useEffect(() => {
    if (wsLoading || !activeWorkspace) { setLoading(true); return; }
    let cancelled = false;
    setLoading(true);
    skipNextSave.current = true;
    supabase
      .from("workspace_settings")
      .select("data")
      .eq("workspace_id", activeWorkspace.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("workspace_settings load", error);
        setState(normalize(data?.data ?? {}));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeWorkspace, wsLoading]);

  // Debounced save on state change
  useEffect(() => {
    if (loading || !activeWorkspace) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase
        .from("workspace_settings")
        .upsert({ workspace_id: activeWorkspace.id, data: state as any }, { onConflict: "workspace_id" });
      if (error) console.error("workspace_settings save", error);
    }, 600);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [state, activeWorkspace, loading]);

  // Import from localStorage into current workspace
  const importFromLocalStorage = useCallback(() => {
    const legacy = readLocalLegacy();
    if (!legacy) return false;
    skipNextSave.current = false;
    setState(legacy);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
    return true;
  }, []);

  const dismissLegacy = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OLD_STORAGE_KEY);
  }, []);


  // Apply color theme to <html data-theme="...">
  useEffect(() => {
    const theme = state.settings.colorTheme || "purple";
    if (theme === "purple") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }, [state.settings.colorTheme]);

  const now            = new Date();
  const currentMonth   = now.getMonth();
  const currentYear    = now.getFullYear();
  const today          = now.getDate();
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const remainingDays  = Math.max(1, lastDayOfMonth - today + 1);
  const todayISO       = now.toISOString().split("T")[0];

  // ── Transações do mês corrente
  const monthlyTransactions = state.transactions.filter((t) =>
    isInCurrentMonth(t.date, currentYear, currentMonth),
  );
  const totalIncome   = monthlyTransactions.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthlyTransactions.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
  const netResult     = totalIncome - totalExpenses;

  // ── Bills filtradas
  const creditCards    = state.bills.filter((b) => b.billType === "cartao");
  const nonCardBills   = state.bills.filter((b) => b.billType !== "cartao");
  const currentMonthBills = nonCardBills.filter((b) =>
    isInCurrentMonth(b.dueDate, currentYear, currentMonth),
  );
  const futureBills = nonCardBills.filter((b) => {
    const [y, m] = b.dueDate.split("-").map(Number);
    return y > currentYear || (y === currentYear && m - 1 > currentMonth);
  });

  const pendingThisMonth = currentMonthBills.filter((b) => !b.paid);
  const paidThisMonth    = currentMonthBills.filter((b) => b.paid);
  const totalDebtsMonth  = pendingThisMonth.reduce((s, b) => s + b.amount, 0);
  const paidDebtsMonth   = paidThisMonth.reduce((s, b) => s + b.amount, 0);
  const totalBillsMonth  = currentMonthBills.reduce((s, b) => s + b.amount, 0);

  // ── Saldo: saldo inicial + receitas - despesas (transações pagas já incluem auto-geradas das contas)
  const balance = state.initialBalance + totalIncome - totalExpenses;

  // ── Cartões
  const totalCardInvoices = creditCards.reduce((s, c) => s + c.amount, 0);
  const totalCardLimit    = creditCards.reduce((s, c) => s + (c.cardLimit ?? 0), 0);

  // ── Próximos 7 dias
  const sevenDaysAhead = new Date(now);
  sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);
  const dueIn7Days = nonCardBills.filter((b) => {
    if (b.paid) return false;
    const due = new Date(b.dueDate + "T00:00:00");
    return due >= new Date(todayISO + "T00:00:00") && due <= sevenDaysAhead;
  });
  const dueIn7DaysAmount = dueIn7Days.reduce((s, b) => s + b.amount, 0);
  // Saldo real disponível = dinheiro atual - reserva de emergência já alocada.
  // Não descontamos contas futuras (elas ainda não foram pagas).
  // Reserva de emergência = valor legado das configurações + TODAS as despesas
  // lançadas na categoria "Reserva de Emergência" (histórico completo).
  // O usuário nunca move dinheiro pela tela de Plano: só por lançamento.
  const reserveFromTransactions = state.transactions
    .filter((t) => t.type === "despesa" && t.category === RESERVE_CATEGORY)
    .reduce((s, t) => s + t.amount, 0);
  const emergencyReserveSaved = (state.settings.emergencyReserveSaved || 0) + reserveFromTransactions;

  const realAvailable      = balance - emergencyReserveSaved;
  // Saldo projetado após pagar tudo que vence nos próximos 7 dias.
  const projectedBalance7d = realAvailable - dueIn7DaysAmount;

  // ── Vencendo hoje / atrasadas / semana
  const overdueBills = nonCardBills.filter((b) => {
    if (b.paid) return false;
    return new Date(b.dueDate + "T00:00:00") < new Date(todayISO + "T00:00:00");
  });
  const dueTodayBills = nonCardBills.filter((b) => !b.paid && b.dueDate === todayISO);
  const dueThisWeek   = dueIn7Days;

  const overdueAmount   = overdueBills.reduce((s, b) => s + b.amount, 0);
  const dueTodayAmount  = dueTodayBills.reduce((s, b) => s + b.amount, 0);

  // ── Obrigações que exigem cobertura AGORA: atrasadas + a vencer no mês atual (sem futuras).
  const lastDayCurrentMonthISO = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;
  const obligationsDueByMonthEnd = nonCardBills.filter((b) => {
    if (b.paid) return false;
    return b.dueDate <= lastDayCurrentMonthISO;
  });
  const totalObligationsNow = obligationsDueByMonthEnd.reduce((s, b) => s + b.amount, 0);

  // ── Falta cobrir considera atrasadas + mês atual, nunca futuras.
  const amountRemainingToPay = Math.max(0, totalObligationsNow - balance);
  const dailyGoal = amountRemainingToPay > 0 ? amountRemainingToPay / remainingDays : 0;
  const debtCoveragePercent = totalBillsMonth > 0
    ? Math.min((paidDebtsMonth / totalBillsMonth) * 100, 100)
    : 100;
  const isOK = balance >= totalObligationsNow;

  // ── Gráfico despesas/receitas
  const expensesByCategory = monthlyTransactions
    .filter((t) => t.type === "despesa")
    .reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const expenseChartData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const incomeByCategory = monthlyTransactions
    .filter((t) => t.type === "receita")
    .reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const incomeChartData = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // ── Spending por dia
  const spendingByDay: { day: number; gasto: number; receita: number }[] = [];
  for (let dd = 1; dd <= today; dd++) {
    const dE = monthlyTransactions.filter((t) => t.type === "despesa" && new Date(t.date).getDate() === dd).reduce((s, t) => s + t.amount, 0);
    const dR = monthlyTransactions.filter((t) => t.type === "receita" && new Date(t.date).getDate() === dd).reduce((s, t) => s + t.amount, 0);
    spendingByDay.push({ day: dd, gasto: dE, receita: dR });
  }

  // ── Insights
  const topCategory = expenseChartData[0] ?? null;
  const besteirasAmount = (expensesByCategory["Besteira"] || 0) + (expensesByCategory["Alimentação"] || 0) + (expensesByCategory["Outros"] || 0);
  const isBesteirasHigh = totalExpenses > 0 && besteirasAmount / totalExpenses > 0.30;

  // ── 50/30/20
  const fixedCostsMonth = currentMonthBills.filter((b) => b.billType === "fixa").reduce((s, b) => s + b.amount, 0);
  const necessitiesActual = fixedCostsMonth + (expensesByCategory["Alimentação"] || 0) + (expensesByCategory["Casa"] || 0) + (expensesByCategory["Transporte"] || 0);
  const lifestyleActual   = (expensesByCategory["Besteira"] || 0) + (expensesByCategory["Outros"] || 0);
  const investedThisMonth = (expensesByCategory["Investimento"] || 0);
  const futureActual      = investedThisMonth;
  const incomeRef = totalIncome > 0 ? totalIncome : state.settings.expectedIncome;
  const planRule = {
    necessitiesIdeal: incomeRef * 0.5,
    lifestyleIdeal:   incomeRef * 0.3,
    futureIdeal:      incomeRef * 0.2,
    necessitiesActual,
    lifestyleActual,
    futureActual,
  };

  // ── Reserva de emergência
  // "Despesas fixas recorrentes" = contas recorrentes (não-cartão) do mês atual
  // + despesas do mês em categorias tratadas como fixas.
  const recurringBillsThisMonth = currentMonthBills
    .filter((b) => b.recurring && b.billType !== "cartao")
    .reduce((s, b) => s + b.amount, 0);
  const fixedCategoryExpensesThisMonth = FIXED_EXPENSE_CATEGORIES.reduce(
    (s, cat) => s + (expensesByCategory[cat] || 0),
    0,
  );
  const recurringFixedBase = recurringBillsThisMonth + fixedCategoryExpensesThisMonth;
  const monthsGoal = state.settings.emergencyMonthsGoal ?? 6;
  const emergencyAutoGoal = recurringFixedBase * monthsGoal;
  const emergencyGoal =
    state.settings.emergencyCustomGoal && state.settings.emergencyCustomGoal > 0
      ? state.settings.emergencyCustomGoal
      : emergencyAutoGoal;
  const emergencyProgress = emergencyGoal > 0 ? Math.min((emergencyReserveSaved / emergencyGoal) * 100, 100) : 0;
  // ── Histórico mensal (últimos 12 meses, incluindo o atual)
  const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const monthlyHistory = useMemo(() => {
    const arr: { key: string; label: string; receita: number; despesa: number; resultado: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const txs = state.transactions.filter((t) => {
        const [ty, tm] = t.date.split("-").map(Number);
        return ty === y && tm - 1 === m;
      });
      const receita = txs.filter((t) => t.type === "receita").reduce((s, t) => s + t.amount, 0);
      const despesa = txs.filter((t) => t.type === "despesa").reduce((s, t) => s + t.amount, 0);
      arr.push({
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: `${MONTH_LABELS[m]}/${String(y).slice(2)}`,
        receita,
        despesa,
        resultado: receita - despesa,
      });
    }
    return arr;
  }, [state.transactions, currentYear, currentMonth]);

  // ── Dívidas em atraso (>30d)
  const dividasAtrasadas = state.bills.filter((b) => {
    if (b.paid || b.billType !== "divida") return false;
    const due = new Date(b.dueDate + "T00:00:00");
    const diff = (Date.now() - due.getTime()) / 86400000;
    return diff > 30;
  });

  // ── Health Score (A-F)
  const healthScore = useMemo(() => {
    let score = 100;
    if (overdueBills.length > 0)            score -= 25;
    if (totalExpenses > totalIncome && totalIncome > 0) score -= 25;
    if (amountRemainingToPay > 0)           score -= 15;
    if (emergencyReserveSaved < fixedCostsMonth) score -= 15;
    if (dividasAtrasadas.length > 0)        score -= 15;
    if (balance < state.settings.minBalanceAlert) score -= 10;
    score = Math.max(0, score);
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : score >= 30 ? "E" : "F";
    return { score, grade };
  }, [overdueBills.length, totalExpenses, totalIncome, amountRemainingToPay, emergencyReserveSaved, fixedCostsMonth, dividasAtrasadas.length, balance, state.settings.minBalanceAlert]);

  // ── Actions
  const addTransaction = useCallback((t: Omit<Transaction, "id">) => {
    setState((prev) => {
      const newTx: Transaction = { ...t, id: crypto.randomUUID() };
      let updatedBills = prev.bills;
      if (t.paymentMethod === "crédito" && t.creditCardId) {
        updatedBills = prev.bills.map((b) =>
          b.id === t.creditCardId
            ? { ...b, amount: b.amount + t.amount, transactions: [...(b.transactions ?? []), { description: t.description || t.category, amount: t.amount, date: t.date }] }
            : b,
        );
      }
      return { ...prev, transactions: [...prev.transactions, newTx], bills: updatedBills };
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((prev) => ({ ...prev, transactions: prev.transactions.filter((t) => t.id !== id) }));
  }, []);

  const addBill = useCallback((b: Omit<Bill, "id" | "paid">) => {
    setState((prev) => ({ ...prev, bills: [...prev.bills, { ...b, id: crypto.randomUUID(), paid: false, transactions: b.transactions ?? [] }] }));
  }, []);

  // Toggle paid: cria/remove transação auto e gera próxima ocorrência se recorrente
  const toggleBillPaid = useCallback((id: string) => {
    setState((prev) => {
      const bill = prev.bills.find((b) => b.id === id);
      if (!bill) return prev;

      // Já paga → desfazer: remove transação auto
      if (bill.paid) {
        return {
          ...prev,
          bills: prev.bills.map((b) => b.id === id ? { ...b, paid: false, paidAt: undefined } : b),
          transactions: prev.transactions.filter((t) => !(t.autoGenerated && t.sourceBillId === id)),
        };
      }

      // Marcar como paga: cria transação auto
      const todayStr = new Date().toISOString().split("T")[0];
      const newTx: Transaction = {
        id: crypto.randomUUID(),
        type: "despesa",
        amount: bill.amount,
        category: bill.billType === "cartao" ? "Cartão" : (bill.billType === "fixa" ? "Casa" : "Outros"),
        description: `${bill.name} (pago)`,
        date: todayStr,
        paymentMethod: "débito",
        autoGenerated: true,
        sourceBillId: id,
      };

      let newBills = prev.bills.map((b) => b.id === id ? { ...b, paid: true, paidAt: todayStr } : b);

      // Se recorrente e não-cartão: gerar próxima ocorrência no próximo mês
      if (bill.recurring && bill.billType !== "cartao") {
        const nextDue = addMonths(bill.dueDate, 1);
        const alreadyExists = newBills.some((b) =>
          b.name === bill.name && b.dueDate === nextDue && !b.paid,
        );
        if (!alreadyExists) {
          newBills = [...newBills, { ...bill, id: crypto.randomUUID(), dueDate: nextDue, paid: false, paidAt: undefined }];
        }
      }

      // Se cartão: zerar fatura atual e gerar próxima
      if (bill.billType === "cartao") {
        const nextDue = addMonths(bill.dueDate, 1);
        newBills = newBills.map((b) => b.id === id ? { ...b, amount: 0, transactions: [], paid: false, dueDate: nextDue, paidAt: undefined } : b);
      }

      return { ...prev, bills: newBills, transactions: [...prev.transactions, newTx] };
    });
  }, []);

  const deleteBill = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== id),
      transactions: prev.transactions.filter((t) => !(t.autoGenerated && t.sourceBillId === id)),
    }));
  }, []);

  const updateBill = useCallback((id: string, patch: Partial<Bill>) => {
    setState((prev) => ({ ...prev, bills: prev.bills.map((b) => b.id === id ? { ...b, ...patch } : b) }));
  }, []);

  const updateInitialBalance = useCallback((value: number) => {
    setState((prev) => ({ ...prev, initialBalance: value }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const markWelcomeShown = useCallback(() => {
    setState((prev) => ({ ...prev, welcomeShown: true }));
  }, []);

  const setAdvisorMessages = useCallback((updater: (m: AdvisorMessage[]) => AdvisorMessage[]) => {
    setState((prev) => ({ ...prev, advisorMessages: updater(prev.advisorMessages) }));
  }, []);

  const clearAdvisor = useCallback(() => {
    setState((prev) => ({ ...prev, advisorMessages: [] }));
  }, []);

  // ── Snapshot p/ IA
  const buildAdvisorContext = useCallback(() => ({
    saldo: balance,
    saldoRealDisponivel: realAvailable,
    saldoInicial: state.initialBalance,
    totalReceitasMes: totalIncome,
    totalGastosMes: totalExpenses,
    metaDiaria: dailyGoal,
    diasRestantes: remainingDays,
    contasMesAtual: currentMonthBills.map((b) => ({
      nome: b.name, valor: b.amount, vencimento: b.dueDate,
      paga: b.paid, tipo: b.billType, recorrente: b.recurring,
    })),
    contasAtrasadas: overdueBills.map((b) => ({ nome: b.name, valor: b.amount, vencimento: b.dueDate })),
    cartoes: creditCards.map((c) => ({
      nome: c.name, faturaAtual: c.amount, limite: c.cardLimit, vencimento: c.dueDate, fechamento: c.closingDay,
    })),
    saudeFinanceira: healthScore.grade,
    reservaEmergencia: { atual: emergencyReserveSaved, meta: emergencyGoal },
    config: state.settings,
  }), [balance, realAvailable, state.initialBalance, totalIncome, totalExpenses, dailyGoal, remainingDays, currentMonthBills, overdueBills, creditCards, healthScore.grade, state.settings, emergencyGoal]);

  return {
    // raw state
    transactions: state.transactions,
    bills: state.bills,
    settings: state.settings,
    welcomeShown: state.welcomeShown,
    advisorMessages: state.advisorMessages,
    initialBalance: state.initialBalance,

    // derived
    creditCards,
    nonCardBills,
    currentMonthBills,
    futureBills,
    pendingThisMonth,
    monthlyTransactions,
    totalIncome,
    totalExpenses,
    netResult,
    balance,
    realAvailable,
    projectedBalance7d,
    investedThisMonth,
    monthlyHistory,
    totalDebtsMonth,
    paidDebtsMonth,
    totalBillsMonth,
    amountRemainingToPay,
    dailyGoal,
    debtCoveragePercent,
    isOK,
    remainingDays,
    today,
    lastDayOfMonth,
    expenseChartData,
    incomeChartData,
    spendingByDay,
    topCategory,
    isBesteirasHigh,
    besteirasAmount,
    overdueBills,
    overdueAmount,
    dueTodayBills,
    dueTodayAmount,
    dueThisWeek,
    dueIn7Days,
    dueIn7DaysAmount,
    totalCardInvoices,
    totalCardLimit,
    fixedCostsMonth,
    recurringFixedBase,
    emergencyAutoGoal,
    planRule,
    emergencyGoal,
    emergencyProgress,
    emergencyReserveSaved,
    reserveFromTransactions,
    dividasAtrasadas,
    healthScore,

    // actions
    addTransaction,
    deleteTransaction,
    addBill,
    toggleBillPaid,
    deleteBill,
    updateBill,
    updateInitialBalance,
    updateSettings,
    markWelcomeShown,
    setAdvisorMessages,
    clearAdvisor,
    buildAdvisorContext,

    // cloud
    loading,
    importFromLocalStorage,
    dismissLegacy,
  };
}
