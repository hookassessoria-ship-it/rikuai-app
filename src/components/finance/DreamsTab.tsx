import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Star, Trash2, Sparkles, Image as ImageIcon, TrendingDown, Loader2, Crown, X, Lock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDreams, type Dream } from "@/hooks/useDreams";
import { useIsPremium } from "@/hooks/useIsPremium";
import { useT } from "@/lib/i18n";
import { formatMoney, formatDate } from "@/lib/format";
import { sfx } from "@/lib/sfx";

export interface DreamsTabProps {
  /** Registra o aporte como despesa real (categoria "Sonhos") para debitar o saldo. */
  onSpend?: (amount: number, dreamTitle: string) => void;
}

export function DreamsTab({ onSpend }: DreamsTabProps = {}) {
  const { isPremium } = useIsPremium();
  const t = useT();
  const navigate = useNavigate();

  if (!isPremium) {
    return (
      <div className="mt-6 rounded-3xl p-8 border border-border/60 gradient-card text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-black text-foreground">{t("dreams_title")}</h2>
        <p className="text-sm text-muted-custom mt-2 leading-relaxed">{t("dreams_locked_cta")}</p>
        <button
          onClick={() => navigate("/premium")}
          className="mt-5 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-glow-purple">
          <Crown className="w-4 h-4" /> {t("unlock_premium")}
        </button>
      </div>
    );
  }

  return <DreamsInner onSpend={onSpend} />;
}

function DreamsInner({ onSpend }: DreamsTabProps) {
  const t = useT();
  const d = useDreams();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Dream | null>(null);

  const sorted = useMemo(
    () => [...d.dreams].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0)),
    [d.dreams]
  );

  if (d.loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-foreground">{t("dreams_title")}</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
          <Plus className="w-3.5 h-3.5" /> {t("dreams_new")}
        </button>
      </div>

      {sorted.length === 0 && (
        <div className="rounded-2xl p-8 border border-border/60 gradient-card text-center">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-2 opacity-70" />
          <p className="text-sm text-muted-custom">{t("dreams_empty")}</p>
        </div>
      )}

      {sorted.map((dream) => (
        <DreamCard key={dream.id} dream={dream} d={d} onEdit={() => setEditing(dream)} />
      ))}

      {showNew && <NewDreamModal onClose={() => setShowNew(false)} onCreate={d.createDream} workspaceLoading={d.workspaceLoading} />}
      {editing && <ContributionModal dream={editing} onClose={() => setEditing(null)} onAdd={d.addContribution} onSpend={onSpend} />}
    </div>
  );
}

