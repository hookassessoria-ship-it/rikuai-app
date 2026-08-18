import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useT } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";

interface SpendingLineChartProps {
  data: { day: number; gasto: number; receita: number }[];
}

const CustomTooltip = ({
  active, payload, label, t,
}: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number; t: (key: string, params?: Record<string, string | number>) => string }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface-overlay px-3 py-2 shadow-card text-xs space-y-1">
        <p className="font-bold text-foreground">{t("chart_day", { day: label ?? "" })}</p>
        {payload.map((p) => (
          <p key={p.dataKey} className="font-black"
            style={{ color: p.dataKey === "gasto" ? "hsl(var(--expense))" : "hsl(var(--income))" }}>
            {t(p.dataKey === "gasto" ? "chart_expense_label" : "chart_income_label", { amount: formatMoney(p.value) })}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function SpendingLineChart({ data }: SpendingLineChartProps) {
  const t = useT();
  const hasData = data.some((d) => d.gasto > 0 || d.receita > 0);

  if (!hasData) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-1">📈</div>
        <p className="text-xs text-muted-custom">{t("chart_no_entries")}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="gradGasto" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(4 86% 60%)"  stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(4 86% 60%)"  stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="hsl(142 70% 48%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(142 70% 48%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(252 16% 18% / 0.6)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false} tickLine={false} interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false} tickLine={false}
          tickFormatter={(v) => formatMoney(v, undefined, undefined).replace(/[\d.,\s]/g, "") + v}
        />
        <Tooltip content={<CustomTooltip t={t} />} />
        <Area type="monotone" dataKey="receita" stroke="hsl(142 70% 48%)" strokeWidth={2}
          fill="url(#gradReceita)" dot={false} activeDot={{ r: 4, fill: "hsl(142 70% 48%)" }} />
        <Area type="monotone" dataKey="gasto" stroke="hsl(4 86% 60%)" strokeWidth={2}
          fill="url(#gradGasto)" dot={false} activeDot={{ r: 4, fill: "hsl(4 86% 60%)" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
