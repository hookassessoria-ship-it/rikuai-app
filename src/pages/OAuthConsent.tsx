import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, X, Check } from "lucide-react";
import { useT } from "@/lib/i18n";

type AuthOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function isSameOriginPath(p: string | null): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//");
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError(t("oauth_missing_id"));
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const oauth = (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message ?? String(error));
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message ?? String(error));
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError(t("oauth_no_redirect_url"));
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-5">
        <div className="max-w-md w-full rounded-2xl border border-danger/40 bg-surface p-6">
          <h1 className="text-lg font-bold text-danger mb-2">{t("oauth_load_error_title")}</h1>
          <p className="text-sm text-muted-custom">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? t("oauth_default_client");
  const redirectUri = details?.client?.redirect_uris?.[0] ?? details?.client?.redirect_uri;
  const scopes: string[] = Array.isArray(details?.scopes)
    ? details.scopes
    : typeof details?.scope === "string"
    ? details.scope.split(/\s+/).filter(Boolean)
    : [];

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-3">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-center">
            {t("oauth_connect_title", { client: clientName })}
          </h1>
          <p className="text-sm text-muted-custom mt-2 text-center">
            {t("oauth_connect_desc", { client: clientName })}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 gradient-card p-5 shadow-card space-y-4">
          {redirectUri && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-custom mb-1">
                {t("oauth_redirect_url_label")}
              </div>
              <div className="text-xs text-foreground break-all">{redirectUri}</div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-custom mb-2">
              {t("oauth_permissions_label")}
            </div>
            <ul className="space-y-1.5 text-sm text-foreground">
              <li className="flex gap-2"><span className="text-primary">•</span> {t("oauth_perm_read")}</li>
              <li className="flex gap-2"><span className="text-primary">•</span> {t("oauth_perm_write")}</li>
              {scopes.length > 0 && (
                <li className="flex gap-2 text-muted-custom">
                  <span className="text-primary">•</span> {t("oauth_scope_label", { scopes: scopes.join(", ") })}
                </li>
              )}
            </ul>
            <p className="text-[11px] text-muted-custom mt-3">
              {t("oauth_scope_note")}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => decide(false)}
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-surface border border-border/60 text-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {t("oauth_cancel")}
            </button>
            <button
              onClick={() => decide(true)}
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t("oauth_approve")}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