function DreamCard({ dream, d, onEdit }: { dream: Dream; d: ReturnType<typeof useDreams>; onEdit: () => void }) {
  const t = useT();
  const saved = Number(dream.saved_amount);
  const target = Number(dream.target_amount);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const remaining = Math.max(0, target - saved);
  const months = d.projectMonths(dream);
  const pace = d.monthlyPace(dream.id);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [cut, setCut] = useState<number>(0);

  // Load signed URL for private bucket image
  useMemo(() => {
    if (!dream.image_url) { setSignedUrl(null); return; }
    supabase.storage.from("dream-images").createSignedUrl(dream.image_url, 3600)
      .then(({ data }) => setSignedUrl(data?.signedUrl ?? null));
  }, [dream.image_url]);

  const simMonths = pace > 0 && cut > 0 && months !== null
    ? Math.max(0, months - Math.ceil(remaining / (pace + cut)))
    : 0;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 gradient-card shadow-card">
      {signedUrl && (
        <div className="relative h-32 w-full bg-surface">
          <img src={signedUrl} alt={dream.title} className="w-full h-full object-cover" />
          {dream.priority && (
            <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-black flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> {t("dreams_priority")}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!signedUrl && dream.priority && <Star className="w-4 h-4 text-primary fill-primary" />}
              <h3 className="text-base font-black text-foreground truncate">{dream.title}</h3>
            </div>
            {dream.target_date && (
              <p className="text-[11px] text-muted-custom mt-0.5">
                {t("dreams_deadline_short")}: {formatDate(dream.target_date)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => d.togglePriority(dream.id, !dream.priority)}
              className="p-1.5 rounded-lg hover:bg-surface"
              title={t("dreams_priority")}>
              <Star className={`w-4 h-4 ${dream.priority ? "text-primary fill-primary" : "text-muted-custom"}`} />
            </button>
            <button
              onClick={() => { if (confirm(t("dreams_confirm_delete"))) d.deleteDream(dream.id); }}
              className="p-1.5 rounded-lg hover:bg-surface">
              <Trash2 className="w-4 h-4 text-muted-custom" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs font-bold text-muted-custom uppercase tracking-wide">{t("dreams_progress")}</span>
            <span className="text-sm font-black text-foreground">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${pct}%`, boxShadow: pct > 0 ? "0 0 10px hsl(var(--primary) / 0.6)" : undefined }}
            />
          </div>
          <p className="text-[11px] text-muted-custom mt-1.5">
            {t("dreams_saved_of", { saved: formatMoney(saved), target: formatMoney(target) })}
          </p>
        </div>

        {/* Projection */}
        <div className="mt-3 rounded-xl bg-surface/60 border border-border/40 p-3">
          {months === null ? (
            <p className="text-[11px] text-muted-custom">{t("dreams_projection_no_data")}</p>
          ) : months === 0 ? (
            <p className="text-xs font-bold text-good">{t("dreams_milestone_100")}</p>
          ) : (
            <p className="text-xs text-foreground">
              📈 {t("dreams_projection", { months })}
            </p>
          )}
        </div>

        {/* Simulator */}
        {months !== null && months > 0 && (
          <div className="mt-2 rounded-xl bg-surface/60 border border-border/40 p-3">
            <label className="text-[10px] font-bold text-muted-custom uppercase tracking-wide flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> {t("dreams_simulator")}
            </label>
            <input
              type="number"
              placeholder={t("dreams_simulator_input")}
              value={cut || ""}
              onChange={(e) => setCut(parseFloat(e.target.value) || 0)}
              className="w-full mt-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground"
            />
            {cut > 0 && (
              <p className="text-[11px] text-good mt-1.5">
                {t("dreams_simulator_hint", { amount: formatMoney(cut), months: simMonths })}
              </p>
            )}
          </div>
        )}

        {/* Milestones celebration */}
        {dream.milestones_reached.length > 0 && (
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {dream.milestones_reached.map((m) => (
              <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                {t(`dreams_milestone_${m}`)}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onEdit}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary/15 text-primary font-bold text-xs flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {t("dreams_add_contribution")}
        </button>
      </div>
    </div>
  );
}

function NewDreamModal({ onClose, onCreate, workspaceLoading }: {
  onClose: () => void;
  onCreate: ReturnType<typeof useDreams>["createDream"];
  workspaceLoading: boolean;
}) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(0);
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("dream-images").upload(path, file, { upsert: true });
      if (error) throw error;
      setImagePath(path);
      const { data: signed } = await supabase.storage.from("dream-images").createSignedUrl(path, 3600);
      setPreview(signed?.signedUrl ?? null);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (saving) return;
    if (!title.trim() || target <= 0) { toast.warning(t("dreams_fill_fields")); return; }
    if (workspaceLoading) { toast.warning(t("loading")); return; }
    setSaving(true);
    try {
      const { dream, error } = await onCreate({
        title: title.trim(),
        target_amount: target,
        target_date: date || null,
        image_url: imagePath,
        priority,
      });
      if (error || !dream) {
        toast.error(error ?? t("dreams_fill_fields"));
        return;
      }
      sfx("success");
      toast.success(t("dreams_created"));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || workspaceLoading || uploading;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-slide-up">
      <div className="flex items-center justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-border max-w-md mx-auto w-full shrink-0">
        <h2 className="text-lg font-bold text-foreground">{t("dreams_new")}</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(6rem,env(safe-area-inset-bottom))] space-y-4 max-w-md mx-auto w-full">
        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("dreams_name")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("dreams_target")}</label>
          <input type="number" value={target || ""} onChange={(e) => setTarget(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">
            {t("dreams_deadline")} <span className="opacity-60">({t("optional")})</span>
          </label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
        </div>
        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("dreams_image")}</label>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border p-4 flex flex-col items-center gap-2 hover:border-primary/50">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
              : preview ? <img src={preview} alt="" className="w-full h-32 object-cover rounded-lg" />
              : <><ImageIcon className="w-6 h-6 text-muted-custom" /><span className="text-xs text-muted-custom">{t("dreams_image_hint")}</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        <label className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border cursor-pointer">
          <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
          <span className="text-sm text-foreground">{t("dreams_priority_on")}</span>
        </label>

      </div>
      <div className="p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-border max-w-md mx-auto w-full shrink-0 bg-background/95">
        <button onClick={submit} disabled={disabled}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-glow-purple disabled:opacity-50 flex items-center justify-center gap-2">
          {(saving || workspaceLoading) && <Loader2 className="w-4 h-4 animate-spin" />}
          {workspaceLoading ? t("loading") : t("save")}
        </button>
      </div>
    </div>
  );
}

function ContributionModal({ dream, onClose, onAdd, onSpend }: {
  dream: Dream;
  onClose: () => void;
  onAdd: ReturnType<typeof useDreams>["addContribution"];
  onSpend?: (amount: number, dreamTitle: string) => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const submittedRef = useRef(false);

  const submit = async () => {
    // Guarda contra reentrância / duplo toque: só um submit por abertura do modal.
    if (saving || submittedRef.current) return;
    if (amount <= 0) return;
    submittedRef.current = true;
    setSaving(true);
    try {
      const res = await onAdd(dream.id, amount);
      if (!res || res.error) {
        toast.error(res?.error ?? t("dreams_fill_fields"));
        submittedRef.current = false;
        return;
      }
      // O aporte é dinheiro que sai do bolso: debita o saldo na hora, uma única vez.
      onSpend?.(amount, dream.title);
      if (res.newlyReached.length) {
        sfx("celebrate");
        res.newlyReached.forEach((m) => toast.success(t(`dreams_milestone_${m}`)));
      } else {
        sfx("success");
        toast.success(t("dreams_contribution_saved"));
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-slide-up">
      <div className="flex items-center justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] border-b border-border max-w-md mx-auto w-full shrink-0">
        <h2 className="text-lg font-bold text-foreground truncate">{dream.title}</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(6rem,env(safe-area-inset-bottom))] space-y-4 max-w-md mx-auto w-full">
        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("dreams_contribution_amount")}</label>
          <input type="number" autoFocus value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground text-2xl font-black" />
        </div>
      </div>
      <div className="p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-border max-w-md mx-auto w-full shrink-0 bg-background/95">
        <button onClick={submit} disabled={saving || amount <= 0}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-glow-purple disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("save")}
        </button>
      </div>
    </div>
  );
}
