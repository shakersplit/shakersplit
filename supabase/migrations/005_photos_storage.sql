-- ============================================================================
-- Migration 005 — Photos storage bucket + RLS
--
-- Creates a public "photos" bucket. Files are stored under user-id-prefixed
-- paths (e.g. photos/<auth.uid()>/food/<uuid>.jpg) so RLS can scope each user
-- to writing only their own folder while keeping reads public.
--
-- Apply via Supabase Management API (curl POST to /v1/projects/<ref>/database/query).
-- Important: do NOT include `ALTER TABLE storage.objects ENABLE RLS` here — that
-- statement requires the supabase_storage_admin role (which the Management API
-- can't assume). RLS is already enabled by default on storage.objects, and the
-- CREATE POLICY statements below work fine under the `postgres` role.
-- ============================================================================

-- 1. Create the bucket (idempotent — INSERT ... ON CONFLICT DO UPDATE).
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

-- 2. RLS policies — drop existing first so this migration is idempotent.
DROP POLICY IF EXISTS photos_public_read ON storage.objects;
DROP POLICY IF EXISTS photos_owner_insert ON storage.objects;
DROP POLICY IF EXISTS photos_owner_update ON storage.objects;
DROP POLICY IF EXISTS photos_owner_delete ON storage.objects;

-- Public read: anyone (authenticated or anon) can fetch photos.
CREATE POLICY photos_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'photos');

-- Owner check uses the first path segment. Path format: <user-id>/<scope>/<file>.
-- A user can only write into a folder named after their own auth.uid().
CREATE POLICY photos_owner_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY photos_owner_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY photos_owner_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMENT ON POLICY photos_owner_insert ON storage.objects IS
  'Users can upload only into a folder named after their auth.uid().';

