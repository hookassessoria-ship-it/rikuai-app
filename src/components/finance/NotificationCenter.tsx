import { Bell, X, AlertCircle, Clock, TrendingDown, CreditCard, Wallet } from "lucide-react";
import { Bill, Settings } from "@/types/finance";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";

interface Alert {
  icon: React.ReactNode;
  text: string;
  type: "danger" | "warning" | "info";
}

interface Props {
  bills:           Bill[];
  balance:         number;
  dailyGoal:       number;
  totalIncome:     number;
  remainingDays:   number;
  today:           number;
  settings:        Settings;
}

export function useAlerts({ bills, balance, dailyGoal, totalIncome, remainingDays, today, settings }: Props): Alert[] {
  const t = useT();
  return useMemo(() => {
    const alerts: Alert[] = [];
    const now = new Date(); now.setHours(0,0,0,0);

    bills.forEach((b) => {
      if (b.paid || b.billType === "cartao") return;
      const due = new Date(b.dueDate + "T00:00:00");
      const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
      if (days < 0) {
        alerts.push({
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          text: t("alert_bill_overdue", { name: b.name, days: String(Math.abs(days)), amount: formatMoney(b.amount) }),
          type: "danger",
        });
      } else if (days <= 3) {
        alerts.push({
          icon: <Clock className="w-3.5 h-3.5" />,
          text: days === 0
            ? t("alert_bill_due_today", { name: b.name, amount: formatMoney(b.amount) })
            : t("alert_bill_due_soon", { name: b.name, days: String(days), amount: formatMoney(b.amount) }),
          type: "warning",
        });
      }
    });

    bills.forEach((b) => {
      if (b.billType !== "cartao" || !b.closingDay) return;
      const closing = b.closingDay;
      const daysToClose = closing - today;
      if (daysToClose >= 0 && daysToClose <= 3) {
        alerts.push({
          icon: <CreditCard className="w-3.5 h-3.5" />,
          text: t("alert_card_closing", { name: b.name, days: String(daysToClose), amount: formatMoney(b.amount) }),
          type: "warning",
        });
      }
    });

    if (balance < settings.minBalanceAlert) {
      alerts.push({
        icon: <Wallet className="w-3.5 h-3.5" />,
        text: t("alert_balance_low", { min: formatMoney(settings.minBalanceAlert), balance: formatMoney(balance) }),
        type: "danger",
      });
    }

    const dailyActual = totalIncome / Math.max(today, 1);
    if (dailyGoal > 0 && dailyActual < dailyGoal * 0.7) {
      alerts.push({
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        text: t("alert_below_daily_goal", { actual: formatMoney(dailyActual), goal: formatMoney(dailyGoal) }),
        type: "warning",
      });
    }

    return alerts;
  }, [bills, balance, dailyGoal, totalIncome, remainingDays, today, settings, t]);
}

export function NotificationBell({ alerts }: { alerts: Alert[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const color = (t: Alert["type"]) => t === "danger" ? "hsl(var(--danger))" : t === "warning" ? "hsl(var(--warning))" : "hsl(var(--primary))";
  const bg    = (t: Alert["type"]) => t === "danger" ? "hsl(4 86% 60% / 0.10)" : t === "warning" ? "hsl(38 92% 55% / 0.10)" : "hsl(264 80% 62% / 0.10)";

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative p-2 rounded-xl hover:bg-surface transition-colors">
        <Bell className="w-5 h-5 text-foreground" />
        {alerts.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[9px] font-black text-on-accent flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md animate-slide-up">
          <div className="max-w-md mx-auto p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5" /> {t("alert_notifications_title", { count: String(alerts.length) })}
              </h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-surface">
                <X className="w-5 h-5 text-muted-custom" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-custom text-sm py-10">{t("alert_empty")}</p>
              ) : alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-xl p-3 border"
                  style={{ background: bg(a.type), borderColor: `${color(a.type)}33`, color: color(a.type) }}>
                  {a.icon}
                  <p className="text-xs font-semibold leading-relaxed">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
