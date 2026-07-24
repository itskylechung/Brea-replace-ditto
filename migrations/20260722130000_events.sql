-- Events v1 (issue #70): host creates → members browse → RSVP → attendee
-- discovery. Server-only tables — browser clients go through the events
-- function, which enforces capacity, the RSVP gate on attendee lists, and
-- block/discoverability filtering.

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  starts_at timestamptz NOT NULL,
  place_label text NOT NULL CHECK (char_length(btrim(place_label)) BETWEEN 2 AND 160),
  capacity integer NOT NULL CHECK (capacity BETWEEN 2 AND 500),
  tags text[] NOT NULL DEFAULT ARRAY[]::text[] CHECK (cardinality(tags) <= 10),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_starts_at_idx ON public.events (starts_at);

CREATE TABLE public.event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_rsvps_event_profile_key UNIQUE (event_id, profile_id)
);

CREATE INDEX event_rsvps_profile_idx ON public.event_rsvps (profile_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.event_rsvps FROM PUBLIC, anon, authenticated;
