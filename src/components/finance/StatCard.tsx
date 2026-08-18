import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label:     string;
  value:     string;
  icon?:     ReactNode;
  variant?:  "default" | "income" | "expense" | "debt";
  className?: string;
  subtext?:  string;
}

const variantStyles = {
  default: "gradient-card",
  income:  "gradient-income",
  expense: "gradient-expense",
  debt:    "gradient-debt",
};

const valueStyles = {
  default: "text-foreground",
  income:  "text-income",
  expense: "text-expense",
  debt:    "text-debt",
};

export function StatCard({ label, value, icon, variant = "default", className, subtext }: StatCardProps) {
  return (
    <div className={cn("rounded-2xl p-4 shadow-card border border-border/60", variantStyles[variant], className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-muted-custom uppercase tracking-widest">{label}</span>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <div className={cn("text-2xl font-black tracking-tight", valueStyles[variant])}>{value}</div>
      {subtext && <div className="text-[10px] text-muted-custom mt-1 font-semibold">{subtext}</div>}
    </div>
  );
}
