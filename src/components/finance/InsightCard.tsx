import { AlertTriangle, TrendingDown, CheckCircle, Lightbulb } from "lucide-react";
import { useT, useTCategory } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";

interface InsightCardProps {
  topCategory:     { name: string; value: number } | null;
  isBesteirasHigh: boolean;
  besteirasAmount: number;
  netResult:       number;
  totalExpenses:   number;
}

export function InsightCard({ topCategory, isBesteirasHigh, besteirasAmount, netResult, totalExpenses }: InsightCardProps) {
  const t = useT();
  const tCategory = useTCategory();
  const insights: { icon: React.ReactNode; text: string; type: "warn" | "ok" | "info" }[] = [];

  if (isBesteirasHigh) {
    insights.push({
      icon: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />,
      text: t("ins_junk", { amount: formatMoney(besteirasAmount) }),
      type: "warn",
    });
  }

  if (topCategory && totalExpenses > 0) {
    const pct = ((topCategory.value / totalExpenses) * 100).toFixed(0);
    insights.push({
      icon: <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" />,
      text: t("ins_top", { name: tCategory(topCategory.name), amount: formatMoney(topCategory.value), pct }),
      type: topCategory.value / totalExpenses > 0.5 ? "warn" : "info",
    });
  }

  if (netResult > 0) {
    insights.push({
      icon: <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />,
      text: t("ins_positive", { amount: formatMoney(netResult) }),
      type: "ok",
    });
  } else if (netResult < 0) {
    insights.push({
      icon: <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />,
      text: t("ins_negative", { amount: formatMoney(Math.abs(netResult)) }),
      type: "warn",
    });
  }

  const colorMap = {
    warn: { bg: "hsl(38 92% 55% / 0.10)", color: "hsl(var(--warning))", border: "hsl(38 92% 55% / 0.22)" },
    ok:   { bg: "hsl(142 70% 48% / 0.10)", color: "hsl(var(--income))",  border: "hsl(142 70% 48% / 0.22)" },
    info: { bg: "hsl(264 80% 62% / 0.10)", color: "hsl(var(--primary))", border: "hsl(264 80% 62% / 0.22)" },
  };

  return (
    <div className="rounded-2xl p-4 shadow-card border border-border/60 gradient-card space-y-2.5">
      <div className="flex items-center gap-2 mb-0.5">
        <Lightbulb className="w-4 h-4 text-muted-custom" />
        <span className="text-xs font-bold text-muted-custom uppercase tracking-widest">
          {t("ins_title")}
        </span>
      </div>

      {insights.length === 0 ? (
        <p className="text-xs text-muted-custom">{t("ins_empty")}</p>
      ) : (
        insights.map((insight, i) => {
          const c = colorMap[insight.type];
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 text-xs leading-relaxed px-3 py-2.5 rounded-xl"
              style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
            >
              {insight.icon}
              <span className="font-semibold">{insight.text}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
