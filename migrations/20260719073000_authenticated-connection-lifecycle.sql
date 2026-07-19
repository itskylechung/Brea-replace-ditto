-- Authenticated MVP v2: complete the request lifecycle and add server-only
-- safety and product-event records. Browser clients cannot access the new tables.

ALTER TABLE public.connections
  DROP CONSTRAINT connections_status_is_valid;

ALTER TABLE public.connections
  ADD COLUMN responded_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT connections_status_is_valid
    CHECK (status IN ('pending', 'accepted', 'declined')),
  ADD CONSTRAINT connections_response_time_is_valid
    CHECK (
      (status = 'pending' AND responded_at IS NULL)
      OR (status IN ('accepted', 'declined') AND responded_at IS NOT NULL)
    );

CREATE OR REPLACE FUNCTION public.guard_connection_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id THEN
    RAISE EXCEPTION 'connection participants cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'pending' AND NEW.status IN ('accepted', 'declined'))
      OR (OLD.status = 'accepted' AND NEW.status = 'declined')
      OR (OLD.status = 'declined' AND NEW.status = 'pending')
    ) THEN
      RAISE EXCEPTION 'invalid connection status transition: % to %', OLD.status, NEW.status;
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER connections_guard_update
BEFORE UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.guard_connection_update();

REVOKE ALL ON FUNCTION public.guard_connection_update() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_connection_update() FROM anon;
REVOKE ALL ON FUNCTION public.guard_connection_update() FROM authenticated;

CREATE TABLE public.profile_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  blocked_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_blocks_profiles_are_distinct
    CHECK (blocker_profile_id <> blocked_profile_id),
  CONSTRAINT profile_blocks_pair_key
    UNIQUE (blocker_profile_id, blocked_profile_id)
);

CREATE INDEX profile_blocks_blocked_idx
  ON public.profile_blocks (blocked_profile_id, blocker_profile_id);

CREATE TABLE public.profile_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reported_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_reports_profiles_are_distinct
    CHECK (reporter_profile_id IS NULL OR reporter_profile_id <> reported_profile_id),
  CONSTRAINT profile_reports_reason_is_valid
    CHECK (reason IN ('spam', 'harassment', 'misleading', 'unsafe', 'other')),
  CONSTRAINT profile_reports_details_length_is_valid
    CHECK (details IS NULL OR char_length(details) <= 500)
);

CREATE INDEX profile_reports_reported_created_idx
  ON public.profile_reports (reported_profile_id, created_at DESC);

CREATE TABLE public.product_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_events_name_is_valid CHECK (
    event_name IN (
      'sign_in_completed',
      'profile_completed',
      'profile_updated',
      'search_completed',
      'connection_requested',
      'connection_responded',
      'profile_hidden',
      'profile_reported'
    )
  ),
  CONSTRAINT product_events_properties_is_object
    CHECK (jsonb_typeof(properties) = 'object'),
  CONSTRAINT product_events_properties_size_is_valid
    CHECK (pg_column_size(properties) <= 4096)
);

CREATE INDEX product_events_name_created_idx
  ON public.product_events (event_name, created_at DESC);

CREATE INDEX product_events_profile_created_idx
  ON public.product_events (profile_id, created_at DESC)
  WHERE profile_id IS NOT NULL;

ALTER TABLE public.profile_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profile_blocks FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profile_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.product_events FROM PUBLIC, anon, authenticated;
