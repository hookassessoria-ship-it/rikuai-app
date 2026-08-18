import { useState } from "react";
import { Download, X, Sparkles } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useT } from "@/lib/i18n";

interface Props {
  onImport: () => void;
  onDismiss: () => void;
}

export function ImportLegacyModal({ onImport, onDismiss }: Props) {
  const { activeWorkspace } = useWorkspace();
  const t = useT();
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="w-full max-w-sm rounded-2xl gradient-card border border-border/60 p-6 shadow-card">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-lg font-black">{t("import_found_title")}</h2>
        </div>
        <p className="text-sm text-muted-custom mb-5 leading-relaxed">
          {(() => {
            const [before, after] = t("import_found_desc", { workspace: "\u0000" }).split("\u0000");
            return (
              <>
                {before}
                <b className="text-foreground">{activeWorkspace?.name}</b>
                {after}
              </>
            );
          })()}
        </p>
        <div className="flex flex-col gap-2">
          <button
            disabled={busy}
            onClick={() => { setBusy(true); onImport(); }}
            className="w-full py-3 rounded-xl bg-primary text-on-accent font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Download className="w-4 h-4" /> {t("import_button")}
          </button>
          <button
            disabled={busy}
            onClick={onDismiss}
            className="w-full py-3 rounded-xl border border-border/60 text-muted-custom font-bold text-sm hover:bg-surface">
            {t("import_start_fresh")}
          </button>
        </div>
        <p className="text-[10px] text-foreground-subtle mt-4 text-center">
          {t("import_once_note")}
        </p>
      </div>
    </div>
  );
}
