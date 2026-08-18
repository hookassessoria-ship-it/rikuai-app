import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Camada social — REGRA ABSOLUTA DE PRIVACIDADE:
 * nenhum valor monetário de outro usuário trafega aqui.
 * Só username, nome de exibição, foto, percentuais e marcos.
 */

export interface PublicPerson {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_following: boolean;
}

export interface FeedItem {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  kind: "dream_milestone" | "budget_streak" | "savings_rate";
  dream_title: string | null;
  percent: number | null;
  months: number | null;
  created_at: string;
}

export interface MyProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  share_achievements: boolean;
  username_changed: boolean;
}

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/** URL assinada para uma foto do bucket privado `avatars`. */
export async function signedAvatar(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function useSocial() {
  const [me, setMe] = useState<MyProfile | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    const [
      { data: prof },
      { data: feedRows, error: feedErr },
      { data: cnt, error: cntErr },
      { data: followingRows },
    ] = await Promise.all([
      supabase.from("profiles")
        .select("id, username, display_name, avatar_url, share_achievements, username_changed")
        .eq("id", uid).maybeSingle(),
      supabase.rpc("social_feed"),
      supabase.rpc("follow_counts", { _user_id: uid }),
      supabase.rpc("list_follows", { _user_id: uid, _direction: "following" }),
    ]);

    if (feedErr || cntErr) setError((feedErr ?? cntErr)?.message ?? "social_error");

    setMe((prof as any) ?? null);
    setFeed((feedRows ?? []) as any);
    setFollowingIds(new Set(((followingRows ?? []) as PublicPerson[]).map((p) => p.id)));
    const c = Array.isArray(cnt) ? cnt[0] : cnt;
    setCounts({ followers: Number(c?.followers ?? 0), following: Number(c?.following ?? 0) });
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const search = useCallback(async (q: string): Promise<PublicPerson[]> => {
    if (q.trim().length < 2) return [];
    const { data } = await supabase.rpc("search_people", { q });
    return (data ?? []) as any;
  }, []);

  const listFollows = useCallback(async (direction: "following" | "followers"): Promise<PublicPerson[]> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];
    const { data } = await supabase.rpc("list_follows", { _user_id: auth.user.id, _direction: direction });
    return (data ?? []) as any;
  }, []);

  const follow = useCallback(async (userId: string): Promise<{ error: string | null }> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "not-authenticated" };
    const { error } = await supabase.from("follows").insert({ follower_id: auth.user.id, following_id: userId });
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [refresh]);

  const unfollow = useCallback(async (userId: string): Promise<{ error: string | null }> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "not-authenticated" };
    const { error } = await supabase.from("follows").delete()
      .eq("follower_id", auth.user.id).eq("following_id", userId);
    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [refresh]);

  const isUsernameAvailable = useCallback(async (username: string) => {
    const { data } = await supabase.rpc("username_available", { _username: username });
    return data === true;
  }, []);

  const updateProfile = useCallback(async (patch: {
    display_name?: string;
    username?: string;
    avatar_url?: string | null;
    share_achievements?: boolean;
  }) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "not-authenticated" as const };
    const payload = { ...patch } as {
      display_name?: string; username?: string; avatar_url?: string | null;
      share_achievements?: boolean; username_changed?: boolean;
    };
    if (patch.username && patch.username !== me?.username) payload.username_changed = true;
    const { error } = await supabase.from("profiles").update(payload).eq("id", auth.user.id);

    if (error) return { error: error.message };
    await refresh();
    return { error: null };
  }, [me?.username, refresh]);

  const uploadAvatar = useCallback(async (file: File) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${auth.user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    return path;
  }, []);

  return {
    me, feed, followingIds, counts, loading, error, refresh,
    search, listFollows, follow, unfollow,
    isUsernameAvailable, updateProfile, uploadAvatar,
  };
}

/** Publica uma conquista — apenas dados não monetários. */
export async function publishAchievement(input: {
  kind: "dream_milestone" | "budget_streak" | "savings_rate";
  dream_title?: string | null;
  percent?: number | null;
  months?: number | null;
}): Promise<{ error: string | null; skipped?: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "not-authenticated" };
  const { data: prof } = await supabase.from("profiles")
    .select("share_achievements").eq("id", auth.user.id).maybeSingle();
  if (!prof || prof.share_achievements === false) return { error: null, skipped: true };
  const { error } = await supabase.from("achievements").insert({
    user_id: auth.user.id,
    kind: input.kind,
    dream_title: input.dream_title ?? null,
    percent: input.percent ?? null,
    months: input.months ?? null,
  });
  return { error: error?.message ?? null };
}
