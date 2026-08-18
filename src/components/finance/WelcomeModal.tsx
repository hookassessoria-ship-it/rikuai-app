import { Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n";

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const items = [
    "welcome_item_advisor",
    "welcome_item_cards",
    "welcome_item_types",
    "welcome_item_recurrence",
    "welcome_item_plan",
    "welcome_item_alerts",
    "welcome_item_health",
  ];
  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-md flex items-center justify-center p-5 animate-slide-up">
      <div className="rounded-3xl p-6 max-w-sm w-full border border-primary/40 gradient-card shadow-glow-purple">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/50 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-overlay">
            <X className="w-4 h-4 text-muted-custom" />
          </button>
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">{t("welcome_title")}</h2>
        <p className="text-sm text-muted-custom mb-4">{t("welcome_subtitle")}</p>
        <ul className="space-y-2 text-xs text-foreground mb-5">
          {items.map((key) => (
            <li key={key} dangerouslySetInnerHTML={{ __html: t(key) }} />
          ))}
        </ul>
        <button onClick={onClose}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-glow-purple">
          {t("welcome_cta")}
        </button>
      </div>
    </div>
  );
}
