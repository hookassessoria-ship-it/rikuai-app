
-- 1) Profiles: preferências e flag onboarded
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS language     text    NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS currency     text    NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS country      text    NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS account_type text    NOT NULL DEFAULT 'personal';

-- 2) Workspaces: account_type + company_name
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS company_name text;

-- 3) Novo handle_new_user: cria apenas UM workspace neutro
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ws_id  UUID;
  uname  TEXT;
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email,'@',1)
  );

  INSERT INTO public.profiles (id, display_name, onboarded)
  VALUES (NEW.id, uname, false);

  INSERT INTO public.workspaces (name, owner_id, account_type)
  VALUES (uname, NEW.id, 'personal')
  RETURNING id INTO ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, NEW.id, 'owner');

  INSERT INTO public.workspace_settings (workspace_id, data)
  VALUES (ws_id, '{}'::jsonb);

  RETURN NEW;
END; $function$;
