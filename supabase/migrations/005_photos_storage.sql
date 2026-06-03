-- ============================================================================
-- Migration 005 — Photos storage bucket + RLS
--
-- Creates a public "photos" bucket. Files are stored under user-id-prefixed
-- paths (e.g. photos/<auth.uid()>/food/<uuid>.jpg) so RLS can scope each user
-- to writing only their own folder while keeping reads public (food photos,
-- recipe images, etc. are not sensitive).
--
-- Apply via the Supabase dashboard SQL editor or `supabase db push` —
-- creating the bucket via SQL is supported but the storage.objects RLS
-- policies must run AFTER the bucket exists.
-- ============================================================================

-- 1. Create the bucket (idempotent — INSERT ... ON CONFLICT DO NOTHING).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  TRUE,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS — public read on the photos bucket, user-scoped writes.
-- Drop existing policies so this migration is idempotent.
DROP POLICY IF EXISTS "photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "photos_owner_delete" ON storage.objects;

CREATE POLICY "photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Owner check uses the first path segment. Path format: <user-id>/<scope>/<file>
CREATE POLICY "photos_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMENT ON POLICY "photos_owner_insert" ON storage.objects IS
  'Users can upload only into a folder named after their auth.uid().';
