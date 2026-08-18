import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, UserMinus, Trophy, Loader2, Gift, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useSocial, signedAvatar, type PublicPerson, type FeedItem } from "@/hooks/useSocial";
import { useT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

function Avatar({ path, name, size = 40 }: { path: string | null; name: string | null; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let ok = true; signedAvatar(path).then((u) => { if (ok) setUrl(u); }); return () => { ok = false; }; }, [path]);
  return (
    <div className="rounded-full overflow-hidden bg-surface-overlay flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}>
      {url
        ? <img src={url} alt={name ?? "avatar"} className="w-full h-full object-cover" loading="lazy" />
        : <span className="text-xs font-black text-muted-custom">{(name ?? "?").slice(0, 1).toUpperCase()}</span>}
    </div>
  );
}

function achievementText(t: ReturnType<typeof useT>, item: FeedItem): string {
  const name = item.display_name || (item.username ? `@${item.username}` : "—");
  if (item.kind === "dream_milestone") {
    return (item.percent ?? 0) >= 100
      ? t("ach_dream_done", { name, dream: item.dream_title ?? "" })
      : t("ach_dream_progress", { name, pct: item.percent ?? 0, dream: item.dream_title ?? "" });
  }
  if (item.kind === "budget_streak") return t("ach_streak", { name, months: item.months ?? 0 });
  return t("ach_savings_rate", { name, pct: item.percent ?? 0 });
}

