import { Settings, AiPersonality } from "@/types/finance";
import { useEffect, useState } from "react";
import {
  X, ChevronRight, ChevronLeft, Check, LogOut, Crown, Globe, DollarSign,
  Moon, Sun, Laptop, Lock, Mail, KeyRound, Building2, Plus, Volume2, VolumeX,
  Download, ShieldAlert, Info, HelpCircle, Bell, Sparkles, Wallpaper, Tags,
  UserRound, Trash2, MessageCircleWarning, Bug, Lightbulb, FileText, ScrollText,
} from "lucide-react";
import { ProfileEditor } from "@/components/social/ProfileEditor";
import { UserAvatar } from "@/components/UserAvatar";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsPremium, FREE_ACCESS } from "@/hooks/useIsPremium";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CURRENCY_OPTIONS, LOCALE_OPTIONS, type SupportedLocale, type SupportedCurrency } from "@/lib/format";
import { setLanguage, useT, getLanguage } from "@/lib/i18n";
import { getStoredAppearance, setStoredAppearance, applyAppearance, type Appearance } from "@/lib/appearance";
import { sfxEnabled, setSfxEnabled, sfx } from "@/lib/sfx";
import { Switch } from "@/components/ui/switch";

interface Props {
  settings: Settings;
  onUpdate: (p: Partial<Settings>) => void;
  onClose:  () => void;
}

const PERSONALITIES: { id: AiPersonality; key: string }[] = [
  { id: "direto",    key: "ai_direto" },
  { id: "engracado", key: "ai_engracado" },
  { id: "durao",     key: "ai_durao" },
  { id: "formal",    key: "ai_formal" },
];

const APPEARANCES: { id: Appearance; key: string; icon: typeof Moon }[] = [
  { id: "light", key: "set_appearance_light", icon: Sun },
  { id: "dark",  key: "set_appearance_dark",  icon: Moon },
  { id: "auto",  key: "set_appearance_auto",  icon: Laptop },
];

const APP_VERSION = "1.0.0";

type Screen =
  | "root" | "workspaces" | "profile" | "language" | "currency" | "password"
  | "categories" | "ai_style" | "notifications" | "about" | "help";

