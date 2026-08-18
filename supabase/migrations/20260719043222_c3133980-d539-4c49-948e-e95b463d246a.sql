CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uname TEXT;
BEGIN
  uname := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email,'@',1)
  );
  INSERT INTO public.profiles (id, display_name, onboarded)
  VALUES (NEW.id, uname, false);
  RETURN NEW;
END;
$function$;