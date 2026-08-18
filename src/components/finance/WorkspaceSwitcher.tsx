import { useState } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, createWorkspace } = useWorkspace();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createWorkspace(name.trim());
    toast.success(t("ws_created_toast", { name }));
    setName("");
    setCreating(false);
    setOpen(false);
  };

  if (!activeWorkspace) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface border border-border/60 text-[11px] font-bold uppercase tracking-widest hover:bg-surface-raised">
        {activeWorkspace.name}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setCreating(false); }} />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-surface border border-border/60 shadow-card z-50 overflow-hidden">
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => { setActiveWorkspaceId(w.id); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-surface-raised text-left">
                <span className="font-semibold">{w.name}</span>
                {w.id === activeWorkspace.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border/60">
              {creating ? (
                <div className="p-2 space-y-2">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder={t("ws_name_ph")}
                    className="w-full rounded-lg bg-background border border-border/60 px-2.5 py-2 text-xs focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCreate} className="flex-1 py-1.5 rounded-lg bg-primary text-on-accent text-[11px] font-bold">{t("ws_create")}</button>
                    <button onClick={() => setCreating(false)} className="flex-1 py-1.5 rounded-lg border border-border/60 text-[11px] font-bold">{t("ws_cancel")}</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary hover:bg-primary/10 font-bold">
                  <Plus className="w-4 h-4" /> {t("ws_new")}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
