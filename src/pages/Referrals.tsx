import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Gift, Share2, Users, Check, Loader2, MessageCircle, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { useReferrals } from "@/hooks/useReferrals";
import { referralLink } from "@/lib/referral";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { sfx } from "@/lib/sfx";

export default function Referrals() {
  const t = useT();
  const navigate = useNavigate();
  const { stats, loading } = useReferrals();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) navigate("/auth", { replace: true }); });
  }, [navigate]);

  const link = stats?.code ? referralLink(stats.code) : "";

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(t("ref_copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const message = `${t("ref_invite_msg")}\n\n${link}`;

  const copyMessage = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(message);
    sfx("success");
    toast.success(t("ref_msg_copied"));
  };

  const shareVia = (kind: "whatsapp" | "telegram" | "email") => {
    if (!link) return;
    sfx("tap");
    const enc = encodeURIComponent(message);
    const url =
      kind === "whatsapp" ? `https://wa.me/?text=${enc}`
      : kind === "telegram" ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t("ref_invite_msg"))}`
      : `mailto:?subject=${encodeURIComponent("RikuAI")}&body=${enc}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Riku AI", text: message }); } catch { /* cancelado */ }
    } else {
      copy();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-custom hover:text-foreground mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {t("onb_back")}
        </Link>

        <div className="flex items-center gap-2 mb-1">
          <Gift className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t("ref_title")}</h1>
        </div>
        <p className="text-xs text-muted-custom mb-6">{t("ref_subtitle")}</p>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          <>
            <div className="rounded-2xl p-4 border border-border/60 gradient-card shadow-card">
              <p className="text-[10px] font-bold text-muted-custom uppercase tracking-widest mb-2">{t("ref_your_link")}</p>
              <p className="text-xs text-foreground break-all bg-surface-overlay rounded-xl p-3 font-mono">{link}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { copyMessage(); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-accent text-sm font-bold">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {t("ref_copy")}
                </button>
                <button onClick={share}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-surface-overlay text-foreground text-sm font-bold border border-border">
                  <Share2 className="w-4 h-4" /> {t("ref_share")}
                </button>
              </div>
            </div>

            {/* Mensagem pronta para enviar + canais */}
            <div className="mt-4 rounded-2xl p-4 border border-border/60 gradient-card shadow-card">
              <p className="text-[10px] font-bold text-muted-custom uppercase tracking-widest mb-2">{t("ref_invite_msg_title")}</p>
              <p className="text-sm text-foreground leading-relaxed rounded-xl bg-surface-overlay p-3 whitespace-pre-line">{message}</p>
              <button onClick={copyMessage}
                className="press mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-on-accent text-sm font-bold">
                <Copy className="w-4 h-4" /> {t("ref_copy_msg")}
              </button>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <ShareBtn icon={MessageCircle} label={t("ref_via_whatsapp")} onClick={() => shareVia("whatsapp")} />
                <ShareBtn icon={Send} label={t("ref_via_telegram")} onClick={() => shareVia("telegram")} />
                <ShareBtn icon={Mail} label={t("ref_via_email")} onClick={() => shareVia("email")} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat label={t("ref_signups")} value={String(stats?.signups ?? 0)} />
              <Stat label={t("ref_conversions")} value={String(stats?.conversions ?? 0)} />
              <Stat label={t("ref_reward_days")} value={String(stats?.reward_days ?? 0)} />
            </div>

            {stats?.premium_until && new Date(stats.premium_until) > new Date() && (
              <div className="mt-4 rounded-2xl p-4 border border-success/30 bg-success/5">
                <p className="text-xs font-bold text-success uppercase tracking-widest mb-1">{t("ref_bonus_active")}</p>
                <p className="text-sm text-foreground">{t("ref_bonus_until", { date: formatDate(stats.premium_until) })}</p>
              </div>
            )}

            <div className="mt-4 rounded-2xl p-4 border border-border/60 bg-surface">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold text-foreground uppercase tracking-widest">{t("ref_how_title")}</p>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-custom">
                <li>1. {t("ref_how_1")}</li>
                <li>2. {t("ref_how_2")}</li>
                <li>3. {t("ref_how_3")}</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShareBtn({ icon: Icon, label, onClick }: { icon: typeof Mail; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="press flex flex-col items-center gap-1 py-2.5 rounded-xl bg-surface border border-border text-foreground min-h-11">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl p-3 bg-surface border border-border/60 text-center">
      <p className="text-2xl font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-custom uppercase font-bold tracking-wide mt-0.5">{label}</p>
    </div>
  );
}
