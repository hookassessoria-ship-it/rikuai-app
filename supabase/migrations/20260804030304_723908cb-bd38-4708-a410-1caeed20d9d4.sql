-- 1. Profiles: referral code + premium grants
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS premium_until timestamptz;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c text;
BEGIN
  LOOP
    c := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = c);
  END LOOP;
  RETURN c;
END;
$$;

UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

-- 2. Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  referred_bonus_granted boolean NOT NULL DEFAULT false,
  referrer_reward_granted boolean NOT NULL DEFAULT false,
  CONSTRAINT referrals_no_self CHECK (referrer_id <> referred_id),
  CONSTRAINT referrals_referred_unique UNIQUE (referred_id)
);

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE TRIGGER trg_referrals_updated
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);

-- 3. Grant premium days helper
CREATE OR REPLACE FUNCTION public.grant_premium_days(_user_id uuid, _days integer)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base timestamptz;
BEGIN
  SELECT GREATEST(COALESCE(premium_until, now()), now()) INTO base
  FROM public.profiles WHERE id = _user_id;
  IF base IS NULL THEN RETURN NULL; END IF;
  UPDATE public.profiles
     SET premium_until = base + (_days || ' days')::interval
   WHERE id = _user_id
   RETURNING premium_until INTO base;
  RETURN base;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_premium_days(uuid, integer) FROM anon, authenticated;

-- 4. Redeem referral code (called by the referred user, right after signup)
CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  ref uuid;
BEGIN
  IF me IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not-authenticated'); END IF;
  IF _code IS NULL OR length(trim(_code)) < 4 THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid-code'); END IF;

  SELECT id INTO ref FROM public.profiles WHERE referral_code = lower(trim(_code));
  IF ref IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'code-not-found'); END IF;
  IF ref = me THEN RETURN jsonb_build_object('ok', false, 'error', 'self-referral'); END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = me) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already-referred');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, referred_bonus_granted)
  VALUES (ref, me, true);

  PERFORM public.grant_premium_days(me, 7);

  RETURN jsonb_build_object('ok', true, 'days', 7);
END;
$$;

-- 5. Conversion reward (invoked by the Stripe webhook with service role)
CREATE OR REPLACE FUNCTION public.apply_referral_conversion(_referred_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.referrals;
BEGIN
  SELECT * INTO r FROM public.referrals WHERE referred_id = _referred_id;
  IF r.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'no-referral'); END IF;
  IF r.referrer_reward_granted THEN RETURN jsonb_build_object('ok', false, 'error', 'already-rewarded'); END IF;

  UPDATE public.referrals
     SET converted_at = COALESCE(converted_at, now()),
         referrer_reward_granted = true
   WHERE id = r.id;

  PERFORM public.grant_premium_days(r.referrer_id, 30);

  RETURN jsonb_build_object('ok', true, 'referrer_id', r.referrer_id, 'days', 30);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_referral_conversion(uuid) FROM anon, authenticated;

-- 6. Stats for the "My referrals" screen
CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE(signups bigint, conversions bigint, reward_days bigint, code text, premium_until timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.referrals WHERE referrer_id = auth.uid()),
    (SELECT count(*) FROM public.referrals WHERE referrer_id = auth.uid() AND converted_at IS NOT NULL),
    (SELECT count(*) * 30 FROM public.referrals WHERE referrer_id = auth.uid() AND referrer_reward_granted),
    (SELECT referral_code FROM public.profiles WHERE id = auth.uid()),
    (SELECT premium_until FROM public.profiles WHERE id = auth.uid())
  WHERE auth.uid() IS NOT NULL;
$$;

-- 7. Premium check now also honours referral-granted free days
CREATE OR REPLACE FUNCTION public.has_active_premium(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND (
        (status IN ('active','trialing') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND cancel_at_period_end = true AND current_period_end > now())
      )
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_uuid AND premium_until > now()
  );
$$;

-- 8. New signups get a referral code automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.profiles (id, display_name, onboarded, username, referral_code)
  VALUES (NEW.id, uname, false, handle, public.gen_referral_code());
  RETURN NEW;
END;
$$;

-- 9. Public (non-monetary) profile lookup so social screens can render people
CREATE OR REPLACE FUNCTION public.public_profile(_username text)
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, is_following boolean, followers bigint, following bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id = auth.uid() AND f.following_id = p.id),
         (SELECT count(*) FROM public.follows f2 WHERE f2.following_id = p.id),
         (SELECT count(*) FROM public.follows f3 WHERE f3.follower_id = p.id)
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND lower(p.username) = lower(trim(replace(_username, '@', '')))
  LIMIT 1;
$$;