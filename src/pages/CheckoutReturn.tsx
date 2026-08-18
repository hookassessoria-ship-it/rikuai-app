import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const t = useT();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="p-8 max-w-md w-full text-center">
        {sessionId ? (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t("checkout_success_title")}</h1>
            <p className="text-muted-foreground mb-6">
              {t("checkout_success_desc")}
            </p>
            <Button asChild className="w-full">
              <Link to="/premium">{t("checkout_view_sub")}</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-2">{t("checkout_not_found_title")}</h1>
            <Button asChild className="w-full">
              <Link to="/">{t("checkout_back")}</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
