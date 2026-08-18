import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export default function Premium() {
  const navigate = useNavigate();
  const t = useT();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const { subscription, isPremium, loading } = useSubscription(user?.id);

  const PREMIUM_FEATURES = [
    t("premium_feature_ai"),
    t("premium_feature_themes"),
    t("premium_feature_history"),
    t("premium_feature_dreams"),
    t("premium_feature_support"),
  ];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email ?? undefined });
      else navigate("/auth");
    });
  }, [navigate]);

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/premium`,
        },
      });
      if (error || !data?.url) throw new Error(error?.message || t("premium_portal_error"));
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpeningPortal(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> {t("premium_back")}
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
            <Sparkles className="h-4 w-4" /> {t("premium_title")}
          </div>
          <h1 className="text-4xl font-bold mb-2">{t("premium_headline")}</h1>
          <p className="text-muted-foreground">{t("premium_monthly_note")}</p>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">{t("premium_loading")}</Card>
        ) : isPremium ? (
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{t("premium_you_are")}</h2>
                <p className="text-sm text-muted-foreground">
                  {subscription?.cancel_at_period_end
                    ? t("premium_active_until", { date: formatDate(subscription.current_period_end!) })
                    : t("premium_active_sub")}
                </p>
              </div>
            </div>
            <Button onClick={openPortal} disabled={openingPortal} variant="outline">
              {openingPortal ? t("premium_opening") : t("premium_manage")}
            </Button>
          </Card>
        ) : showCheckout ? (
          <Card className="p-4">
            <StripeEmbeddedCheckout
              priceId="riku_premium_monthly"
              customerEmail={user.email}
              userId={user.id}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          </Card>
        ) : (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="text-5xl font-bold">R$ 19,90<span className="text-lg text-muted-foreground font-normal">{t("premium_per_month")}</span></div>
            </div>
            <ul className="space-y-3 mb-8">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
              {t("premium_subscribe_now")}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