export function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const navigate = useNavigate();
  const t = useT();
  const { isPremium, subscriptionActive } = useIsPremium(settings.isPremium);
  const { workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace } = useWorkspace();

  const [screen, setScreen] = useState<Screen>("root");
  const [local, setLocal] = useState(settings);
  const [email, setEmail] = useState<string | null>(null);

  const [incomeCatsRaw,  setIncomeCatsRaw]  = useState(settings.customIncomeCategories.join(", "));
  const [expenseCatsRaw, setExpenseCatsRaw] = useState(settings.customExpenseCategories.join(", "));

  const [appearance, setAppearance] = useState<Appearance>(getStoredAppearance());
  const [lang, setLang] = useState<SupportedLocale>(getLanguage());
  const [curr, setCurr] = useState<SupportedCurrency>("BRL");
  const [country, setCountry] = useState<string>("");

  const [soundsOn, setSoundsOn] = useState(sfxEnabled());
  const [showProfile, setShowProfile] = useState(false);

  const [newWsName, setNewWsName] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? null);
      supabase.from("profiles").select("language, currency, country").eq("id", data.user.id).maybeSingle()
        .then(({ data: p }) => {
          if (p) {
            setLang((p.language as SupportedLocale) || "pt-BR");
            setCurr((p.currency as SupportedCurrency) || "BRL");
            setCountry(p.country || "");
          }
        });
    });
  }, []);

  const persist = (patch: Partial<Settings>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onUpdate(patch);
  };

  const savePrefs = async (nextLang: SupportedLocale, nextCurr: SupportedCurrency, nextCountry: string) => {
    setLang(nextLang); setCurr(nextCurr); setCountry(nextCountry);
    setLanguage(nextLang, nextCurr);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").update({ language: nextLang, currency: nextCurr, country: nextCountry }).eq("id", data.user.id);
    }
  };

  const dedupe = (s: string, label: string) => {
    const raw = s.split(",").map((x) => x.trim()).filter(Boolean);
    const seen = new Map<string, string>();
    const ignored: string[] = [];
    for (const item of raw) {
      const key = item.toLowerCase();
      if (seen.has(key)) ignored.push(item);
      else seen.set(key, item);
    }
    if (ignored.length > 0) {
      toast.warning(t("set_dup_cats", { label }), { description: ignored.join(", ") });
    }
    return Array.from(seen.values());
  };

  const commitCategories = () => {
    persist({
      customIncomeCategories:  dedupe(incomeCatsRaw,  t("set_income_label")),
      customExpenseCategories: dedupe(expenseCatsRaw, t("set_expense_label")),
    });
    toast.success(t("set_saved"));
  };

  const handleSignOut = async () => {
    if (!window.confirm(t("set_confirm_logout"))) return;
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const handleChangePassword = async () => {
    if (newPassword.trim().length < 6) {
      toast.error(t("set_password_too_short"));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(t("set_password_update_failed"), { description: error.message });
      return;
    }
    setNewPassword("");
    toast.success(t("set_password_updated"));
    setScreen("root");
  };

  const handleExportData = () => {
    try {
      const raw = localStorage.getItem("finance_data_v4");
      const payload = raw ? JSON.parse(raw) : { settings: local };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rikuai-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("set_export_done"));
    } catch {
      toast.error(t("set_password_update_failed"));
    }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    await createWorkspace(newWsName.trim());
    toast.success(t("ws_created_toast", { name: newWsName.trim() }));
    setNewWsName("");
    setCreatingWs(false);
  };

  const toggleSounds = (on: boolean) => {
    setSoundsOn(on);
    setSfxEnabled(on);
    if (on) sfx("tap");
  };

  const handleClose = () => {
    onClose();
  };

  const header = (title: string, showBack: boolean) => (
    <div className="flex items-center justify-between px-5 py-4 max-w-md mx-auto w-full">
      {showBack ? (
        <button onClick={() => setScreen("root")} className="flex items-center gap-1 -ml-2 p-2 rounded-xl press hover:bg-surface text-primary">
          <ChevronLeft className="w-5 h-5" />
        </button>
      ) : <div className="w-9" />}
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <button onClick={showBack ? () => setScreen("root") : handleClose} className="p-2 rounded-xl press hover:bg-surface">
        <X className="w-5 h-5 text-muted-custom" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col animate-slide-up">
      <div className="shrink-0 border-b border-border/60 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {screen === "root"          && header(t("set_title"), false)}
        {screen === "workspaces"    && header(t("set_workspaces"), true)}
        {screen === "language"      && header(t("language"), true)}
        {screen === "currency"      && header(t("currency"), true)}
        {screen === "password"      && header(t("set_change_password"), true)}
        {screen === "categories"    && header(t("set_categories_section"), true)}
        {screen === "ai_style"      && header(t("set_ai_style"), true)}
        {screen === "notifications" && header(t("set_sec_notifications"), true)}
        {screen === "about"         && header(t("set_sec_about"), true)}
        {screen === "help"          && header(t("set_help"), true)}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-md mx-auto w-full px-5 pt-4 space-y-6">

          {screen === "root" && (
            <>
              {/* Premium banner */}
              <button
                onClick={() => navigate("/premium")}
                className="w-full text-left rounded-2xl p-4 border press transition-all"
                style={{
                  background: isPremium
                    ? "linear-gradient(135deg, hsl(var(--primary) / 0.22), hsl(var(--primary) / 0.06))"
                    : "linear-gradient(135deg, hsl(38 92% 55% / 0.18), hsl(var(--surface)))",
                  borderColor: isPremium ? "hsl(var(--primary) / 0.5)" : "hsl(38 92% 55% / 0.35)",
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-5 h-5 shrink-0" style={{ color: isPremium ? "hsl(var(--primary))" : "hsl(var(--warning))" }} />
                    <div>
                      <p className="text-sm font-black text-foreground">
                        {isPremium ? t("set_premium_active") : t("set_premium_cta")}
                      </p>
                      <p className="text-[11px] text-muted-custom mt-0.5">
                        {subscriptionActive ? t("set_premium_sub_active") : FREE_ACCESS ? t("set_premium_free") : t("set_premium_locked")}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-custom shrink-0" />
                </div>
              </button>

              {/* 1. Profile */}
              <Section title={t("set_sec_profile")}>
                <Group>
                  <button onClick={() => setShowProfile(true)} className="w-full flex items-center gap-3 px-4 py-3.5 press hover:bg-surface-raised text-left">
                    <UserAvatar size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{local.userName || t("set_your_name")}</p>
                      <p className="text-xs text-muted-custom truncate">{email ?? t("set_email_unavailable")}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-custom shrink-0" />
                  </button>
                  <Row icon={Building2} label={t("set_workspaces")} value={activeWorkspace?.name} onClick={() => setScreen("workspaces")} />
                </Group>
              </Section>

              {/* 2. Preferences */}
              <Section title={t("set_sec_preferences")}>
                <Group>
                  <Row icon={Globe} label={t("language")} value={LOCALE_OPTIONS.find((l) => l.code === lang)?.label} onClick={() => setScreen("language")} />
                  <Row icon={DollarSign} label={t("currency")} value={curr} onClick={() => setScreen("currency")} />
                </Group>

                <SubLabel>{t("set_appearance")}</SubLabel>
                <div className="grid grid-cols-3 gap-2">
                  {APPEARANCES.map((a) => {
                    const Icon = a.icon;
                    const isActive = appearance === a.id;
                    return (
                      <button key={a.id} type="button" onClick={() => { setAppearance(a.id); applyAppearance(a.id); setStoredAppearance(a.id); }}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border press transition-all ${
                          isActive ? "bg-primary/15 border-primary/60 text-foreground" : "bg-surface border-border text-muted-custom hover:border-primary/30"
                        }`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold">{t(a.key)}</span>
                      </button>
                    );
                  })}
                </div>

                <SubLabel>{t("set_finance_section")}</SubLabel>
                <Group>
                  <RowInput label={t("set_your_name")} value={local.userName}
                    onChange={(v) => persist({ userName: v })} />
                  <RowInputNumber label={t("set_expected_income")} value={local.expectedIncome}
                    onChange={(v) => persist({ expectedIncome: v })} />
                  <RowInputNumber label={t("set_min_balance")} value={local.minBalanceAlert}
                    onChange={(v) => persist({ minBalanceAlert: v })} />
                  <RowInputNumber label={t("set_month_start")} value={local.monthStartDay}
                    onChange={(v) => persist({ monthStartDay: Math.min(28, Math.max(1, Math.round(v))) })} />
                </Group>

                <Group>
                  <Row icon={Tags} label={t("set_categories_section")} onClick={() => setScreen("categories")} />
                  <Row icon={Sparkles} label={t("set_ai_section")}
                    value={t(PERSONALITIES.find((p) => p.id === local.aiPersonality)?.key ?? "")}
                    onClick={() => setScreen("ai_style")} />
                </Group>

                <Group>
                  <ToggleRow icon={Wallpaper} label={t("set_live_wallpaper")} hint={t("set_live_wallpaper_hint")}
                    checked={local.liveWallpaper !== false} onChange={(v) => persist({ liveWallpaper: v })} />
                </Group>
              </Section>

              {/* 3. Security */}
              <Section title={t("set_sec_security")}>
                <Group>
                  <Row icon={KeyRound} label={t("set_change_password")} onClick={() => setScreen("password")} />
                  <Row icon={LogOut} label={t("set_logout")} onClick={handleSignOut} />
                  <Row icon={ShieldAlert} label={t("set_delete_account")} destructive
                    onClick={() => toast(t("set_delete_warning"))} />
                </Group>
              </Section>

              {/* 4. Data & Privacy */}
              <Section title={t("set_sec_data")}>
                <p className="text-[11px] text-muted-custom leading-relaxed px-1 -mt-1 mb-2">{t("set_data_export_hint")}</p>
                <Group>
                  <Row icon={Download} label={t("set_export_data")} onClick={handleExportData} />
                  <Row icon={Trash2} label={t("set_delete_account")} destructive
                    onClick={() => toast(t("set_delete_warning"))} />
                </Group>
              </Section>

              {/* 5. Notifications */}
              <Section title={t("set_sec_notifications")}>
                <Group>
                  <ToggleRow icon={Bell} label={t("set_notif_bills")}
                    checked={local.notifyBills !== false} onChange={(v) => persist({ notifyBills: v })} />
                  <ToggleRow icon={Bell} label={t("set_notif_dreams")}
                    checked={local.notifyDreams !== false} onChange={(v) => persist({ notifyDreams: v })} />
                  <ToggleRow icon={Bell} label={t("set_notif_community")}
                    checked={local.notifyGoals !== false} onChange={(v) => persist({ notifyGoals: v })} />
                  <ToggleRow icon={Bell} label={t("set_notif_system")}
                    checked={local.notifySystem !== false} onChange={(v) => persist({ notifySystem: v })} />
                </Group>
              </Section>

              {/* 6. Sounds */}
              <Section title={t("set_sec_sounds")}>
                <Group>
                  <ToggleRow icon={soundsOn ? Volume2 : VolumeX} label={t("set_sounds")} hint={t("set_sounds_hint")}
                    checked={soundsOn} onChange={toggleSounds} />
                </Group>
              </Section>

              {/* 7. About */}
              <Section title={t("set_sec_about")}>
                <Group>
                  <Row icon={Info} label={t("set_sec_about")} onClick={() => setScreen("about")} />
                </Group>
              </Section>

              {/* 8. Help */}
              <Section title={t("set_help")}>
                <Group>
                  <Row icon={HelpCircle} label={t("set_help")} onClick={() => setScreen("help")} />
                </Group>
              </Section>

              <p className="text-center text-[10px] text-foreground-subtle pt-2 pb-1">
                {t("set_about_app_name")} · {t("set_about_version", { version: APP_VERSION })}
              </p>
            </>
          )}

          {screen === "workspaces" && (
            <Section title={t("set_workspaces")}>
              <p className="text-[11px] text-muted-custom leading-relaxed px-1 -mt-1 mb-2">{t("set_workspaces_hint")}</p>
              <Group>
                {workspaces.map((w) => (
                  <button key={w.id}
                    onClick={() => setActiveWorkspaceId(w.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 press hover:bg-surface-raised text-left">
                    <span className="text-sm font-semibold text-foreground">{w.name}</span>
                    {w.id === activeWorkspace?.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </Group>
              <Group>
                {creatingWs ? (
                  <div className="p-3 space-y-2">
                    <input autoFocus value={newWsName} onChange={(e) => setNewWsName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                      placeholder={t("ws_name_ph")}
                      className="w-full rounded-xl bg-background border border-border px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary" />
                    <div className="flex gap-2">
                      <button onClick={handleCreateWorkspace} className="flex-1 py-2 rounded-xl bg-primary text-on-accent text-xs font-bold press">{t("ws_create")}</button>
                      <button onClick={() => setCreatingWs(false)} className="flex-1 py-2 rounded-xl border border-border text-xs font-bold press">{t("ws_cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setCreatingWs(true)} className="w-full flex items-center gap-2 px-4 py-3.5 text-sm text-primary font-bold press hover:bg-surface-raised">
                    <Plus className="w-4 h-4" /> {t("ws_new")}
                  </button>
                )}
              </Group>
            </Section>
          )}

          {screen === "language" && (
            <Group>
              {LOCALE_OPTIONS.map((l) => (
                <button key={l.code} onClick={() => savePrefs(l.code, curr, country)}
                  className="w-full flex items-center justify-between px-4 py-3.5 press hover:bg-surface-raised text-left">
                  <span className="text-sm font-semibold text-foreground">{l.label}</span>
                  {l.code === lang && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </Group>
          )}

          {screen === "currency" && (
            <Group>
              {CURRENCY_OPTIONS.filter((c) => ["BRL", "USD", "EUR"].includes(c.code)).map((c) => (
                <button key={c.code} onClick={() => savePrefs(lang, c.code, country)}
                  className="w-full flex items-center justify-between px-4 py-3.5 press hover:bg-surface-raised text-left">
                  <span className="text-sm font-semibold text-foreground">{c.symbol} — {c.label} ({c.code})</span>
                  {c.code === curr && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </Group>
          )}

          {screen === "password" && (
            <Section title={t("set_change_password")}>
              <p className="text-[11px] text-muted-custom leading-relaxed px-1 -mt-1 mb-2">{t("set_change_password_hint")}</p>
              <Group>
                <div className="px-4 py-3.5">
                  <label className="text-xs font-bold text-muted-custom block mb-1.5">{t("set_new_password")}</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("set_new_password_ph")}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary" />
                </div>
              </Group>
              <button onClick={handleChangePassword} disabled={savingPassword}
                className="w-full py-3.5 rounded-2xl bg-primary text-on-accent font-bold text-sm press disabled:opacity-60">
                {t("save")}
              </button>
            </Section>
          )}

          {screen === "categories" && (
            <Section title={t("set_categories_section")}>
              <Field label={t("set_income_cats")} hint={t("set_income_cats_hint")}>
                <input type="text" value={incomeCatsRaw} onChange={(e) => setIncomeCatsRaw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
              </Field>
              <Field label={t("set_expense_cats")} hint={t("set_expense_cats_hint")}>
                <input type="text" value={expenseCatsRaw} onChange={(e) => setExpenseCatsRaw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
              </Field>
              <button onClick={commitCategories}
                className="w-full py-3.5 rounded-2xl bg-primary text-on-accent font-bold text-sm press">
                {t("save")}
              </button>
            </Section>
          )}

          {screen === "ai_style" && (
            <Section title={t("set_ai_style")}>
              <p className="text-[11px] text-muted-custom leading-relaxed px-1 -mt-1 mb-2">{t("set_ai_style_hint")}</p>
              <div className="grid grid-cols-2 gap-2">
                {PERSONALITIES.map((p) => (
                  <button key={p.id} type="button" onClick={() => persist({ aiPersonality: p.id })}
                    className={`text-left px-3 py-2.5 rounded-xl border press transition-all ${
                      local.aiPersonality === p.id
                        ? "bg-primary/15 border-primary/60 text-foreground"
                        : "bg-surface border-border text-muted-custom hover:border-primary/30"
                    }`}>
                    <p className="text-xs font-bold">{t(p.key)}</p>
                    <p className="text-[10px] opacity-70">{t(`${p.key}_desc`)}</p>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {screen === "notifications" && null}

          {screen === "about" && (
            <Section title={t("set_sec_about")}>
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-on-accent font-black text-xl">R</div>
                <p className="text-base font-black text-foreground">{t("set_about_app_name")}</p>
                <p className="text-xs text-muted-custom">{t("set_about_tagline")}</p>
                <p className="text-[11px] text-foreground-subtle">{t("set_about_version", { version: APP_VERSION })}</p>
              </div>
              <Group>
                <Row icon={FileText} label={t("set_terms")} onClick={() => window.open("/terms", "_blank")} />
                <Row icon={ScrollText} label={t("set_privacy_policy")} onClick={() => window.open("/privacy", "_blank")} />
              </Group>
            </Section>
          )}

          {screen === "help" && (
            <Section title={t("set_help")}>
              <Group>
                <Row icon={HelpCircle} label={t("set_faq")} onClick={() => window.open("mailto:suporte@rikuai.app?subject=FAQ", "_blank")} />
                <Row icon={Mail} label={t("set_contact")} onClick={() => window.open("mailto:suporte@rikuai.app?subject=Suporte", "_blank")} />
                <Row icon={Bug} label={t("set_bug")} onClick={() => window.open("mailto:suporte@rikuai.app?subject=Bug", "_blank")} />
                <Row icon={Lightbulb} label={t("set_feature")} onClick={() => window.open("mailto:suporte@rikuai.app?subject=Sugest%C3%A3o", "_blank")} />
                <Row icon={MessageCircleWarning} label={t("set_help_feedback")} onClick={() => window.open("mailto:suporte@rikuai.app?subject=Feedback", "_blank")} />
              </Group>
            </Section>
          )}

        </div>
      </div>

      {showProfile && <ProfileEditor onClose={() => setShowProfile(false)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold text-muted-custom uppercase tracking-widest px-1">{title}</h3>
      {children}
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold text-muted-custom uppercase tracking-widest px-1 pt-1">{children}</p>;
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-surface border border-border/60 divide-y divide-border/60">
      {children}
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick, destructive }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 press hover:bg-surface-raised text-left">
      <Icon className={`w-4.5 h-4.5 shrink-0 ${destructive ? "text-destructive" : "text-primary"}`} />
      <span className={`flex-1 text-sm font-semibold truncate ${destructive ? "text-destructive" : "text-foreground"}`}>{label}</span>
      {value && <span className="text-xs text-muted-custom truncate max-w-[40%]">{value}</span>}
      <ChevronRight className="w-4 h-4 text-muted-custom shrink-0" />
    </button>
  );
}

function ToggleRow({ icon: Icon, label, hint, checked, onChange }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3.5">
      <Icon className="w-4.5 h-4.5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        {hint && <p className="text-[11px] text-muted-custom truncate">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RowInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-sm font-semibold text-foreground shrink-0 w-1/2 truncate">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-right text-sm text-foreground focus:outline-none" />
    </div>
  );
}

function RowInputNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-sm font-semibold text-foreground shrink-0 w-1/2 truncate">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 min-w-0 bg-transparent text-right text-sm text-foreground focus:outline-none" />
    </div>
  );
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-foreground-subtle mt-1">{hint}</p>}
    </div>
  );
}