export function SocialTab() {
  const t = useT();
  const s = useSocial();
  const [tab, setTab] = useState<"feed" | "search" | "people">("feed");
  const [feedScope, setFeedScope] = useState<"forYou" | "following">("forYou");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [direction, setDirection] = useState<"following" | "followers">("following");
  const [people, setPeople] = useState<PublicPerson[]>([]);

  useEffect(() => {
    if (s.error) toast.error(s.error);
  }, [s.error]);

  const visibleFeed = useMemo(() => {
    if (feedScope === "forYou") return s.feed;
    return s.feed.filter((item) => item.user_id !== s.me?.id && s.followingIds.has(item.user_id));
  }, [feedScope, s.feed, s.followingIds, s.me?.id]);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (query.trim().length < 2) { setResults([]); return; }
      setSearching(true);
      setResults(await s.search(query));
      setSearching(false);
    }, 350);
    return () => clearTimeout(id);
  }, [query, s]);

  useEffect(() => {
    if (tab !== "people") return;
    s.listFollows(direction).then(setPeople);
  }, [tab, direction, s]);

  const reloadPeople = async () => {
    if (tab === "people") setPeople(await s.listFollows(direction));
    if (tab === "search" && query.trim().length >= 2) setResults(await s.search(query));
  };

  const handleFollow = async (id: string) => {
    const { error } = await s.follow(id);
    if (error) toast.error(t("social_action_error"));
  };

  const handleUnfollow = async (id: string) => {
    const { error } = await s.unfollow(id);
    if (error) toast.error(t("social_action_error"));
  };

  if (s.loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Meu perfil */}
      <div className="rounded-2xl p-4 border border-border/60 gradient-card shadow-card">
        <div className="flex items-center gap-3">
          <Avatar path={s.me?.avatar_url ?? null} name={s.me?.display_name ?? s.me?.username ?? null} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-base font-black text-foreground truncate">{s.me?.display_name ?? "—"}</p>
            <p className="text-xs text-muted-custom truncate">{s.me?.username ? `@${s.me.username}` : ""}</p>
          </div>
          <div className="flex gap-3 text-center">
            <div>
              <p className="text-sm font-black text-foreground">{s.counts.followers}</p>
              <p className="text-[9px] text-muted-custom uppercase font-bold">{t("social_followers")}</p>
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{s.counts.following}</p>
              <p className="text-[9px] text-muted-custom uppercase font-bold">{t("social_following")}</p>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-custom mt-3">{t("social_privacy_note")}</p>
        <Link to="/referrals"
          className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
          <Gift className="w-4 h-4" /> {t("ref_title")}
        </Link>
      </div>

      {/* Abas internas */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border/60">
        {([["feed", t("social_feed")], ["search", t("social_search_ph")], ["people", t("social_following")]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${tab === id ? "bg-surface-overlay text-primary" : "text-muted-custom"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "feed" && (
        <div className="space-y-2">
          <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border/60">
            {([["forYou", t("social_for_you")], ["following", t("social_following_feed")]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setFeedScope(id as any)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${feedScope === id ? "bg-surface-overlay text-primary" : "text-muted-custom"}`}>
                {label}
              </button>
            ))}
          </div>
          {visibleFeed.length === 0 && (
            <div className="rounded-2xl p-6 border border-border/60 bg-surface text-center">
              <Trophy className="w-6 h-6 text-muted-custom mx-auto mb-2" />
              <p className="text-xs text-muted-custom">
                {feedScope === "following" ? t("social_following_feed_empty") : t("social_feed_empty")}
              </p>
            </div>
          )}
          {visibleFeed.map((item) => (
            <div key={item.id} className="rounded-2xl p-3 border border-border/60 bg-surface flex items-start gap-3">
              <Avatar path={item.avatar_url} name={item.display_name ?? item.username} />
              <div className="min-w-0">
                <p className="text-sm text-foreground leading-snug">{achievementText(t, item)}</p>
                <p className="text-[10px] text-muted-custom mt-1">{formatDate(item.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "search" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3">
            <Search className="w-4 h-4 text-muted-custom" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("social_search_ph")}
              className="flex-1 bg-transparent py-2.5 text-sm text-foreground outline-none" />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="text-xs text-muted-custom text-center py-4">{t("social_no_results")}</p>
          )}
          {results.map((p) => (
            <PersonRow key={p.id} person={p} onFollow={handleFollow} onUnfollow={handleUnfollow} onDone={reloadPeople} />
          ))}
        </div>
      )}

      {tab === "people" && (
        <div className="space-y-2">
          <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border/60">
            {(["following", "followers"] as const).map((d) => (
              <button key={d} onClick={() => setDirection(d)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-bold ${direction === d ? "bg-surface-overlay text-primary" : "text-muted-custom"}`}>
                {d === "following" ? t("social_following") : t("social_followers")}
              </button>
            ))}
          </div>
          {people.length === 0 && (
            <div className="rounded-2xl p-6 border border-border/60 bg-surface text-center">
              <Users className="w-6 h-6 text-muted-custom mx-auto mb-2" />
              <p className="text-xs text-muted-custom">{t("social_no_results")}</p>
            </div>
          )}
          {people.map((p) => (
            <PersonRow key={p.id} person={p} onFollow={handleFollow} onUnfollow={handleUnfollow} onDone={reloadPeople} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonRow({ person, onFollow, onUnfollow, onDone }: {
  person: PublicPerson;
  onFollow: (id: string) => Promise<void>;
  onUnfollow: (id: string) => Promise<void>;
  onDone: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(person.is_following);

  const toggle = async () => {
    setBusy(true);
    if (following) { await onUnfollow(person.id); setFollowing(false); }
    else { await onFollow(person.id); setFollowing(true); }
    setBusy(false);
    onDone();
  };

  return (
    <div className="rounded-2xl p-3 border border-border/60 bg-surface flex items-center gap-3">
      <Avatar path={person.avatar_url} name={person.display_name ?? person.username} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground truncate">{person.display_name ?? "—"}</p>
        <p className="text-[11px] text-muted-custom truncate">{person.username ? `@${person.username}` : ""}</p>
      </div>
      <button onClick={toggle} disabled={busy}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold ${
          following ? "bg-surface-overlay text-muted-custom border border-border" : "bg-primary text-on-accent"}`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : following ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
        {following ? t("social_unfollow") : t("social_follow")}
      </button>
    </div>
  );
}
