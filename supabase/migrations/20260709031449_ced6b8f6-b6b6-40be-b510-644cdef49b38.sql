REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid, text) TO service_role;