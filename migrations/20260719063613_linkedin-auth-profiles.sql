-- Replace the shared MVP identity with one private, RLS-protected profile per auth user.

ALTER TABLE public.profiles
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  ADD COLUMN location_label text,
  ADD COLUMN linkedin_profile_url text,
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ALTER COLUMN headline DROP NOT NULL,
  ALTER COLUMN is_discoverable SET DEFAULT false,
  ALTER COLUMN is_available SET DEFAULT false;

UPDATE public.profiles
SET
  onboarding_completed = true,
  location_label = COALESCE(location_label, 'Taipei');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_length_is_valid
    CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 2048),
  ADD CONSTRAINT profiles_headline_length_is_valid
    CHECK (headline IS NULL OR char_length(btrim(headline)) BETWEEN 1 AND 240),
  ADD CONSTRAINT profiles_bio_length_is_valid
    CHECK (bio IS NULL OR char_length(bio) <= 1000),
  ADD CONSTRAINT profiles_skills_count_is_valid
    CHECK (cardinality(skills) <= 20),
  ADD CONSTRAINT profiles_interests_count_is_valid
    CHECK (cardinality(interests) <= 20),
  ADD CONSTRAINT profiles_availability_length_is_valid
    CHECK (availability IS NULL OR char_length(btrim(availability)) BETWEEN 1 AND 180),
  ADD CONSTRAINT profiles_location_label_length_is_valid
    CHECK (location_label IS NULL OR char_length(btrim(location_label)) BETWEEN 1 AND 120),
  ADD CONSTRAINT profiles_linkedin_url_is_valid
    CHECK (
      linkedin_profile_url IS NULL
      OR (
        char_length(linkedin_profile_url) <= 2048
        AND linkedin_profile_url ~ '^https://([a-z]{2}\.)?linkedin\.com/in/[A-Za-z0-9%_-]+/?([?].*)?$'
      )
    ),
  ADD CONSTRAINT profiles_discoverable_is_complete
    CHECK (
      NOT is_discoverable
      OR (
        onboarding_completed
        AND headline IS NOT NULL
        AND location_label IS NOT NULL
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      )
    );

CREATE INDEX profiles_user_id_idx
  ON public.profiles (user_id)
  WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_updated_at();

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT profile.id
  FROM public.profiles AS profile
  WHERE profile.user_id = (SELECT auth.uid())
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY profiles_delete_own
ON public.profiles
FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS connections_select_participant ON public.connections;
DROP POLICY IF EXISTS connections_delete_sender ON public.connections;

CREATE POLICY connections_select_participant
ON public.connections
FOR SELECT
TO authenticated
USING (
  sender_id = (SELECT public.current_profile_id())
  OR recipient_id = (SELECT public.current_profile_id())
);

CREATE POLICY connections_delete_sender
ON public.connections
FOR DELETE
TO authenticated
USING (sender_id = (SELECT public.current_profile_id()));

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (
  user_id,
  name,
  avatar_url,
  headline,
  bio,
  skills,
  interests,
  availability,
  location_label,
  latitude,
  longitude,
  linkedin_profile_url,
  onboarding_completed,
  is_discoverable,
  is_available
) ON public.profiles TO authenticated;
GRANT UPDATE (
  name,
  avatar_url,
  headline,
  bio,
  skills,
  interests,
  availability,
  location_label,
  latitude,
  longitude,
  linkedin_profile_url,
  onboarding_completed,
  is_discoverable,
  is_available
) ON public.profiles TO authenticated;
GRANT DELETE ON TABLE public.profiles TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.connections FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.connections TO authenticated;

REVOKE ALL ON FUNCTION public.set_profile_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_profile_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.set_profile_updated_at() FROM authenticated;
