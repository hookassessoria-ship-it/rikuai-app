import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { redeemPendingReferral } from "@/hooks/useReferrals";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Sparkles, User, Building2, Loader2 } from "lucide-react";

type AccountType = "personal" | "business";
type Language = "pt-BR" | "en-US";
type Currency = "BRL" | "USD" | "EUR";

const COUNTRIES = [
  { code: "BR", name: "Brasil" },
  { code: "PT", name: "Portugal" },
  { code: "US", name: "United States" },
  { code: "ES", name: "España" },
  { code: "AR", name: "Argentina" },
  { code: "MX", name: "México" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const t = useT();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [companyName, setCompanyName] = useState("");
  const [language, setLanguage] = useState<Language>("pt-BR");
  const [currency, setCurrency] = useState<Currency>("BRL");
  const [country, setCountry] = useState("BR");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate("/auth", { replace: true }); return; }
      setUserId(data.user.id);
    });
  }, [navigate]);

  const finish = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1) Atualiza perfil
      await supabase.from("profiles").update({
        onboarded: true,
        account_type: accountType,
        language, currency, country,
      }).eq("id", userId);

      // 2) Cria (ou reaproveita) o workspace do usuário com o nome escolhido
      const workspaceName =
        accountType === "business" && companyName.trim()
          ? companyName.trim()
          : (accountType === "personal" ? (language === "en-US" ? "Personal" : "Pessoal") : "Empresa");

      const { data: existing } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (existing && existing.length > 0) {
        // Reaproveita workspace pré-existente (contas legadas)
        await supabase.from("workspaces").update({
          name: workspaceName,
          account_type: accountType,
          company_name: accountType === "business" ? workspaceName : null,
        }).eq("id", existing[0].id);
      } else {
        // Cria do zero
        const { data: ws, error: wsErr } = await supabase.from("workspaces").insert({
          name: workspaceName,
          owner_id: userId,
          account_type: accountType,
          company_name: accountType === "business" ? workspaceName : null,
        }).select("id").single();
        if (wsErr) throw wsErr;
        await supabase.from("workspace_members").insert({ workspace_id: ws.id, user_id: userId, role: "owner" });
        await supabase.from("workspace_settings").insert({ workspace_id: ws.id, data: {} });
      }

      // 3) Resgata indicação pendente (7 dias de Premium para quem foi indicado)
      const bonus = await redeemPendingReferral();
      if (bonus) {
        toast.success(language === "en-US"
          ? `You earned ${bonus.days} days of free Premium!`
          : `Você ganhou ${bonus.days} dias de Premium grátis!`);
      }

      toast.success(language === "en-US" ? "All set!" : "Tudo pronto!", {
        description: language === "en-US" ? "Welcome to Riku AI." : "Bem-vindo ao Riku AI.",
      });
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(t("onb_save_failed"), { description: err?.message ?? t("onb_try_again") });
    } finally {
      setLoading(false);
    }
  };

  const canNext =
    step === 1 ? (accountType === "personal" || (accountType === "business" && companyName.trim().length > 1))
    : step === 2 ? !!language
    : step === 3 ? (!!currency && !!country)
    : true;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
               style={{ background: "var(--gradient-hero)" }}>
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{t("onb_title")}</h1>
          <p className="text-xs text-muted-custom mt-1">{t("onb_step", { step })}</p>
        </div>

        <div className="rounded-2xl border border-border/60 gradient-card p-6 shadow-card space-y-4">

          {step === 1 && (
            <>
              <p className="text-sm font-bold text-foreground">{t("onb_account_q")}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setAccountType("personal")}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    accountType === "personal" ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
                  }`}>
                  <User className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-bold text-foreground">{t("onb_personal")}</p>
                  <p className="text-[11px] text-muted-custom mt-1">{t("onb_personal_hint")}</p>
                </button>
                <button
                  onClick={() => setAccountType("business")}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    accountType === "business" ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
                  }`}>
                  <Building2 className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-bold text-foreground">{t("onb_business")}</p>
                  <p className="text-[11px] text-muted-custom mt-1">{t("onb_business_hint")}</p>
                </button>
              </div>
              {accountType === "business" && (
                <div>
                  <label className="text-[11px] uppercase font-bold text-muted-custom">{t("onb_company_name")}</label>
                  <input
                    autoFocus type="text" value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t("onb_company_ph")}
                    className="w-full mt-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-bold text-foreground">{t("onb_lang_q")}</p>
              <div className="grid grid-cols-2 gap-3">
                {(["pt-BR", "en-US"] as Language[]).map((l) => (
                  <button key={l} onClick={() => setLanguage(l)}
                    className={`p-4 rounded-xl border transition-all ${
                      language === l ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/40"
                    }`}>
                    <p className="text-sm font-bold text-foreground">{l === "pt-BR" ? "Português (BR)" : "English (US)"}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-bold text-foreground">{t("onb_currency_q")}</p>
              <div>
                <label className="text-[11px] uppercase font-bold text-muted-custom">{t("onb_currency")}</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(["BRL", "USD", "EUR"] as Currency[]).map((c) => (
                    <button key={c} onClick={() => setCurrency(c)}
                      className={`py-3 rounded-xl border font-bold text-sm ${
                        currency === c ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-custom"
                      }`}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] uppercase font-bold text-muted-custom">{t("onb_country")}</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-primary">
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl border border-border text-muted-custom font-bold text-sm">Voltar</button>
            )}
            {step < 3 ? (
              <button
                disabled={!canNext}
                onClick={() => setStep(step + 1)}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40">
                Continuar
              </button>
            ) : (
              <button
                disabled={!canNext || loading}
                onClick={finish}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Concluir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
