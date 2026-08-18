-- 1. Profile social fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS share_achievements BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS username_changed BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON public.profiles (lower(username));

-- Backfill usernames for existing profiles
UPDATE public.profiles
SET username = 'user' || substr(replace(id::text, '-', ''), 1, 8)
WHERE username IS NULL;

-- 2. Follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own follow edges" ON public.follows
  FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

CREATE POLICY "Users create own follows" ON public.follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users delete own follows" ON public.follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- 3. Achievements (never monetary)
CREATE TABLE IF NOT EXISTS public.achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('dream_milestone', 'budget_streak', 'savings_rate')),
  dream_title TEXT,
  percent     INTEGER CHECK (percent IS NULL OR (percent >= 0 AND percent <= 1000)),
  months      INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_achievements(_viewer UUID, _author UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _viewer = _author OR EXISTS (
    SELECT 1 FROM public.follows f
    JOIN public.profiles p ON p.id = _author
    WHERE f.follower_id = _viewer AND f.following_id = _author
      AND p.share_achievements = true
  );
$$;

CREATE POLICY "Own or followed achievements are visible" ON public.achievements
  FOR SELECT TO authenticated
  USING (public.can_view_achievements(auth.uid(), user_id));

CREATE POLICY "Users create own achievements" ON public.achievements
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own achievements" ON public.achievements
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 4. Public (non-monetary) directory lookups
CREATE OR REPLACE FUNCTION public.search_people(q TEXT)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, is_following BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id)
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND q IS NOT NULL AND length(trim(q)) >= 2
    AND (p.username ILIKE '%' || trim(replace(q, '@', '')) || '%'
         OR p.display_name ILIKE '%' || trim(q) || '%')
  ORDER BY p.username
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.follow_counts(_user_id UUID)
RETURNS TABLE (followers BIGINT, following BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.follows WHERE following_id = _user_id),
    (SELECT count(*) FROM public.follows WHERE follower_id = _user_id)
  WHERE auth.uid() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.list_follows(_user_id UUID, _direction TEXT)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, is_following BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         EXISTS (SELECT 1 FROM public.follows f2 WHERE f2.follower_id = auth.uid() AND f2.following_id = p.id)
  FROM public.follows f
  JOIN public.profiles p
    ON p.id = CASE WHEN _direction = 'following' THEN f.following_id ELSE f.follower_id END
  WHERE auth.uid() IS NOT NULL
    AND ((_direction = 'following' AND f.follower_id = _user_id)
      OR (_direction = 'followers' AND f.following_id = _user_id))
  ORDER BY p.username
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.social_feed()
RETURNS TABLE (
  id UUID, user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT,
  kind TEXT, dream_title TEXT, percent INTEGER, months INTEGER, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.user_id, p.username, p.display_name, p.avatar_url,
         a.kind, a.dream_title, a.percent, a.months, a.created_at
  FROM public.achievements a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE auth.uid() IS NOT NULL
    AND (a.user_id = auth.uid()
      OR (p.share_achievements = true
          AND EXISTS (SELECT 1 FROM public.follows f
                      WHERE f.follower_id = auth.uid() AND f.following_id = a.user_id)))
  ORDER BY a.created_at DESC
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.username_available(_username TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(trim(_username))
  );
$$;

-- 5. Auto-generate username at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uname TEXT;
  base  TEXT;
  handle TEXT;
  n INT := 0;
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email,'@',1)
  );
  base := lower(regexp_replace(COALESCE(split_part(NEW.email,'@',1), 'user'), '[^a-z0-9_]', '', 'g'));
  IF length(base) < 3 THEN base := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 5); END IF;
  handle := left(base, 16);
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = handle) LOOP
    n := n + 1;
    handle := left(base, 14) || n::text;
  END LOOP;

  INSERT INTO public.profiles (id, display_name, onboarded, username)
  VALUES (NEW.id, uname, false, handle);
  RETURN NEW;
END;
$$;