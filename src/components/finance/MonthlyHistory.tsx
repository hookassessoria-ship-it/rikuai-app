import { TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";

interface Month { key: string; label: string; receita: number; despesa: number; resultado: number }

export function MonthlyHistory({ data }: { data: Month[] }) {
  const t = useT();
  const withData = data.filter((m) => m.receita > 0 || m.despesa > 0);
  const enough = withData.length >= 2;
  const current = withData[withData.length - 1];
  const previous = withData[withData.length - 2];
  const delta = enough && previous.resultado !== 0
    ? ((current.resultado - previous.resultado) / Math.abs(previous.resultado)) * 100
    : 0;

  const exportPDF = () => {
    if (withData.length === 0) {
      toast.error(t("hist_no_data_export"));
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t("hist_pdf_title"), 14, 18);
    doc.setFontSize(10);
    doc.text(t("hist_pdf_generated", { date: formatDate(new Date().toISOString()) }), 14, 25);

    // Table header
    let y = 38;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t("hist_pdf_month"), 14, y);
    doc.text(t("hist_pdf_income"), 60, y, { align: "right" });
    doc.text(t("hist_pdf_expense"), 105, y, { align: "right" });
    doc.text(t("hist_pdf_result"), 155, y, { align: "right" });
    doc.setDrawColor(180);
    doc.line(14, y + 2, 195, y + 2);
    doc.setFont("helvetica", "normal");
    y += 9;

    let totRec = 0, totDes = 0;
    withData.forEach((m) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(m.label, 14, y);
      doc.text(formatMoney(m.receita), 60, y, { align: "right" });
      doc.text(formatMoney(m.despesa), 105, y, { align: "right" });
      doc.text(`${m.resultado >= 0 ? "+" : ""}${formatMoney(m.resultado)}`, 155, y, { align: "right" });
      y += 7;
      totRec += m.receita;
      totDes += m.despesa;
    });

    // Totals
    doc.line(14, y, 195, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(t("hist_pdf_total"), 14, y);
    doc.text(formatMoney(totRec), 60, y, { align: "right" });
    doc.text(formatMoney(totDes), 105, y, { align: "right" });
    doc.text(`${totRec - totDes >= 0 ? "+" : ""}${formatMoney(totRec - totDes)}`, 155, y, { align: "right" });

    doc.save(`historico-mensal-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success(t("hist_pdf_generated_toast"));
  };

  return (
    <div className="rounded-2xl p-4 shadow-card border border-border/60 gradient-card">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs font-bold text-muted-custom uppercase tracking-widest">{t("hist_title")}</p>
        <div className="flex items-center gap-2">
          {enough && (
            <span className={`text-[11px] font-bold flex items-center gap-1 ${delta >= 0 ? "text-income" : "text-danger"}`}>
              {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
            </span>
          )}
          <button
            onClick={exportPDF}
            disabled={withData.length === 0}
            className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <FileDown className="w-3 h-3" /> {t("hist_pdf_button")}
          </button>
        </div>
      </div>

      {withData.length === 0 ? (
        <p className="text-xs text-muted-custom py-6 text-center">{t("hist_empty")}</p>
      ) : (
        <>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={withData}>
                <XAxis dataKey="label" stroke="hsl(var(--foreground-muted))" fontSize={10} />
                <YAxis stroke="hsl(var(--foreground-muted))" fontSize={10} width={45} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="resultado" radius={[6, 6, 0, 0]}>
                  {withData.map((m) => (
                    <Cell key={m.key} fill={m.resultado >= 0 ? "hsl(var(--income))" : "hsl(var(--danger))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 space-y-1.5">
            {withData.slice(-6).reverse().map((m) => (
              <div key={m.key} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-surface-overlay">
                <span className="text-foreground font-semibold uppercase">{m.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-income">+{formatMoney(m.receita)}</span>
                  <span className="text-danger">−{formatMoney(m.despesa)}</span>
                  <span className={`font-black ${m.resultado >= 0 ? "text-income" : "text-danger"}`}>
                    {m.resultado >= 0 ? "+" : ""}{formatMoney(m.resultado)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {!enough && (
            <p className="text-[10px] text-muted-custom mt-2 text-center">{t("hist_need_more_data")}</p>
          )}
        </>
      )}
    </div>
  );
}
