import { useEffect, useRef, useState } from "react";
import { X, Loader2, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useSocial, signedAvatar, USERNAME_RE } from "@/hooks/useSocial";

export function ProfileEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const s = useSocial();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!s.me) return;
    setName(s.me.display_name ?? "");
    setUsername(s.me.username ?? "");
    setAvatarPath(s.me.avatar_url ?? null);
    signedAvatar(s.me.avatar_url).then(setPreview);
  }, [s.me]);

  const usernameLocked = s.me?.username_changed === true;

  const pick = async (file: File) => {
    setUploading(true);
    const path = await s.uploadAvatar(file);
    if (!path) toast.error(t("dreams_upload_failed"));
    else {
      setAvatarPath(path);
      setPreview(await signedAvatar(path));
    }
    setUploading(false);
  };

  const save = async () => {
    const nextUsername = username.trim();
    if (!usernameLocked && nextUsername !== (s.me?.username ?? "")) {
      if (!USERNAME_RE.test(nextUsername)) { toast.error(t("social_username_invalid")); return; }
      const ok = await s.isUsernameAvailable(nextUsername);
      if (!ok) { toast.error(t("social_username_taken", { username: nextUsername })); return; }
    }
    setSaving(true);
    const res = await s.updateProfile({
      display_name: name.trim() || null as any,
      avatar_url: avatarPath,
      ...(usernameLocked || nextUsername === (s.me?.username ?? "") ? {} : { username: nextUsername }),
    });
    setSaving(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(t("social_saved"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex flex-col animate-slide-up">
      <div className="flex items-center justify-between p-5 border-b border-border max-w-md mx-auto w-full">
        <h2 className="text-lg font-bold text-foreground">{t("social_edit_profile")}</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface"><X className="w-5 h-5 text-muted-custom" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden border border-border bg-surface flex items-center justify-center">
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
              : preview ? <img src={preview} alt="" className="w-full h-full object-cover" />
              : <Camera className="w-6 h-6 text-muted-custom" />}
          </button>
          <span className="text-[11px] text-muted-custom">{t("social_photo")}</span>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("social_display_name")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground" />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-custom uppercase tracking-widest block mb-1.5">{t("social_username")}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-custom">@</span>
            <input value={username} disabled={usernameLocked}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              className="w-full pl-8 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground disabled:opacity-60" />
          </div>
          <p className="text-[10px] text-foreground-subtle mt-1">
            {usernameLocked ? t("social_username_locked") : t("social_username_hint")}
          </p>
        </div>

        <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-surface border border-border">
          <div>
            <p className="text-sm font-bold text-foreground">{t("social_share_toggle")}</p>
            <p className="text-[10px] text-muted-custom mt-0.5">{t("social_share_hint")}</p>
          </div>
          <input type="checkbox" className="w-5 h-5 accent-primary"
            checked={s.me?.share_achievements ?? true}
            onChange={(e) => s.updateProfile({ share_achievements: e.target.checked })} />
        </label>

        <p className="text-[10px] text-muted-custom leading-snug">{t("social_privacy_note")}</p>

        <button onClick={save} disabled={saving}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-glow-purple disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {t("save")}
        </button>
      </div>
    </div>
  );
}
