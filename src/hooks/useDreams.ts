import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { publishAchievement } from "./useSocial";

export interface Dream {
  id: string;
  workspace_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  image_url: string | null;
  priority: boolean;
  milestones_reached: number[];
  created_at: string;
}

export interface DreamContribution {
  id: string;
  dream_id: string;
  workspace_id: string;
  amount: number;
  contributed_at: string;
  note: string | null;
  created_at: string;
}

const MILESTONES = [25, 50, 75, 100];

export function useDreams() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const wsId = activeWorkspace?.id ?? null;
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [contribs, setContribs] = useState<DreamContribution[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!wsId) { setDreams([]); setContribs([]); setLoading(false); return; }
    // Evita "flash" de spinner em recargas: só mostra loading no primeiro load.
    setLoading((prev) => prev && true);
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("dream_goals").select("*").eq("workspace_id", wsId).order("priority", { ascending: false }).order("created_at"),
      supabase.from("dream_contributions").select("*").eq("workspace_id", wsId).order("contributed_at", { ascending: false }),
    ]);
    setDreams((d ?? []) as any);
    setContribs((c ?? []) as any);
    setLoading(false);
  }, [wsId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createDream = useCallback(async (input: {
    title: string; target_amount: number; target_date?: string | null; image_url?: string | null; priority?: boolean;
  }): Promise<{ dream: Dream | null; error: string | null }> => {
    if (workspaceLoading) return { dream: null, error: "workspace-loading" };
    if (!wsId) return { dream: null, error: "workspace-missing" };
    const { data, error } = await supabase.from("dream_goals").insert({
      workspace_id: wsId,
      title: input.title,
      target_amount: input.target_amount,
      saved_amount: 0,
      target_date: input.target_date ?? null,
      image_url: input.image_url ?? null,
      priority: input.priority ?? false,
      milestones_reached: [],
    }).select("*").maybeSingle();
    if (error || !data) {
      console.error("createDream", error?.message);
      return { dream: null, error: error?.message ?? "insert-failed" };
    }
    // Aparece na hora (otimista) e depois reconcilia com o servidor.
    setDreams((prev) => [data as Dream, ...prev]);
    await refresh();
    return { dream: data as Dream, error: null };
  }, [wsId, workspaceLoading, refresh]);

  const deleteDream = useCallback(async (id: string) => {
    setDreams((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("dream_goals").delete().eq("id", id);
    await refresh();
  }, [refresh]);

  const togglePriority = useCallback(async (id: string, priority: boolean) => {
    setDreams((prev) => prev.map((d) => (d.id === id ? { ...d, priority } : d)));
    await supabase.from("dream_goals").update({ priority }).eq("id", id);
    await refresh();
  }, [refresh]);

  const addContribution = useCallback(async (dreamId: string, amount: number): Promise<{
    newlyReached: number[]; newSaved: number; error: string | null;
  } | null> => {
    if (!wsId) return { newlyReached: [], newSaved: 0, error: "workspace-missing" };
    if (!amount || amount <= 0) return { newlyReached: [], newSaved: 0, error: "invalid-amount" };
    const dream = dreams.find((d) => d.id === dreamId);
    if (!dream) return { newlyReached: [], newSaved: 0, error: "dream-not-found" };
    const newSaved = Number(dream.saved_amount) + amount;
    const pct = dream.target_amount > 0 ? (newSaved / dream.target_amount) * 100 : 0;
    const newMilestones = Array.from(new Set([
      ...dream.milestones_reached,
      ...MILESTONES.filter((m) => pct >= m),
    ]));
    const newlyReached = newMilestones.filter((m) => !dream.milestones_reached.includes(m));

    const { error: insertError } = await supabase.from("dream_contributions").insert({
      dream_id: dreamId, workspace_id: wsId, amount,
    });
    if (insertError) {
      console.error("addContribution insert", insertError.message);
      return { newlyReached: [], newSaved: Number(dream.saved_amount), error: insertError.message };
    }
    // Progresso imediato na UI (sem esperar o refresh).
    setDreams((prev) => prev.map((x) =>
      x.id === dreamId ? { ...x, saved_amount: newSaved, milestones_reached: newMilestones } : x));
    const { error: updateError } = await supabase.from("dream_goals").update({
      saved_amount: newSaved,
      milestones_reached: newMilestones,
    }).eq("id", dreamId);
    if (updateError) console.error("addContribution update", updateError.message);
    // Publica marcos no feed social — apenas percentual e título, nunca valores.
    for (const m of newlyReached) {
      await publishAchievement({ kind: "dream_milestone", dream_title: dream.title, percent: m });
    }

    await refresh();
    return { newlyReached, newSaved, error: null };
  }, [wsId, dreams, refresh]);

  /**
   * Ritmo médio mensal com base nos últimos 3 meses de aportes.
   * Retorna 0 se não houver histórico suficiente.
   */
  const monthlyPace = useCallback((dreamId: string) => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recent = contribs.filter(
      (c) => c.dream_id === dreamId && new Date(c.contributed_at) >= cutoff
    );
    if (recent.length === 0) return 0;
    const total = recent.reduce((s, c) => s + Number(c.amount), 0);
    // Divide pelo número de meses cobertos (mínimo 1)
    const months = Math.max(1, (now.getFullYear() - cutoff.getFullYear()) * 12 + (now.getMonth() - cutoff.getMonth()));
    return total / months;
  }, [contribs]);

  const projectMonths = useCallback((dream: Dream) => {
    const pace = monthlyPace(dream.id);
    if (pace <= 0) return null;
    const remaining = Math.max(0, Number(dream.target_amount) - Number(dream.saved_amount));
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / pace);
  }, [monthlyPace]);

  return {
    dreams, contribs, loading, workspaceLoading, refresh,
    createDream, deleteDream, togglePriority, addContribution,
    monthlyPace, projectMonths,
  };
}
