// Hook centralizado de "usuário é premium?".
// Combina duas fontes de verdade:
//  1) Assinatura real (Stripe → tabela subscriptions), via useSubscription.
//  2) Override local em settings.isPremium (usado como "Simular Premium" em dev
//     e também para não perder acesso enquanto os webhooks propagam).
//
// TODOS os componentes que gateiam features Premium devem consumir este hook —
// nunca ler settings.isPremium diretamente.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";

/** Fase de lançamento: libera todos os recursos Premium para todos. */
export const FREE_ACCESS = true;

export function useIsPremium(localOverride?: boolean) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const { isPremium: subscriptionActive, loading } = useSubscription(userId);

  // Premium de bônus (dias ganhos por indicação) — lido do banco via RPC.
  const [bonusPremium, setBonusPremium] = useState(false);
  useEffect(() => {
    if (!userId) { setBonusPremium(false); return; }
    let mounted = true;
    (supabase.rpc as any)("my_referral_stats").then(({ data }: { data: any }) => {
      const row = Array.isArray(data) ? data[0] : data;
      const until = row?.premium_until ? new Date(row.premium_until) : null;
      if (mounted) setBonusPremium(!!until && until > new Date());
    });
    return () => { mounted = false; };
  }, [userId]);
  // ⚠️ ACESSO LIBERADO TEMPORARIAMENTE (fase de lançamento):
  // enquanto FREE_ACCESS estiver true, todos os recursos Premium ficam abertos
  // para qualquer conta. Para voltar a cobrar, basta trocar para false — toda a
  // lógica real de assinatura continua intacta abaixo.
  const realPremium = subscriptionActive || bonusPremium;
  const isPremium = FREE_ACCESS || realPremium;

  return { isPremium, realPremium, subscriptionActive, loading, userId };
}
