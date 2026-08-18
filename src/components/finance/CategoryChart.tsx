import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useT, tCategory } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";

interface DonutChartProps {
  data:      { name: string; value: number }[];
  type:      "expense" | "income";
  title:     string;
  emptyText: string;
}

const EXPENSE_COLORS: Record<string, string> = {
  "Casa":               "hsl(264 80% 62%)",
  "Alimentação":        "hsl(200 80% 58%)",
  "Besteira":           "hsl(38 92% 55%)",
  "Transporte":         "hsl(170 70% 48%)",
  "Empresa / Negócio":  "hsl(220 80% 65%)",
  "Investimento":       "hsl(142 70% 48%)",
  "Outros":             "hsl(250 20% 55%)",
  // legacy compat
  "Mercado":            "hsl(200 80% 58%)",
  "Lanche":             "hsl(38 92% 55%)",
  "Farmácia":           "hsl(300 60% 62%)",
};

const INCOME_COLORS: Record<string, string> = {
  "Garçom":          "hsl(142 70% 48%)",
  "Cookies":         "hsl(264 80% 62%)",
  "Yakin Box":       "hsl(200 80% 58%)",
  "Hook Assessoria": "hsl(38 92% 55%)",
  "Gorjeta":         "hsl(170 70% 48%)",
  "Outros":          "hsl(250 20% 55%)",
};

const FALLBACK_COLORS = [
  "hsl(264 80% 62%)",
  "hsl(200 80% 58%)",
  "hsl(38 92% 55%)",
  "hsl(142 70% 48%)",
  "hsl(4 86% 60%)",
  "hsl(170 70% 48%)",
  "hsl(300 60% 62%)",
];

function getColor(type: "expense" | "income", name: string, index: number) {
  const map = type === "expense" ? EXPENSE_COLORS : INCOME_COLORS;
  return map[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const CustomTooltip = ({
  active, payload, type,
}: { active?: boolean; payload?: { name: string; value: number; payload: { name: string } }[]; type: "expense" | "income" }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface-overlay px-3 py-2 shadow-card text-xs">
        <p className="font-bold text-foreground">{tCategory(payload[0].payload.name)}</p>
        <p
          className="font-black mt-0.5"
          style={{ color: type === "expense" ? "hsl(var(--expense))" : "hsl(var(--income))" }}
        >
          {formatMoney(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={800}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DonutChart({ data, type, title, emptyText }: DonutChartProps) {
  const t = useT();

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm text-muted-custom">{emptyText}</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-4">
      {/* Donut */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%"
              innerRadius={55} outerRadius={85}
              paddingAngle={3} dataKey="value"
              strokeWidth={0} labelLine={false}
              label={renderCustomLabel}
            >
              {data.map((item, index) => (
                <Cell key={`cell-${index}`} fill={getColor(type, item.name, index)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip type={type} />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] font-bold text-muted-custom uppercase tracking-widest">{title}</p>
          <p
            className="text-lg font-black"
            style={{ color: type === "expense" ? "hsl(var(--expense))" : "hsl(var(--income))" }}
          >
            {formatMoney(total)}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2.5">
        {data.map((item, index) => {
          const pct   = total > 0 ? (item.value / total) * 100 : 0;
          const color = getColor(type, item.name, index);
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}90` }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">{tCategory(item.name)}</span>
                  <span
                    className="text-xs font-bold ml-2 flex-shrink-0"
                    style={{ color: type === "expense" ? "hsl(var(--expense))" : "hsl(var(--income))" }}
                  >
                    {formatMoney(item.value)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                </div>
              </div>
              <span className="text-[11px] text-muted-custom flex-shrink-0 w-8 text-right font-semibold">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-1.5 border-t border-border/40">
        <span className="text-xs text-muted-custom font-semibold">{t("chart_total")}</span>
        <span
          className="text-sm font-black"
          style={{ color: type === "expense" ? "hsl(var(--expense))" : "hsl(var(--income))" }}
        >
          {formatMoney(total)}
        </span>
      </div>
    </div>
  );
}

// Re-export CategoryChart for backward compat
export function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const t = useT();
  return <DonutChart data={data} type="expense" title={t("chart_total_expenses")} emptyText={t("chart_no_expenses")} />;
}
