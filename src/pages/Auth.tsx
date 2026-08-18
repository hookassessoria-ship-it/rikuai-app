import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";
import mark from "@/assets/riku-mark.png.asset.json";

import { captureReferralFromUrl } from "@/lib/referral";
import { useT } from "@/lib/i18n";

type Mode = "signin" | "signup";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  // must be same-origin relative path
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Auth() {
  const navigate = useNavigate();
  const t = useT();
  const [params] = useSearchParams();
  const next = useMemo(() => safeNext(params.get("next")), [params]);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Captura o código de indicação (?ref=) antes de qualquer navegação.
  useEffect(() => {
    captureReferralFromUrl(window.location.search);
  }, []);

  // Se já logado, seguir para next (ou /)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (next.startsWith("/.lovable/oauth/consent")) {
          window.location.replace(next);
        } else {
          navigate(next, { replace: true });
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        if (next.startsWith("/.lovable/oauth/consent")) {
          window.location.replace(next);
        } else {
          navigate(next, { replace: true });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success(t("auth_created"), { description: t("auth_created_desc") });
        navigate("/onboarding", { replace: true });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(t("auth_failed"), { description: err?.message ?? t("auth_failed_desc") });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${next}`,
      });
      if (result.error) throw result.error;
      // se redirected, o browser navega; se popup, session já setada.
    } catch (err: any) {
      toast.error(t("auth_google_failed"), { description: err?.message ?? t("auth_failed_desc") });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center px-5 py-10 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 gradient-brand" />
      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center mb-8">
          <img src={mark.url} alt="RikuAI" className="w-20 h-20 mb-3" />
          <h1 className="text-3xl font-black tracking-tight text-gradient-brand">RikuAI</h1>
          <p className="text-sm text-muted-custom mt-1">{t("auth_tagline")}</p>
        </div>


        <div className="rounded-2xl border border-border/60 gradient-card p-6 shadow-card">
          <div className="flex rounded-xl bg-surface p-1 mb-5">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "signin" ? "bg-primary text-on-accent" : "text-muted-custom"
              }`}>
              {t("auth_tab_signin")}
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "signup" ? "bg-primary text-on-accent" : "text-muted-custom"
              }`}>
              {t("auth_tab_signup")}
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <input
                  type="text"
                  placeholder={t("auth_name_ph")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-surface border border-border/60 px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-custom" />
              <input
                type="email"
                required
                placeholder={t("auth_email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-surface border border-border/60 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-custom" />
              <input
                type="password"
                required
                minLength={6}
                placeholder={t("auth_pass_ph")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-surface border border-border/60 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-on-accent font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? t("auth_signin") : t("auth_signup")}
            </button>
          </form>

          <div className="my-5 flex items-center gap-2">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] font-bold text-muted-custom uppercase tracking-widest">{t("auth_or")}</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-surface border border-border/60 text-foreground font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-raised disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t("auth_google")}
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-custom mt-5">
          {t("auth_terms")}
        </p>
      </div>
    </div>
  );
}
