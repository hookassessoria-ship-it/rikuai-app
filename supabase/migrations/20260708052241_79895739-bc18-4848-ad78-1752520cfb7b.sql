
REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.has_workspace_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
