REVOKE EXECUTE ON FUNCTION public.search_people(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.follow_counts(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_follows(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.social_feed() FROM anon;
REVOKE EXECUTE ON FUNCTION public.username_available(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_achievements(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_achievements(UUID, UUID) FROM authenticated;