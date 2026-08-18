
DROP POLICY IF EXISTS "dream_images_select" ON storage.objects;
CREATE POLICY "dream_images_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dream-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dream_images_insert" ON storage.objects;
CREATE POLICY "dream_images_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dream-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dream_images_update" ON storage.objects;
CREATE POLICY "dream_images_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'dream-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "dream_images_delete" ON storage.objects;
CREATE POLICY "dream_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dream-images' AND (storage.foldername(name))[1] = auth.uid()::text);
