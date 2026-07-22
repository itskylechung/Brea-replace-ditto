-- Add an ordered profile gallery and owner-scoped storage access for its public-read bucket.

ALTER TABLE public.profiles
  ADD COLUMN photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT profiles_photos_is_valid
    CHECK (jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) <= 6);

GRANT UPDATE (photos) ON public.profiles TO authenticated;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY storage_objects_profile_photos_read
ON storage.objects
FOR SELECT
TO authenticated, anon
USING (
  bucket = 'profile-photos'
);

CREATE POLICY storage_objects_profile_photos_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket = 'profile-photos'
  AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
);

CREATE POLICY storage_objects_profile_photos_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket = 'profile-photos'
  AND uploaded_by = (SELECT auth.jwt() ->> 'sub')
);

GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT SELECT ON storage.objects TO authenticated, anon;
GRANT INSERT, DELETE ON storage.objects TO authenticated;
