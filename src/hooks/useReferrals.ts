import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearPendingReferral, getPendingReferral } from "@/lib/referral";

export interface ReferralStats {
  signups: number;
  conversions: number;
  reward_days: number;
  code: string | null;
  premium_until: string | null;
}

/** Resgata o código pendente (se houver) — chamado ao final do onboarding. */
export async function redeemPendingReferral(): Promise<{ days: number } | null> {
  const code = getPendingReferral();
  if (!code) return null;
  const { data, error } = await (supabase.rpc as any)("redeem_referral", { _code: code });
  clearPendingReferral();
  const res = data as { ok?: boolean; days?: number } | null;
  if (error || !res?.ok) return null;
  return { days: res.days ?? 7 };
}

export function useReferrals() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.rpc as any)("my_referral_stats");
    const row = Array.isArray(data) ? data[0] : data;
    setStats(
      row
        ? {
            signups: Number(row.signups ?? 0),
            conversions: Number(row.conversions ?? 0),
            reward_days: Number(row.reward_days ?? 0),
            code: row.code ?? null,
            premium_until: row.premium_until ?? null,
          }
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}
