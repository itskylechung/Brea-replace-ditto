-- Guarantee one private Brea profile for every non-admin auth account.

CREATE OR REPLACE FUNCTION public.provision_brea_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  display_name text;
  profile_avatar_url text;
BEGIN
  IF NEW.is_project_admin OR NEW.is_anonymous THEN
    RETURN NEW;
  END IF;

  display_name := left(
    COALESCE(
      NULLIF(btrim(NEW.profile ->> 'name'), ''),
      NULLIF(btrim(split_part(NEW.email, '@', 1)), ''),
      'Brea member'
    ),
    120
  );

  profile_avatar_url := NULLIF(btrim(NEW.profile ->> 'avatar_url'), '');
  IF char_length(profile_avatar_url) > 2048 THEN
    profile_avatar_url := NULL;
  END IF;

  INSERT INTO public.profiles (
    user_id,
    name,
    avatar_url,
    onboarding_completed,
    is_discoverable,
    is_available
  ) VALUES (
    NEW.id,
    display_name,
    profile_avatar_url,
    false,
    false,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_user_provisions_brea_profile ON auth.users;
CREATE TRIGGER auth_user_provisions_brea_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.provision_brea_profile();

INSERT INTO public.profiles (
  user_id,
  name,
  avatar_url,
  onboarding_completed,
  is_discoverable,
  is_available
)
SELECT
  auth_user.id,
  left(
    COALESCE(
      NULLIF(btrim(auth_user.profile ->> 'name'), ''),
      NULLIF(btrim(split_part(auth_user.email, '@', 1)), ''),
      'Brea member'
    ),
    120
  ),
  CASE
    WHEN char_length(NULLIF(btrim(auth_user.profile ->> 'avatar_url'), '')) <= 2048
      THEN NULLIF(btrim(auth_user.profile ->> 'avatar_url'), '')
    ELSE NULL
  END,
  false,
  false,
  false
FROM auth.users AS auth_user
WHERE NOT auth_user.is_project_admin
  AND NOT auth_user.is_anonymous
ON CONFLICT (user_id) DO NOTHING;

REVOKE ALL ON FUNCTION public.provision_brea_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_brea_profile() FROM anon;
REVOKE ALL ON FUNCTION public.provision_brea_profile() FROM authenticated;
