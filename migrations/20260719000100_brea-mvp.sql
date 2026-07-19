-- Brea MVP schema and deterministic Taipei seed data.
-- Forward-only migration: apply once to the intended InsForge environment.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  avatar_url text,
  headline text NOT NULL CHECK (char_length(btrim(headline)) BETWEEN 1 AND 240),
  bio text,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  availability text,
  latitude double precision,
  longitude double precision,
  is_discoverable boolean NOT NULL DEFAULT true,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_coordinates_are_paired CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  CONSTRAINT profiles_latitude_is_valid CHECK (
    latitude IS NULL OR latitude BETWEEN -90 AND 90
  ),
  CONSTRAINT profiles_longitude_is_valid CHECK (
    longitude IS NULL OR longitude BETWEEN -180 AND 180
  )
);

CREATE INDEX profiles_discovery_idx
  ON public.profiles (is_discoverable, is_available)
  WHERE is_discoverable = true;

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  source_query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT connections_sender_recipient_are_distinct CHECK (sender_id <> recipient_id),
  CONSTRAINT connections_status_is_valid CHECK (status IN ('pending')),
  CONSTRAINT connections_source_query_length_is_valid CHECK (
    char_length(btrim(source_query)) BETWEEN 2 AND 200
  ),
  CONSTRAINT connections_sender_recipient_key UNIQUE (sender_id, recipient_id)
);

CREATE INDEX connections_sender_status_idx
  ON public.connections (sender_id, status, recipient_id);

CREATE INDEX connections_recipient_status_idx
  ON public.connections (recipient_id, status, created_at DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.connections FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.connections FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.connections FROM authenticated;

-- BREA_MVP_PROFILE_ID = 00000000-0000-4000-8000-000000000001
-- Taipei Main Station is the fixed MVP search origin and is intentionally hidden.
INSERT INTO public.profiles (
  id,
  name,
  avatar_url,
  headline,
  bio,
  skills,
  interests,
  availability,
  latitude,
  longitude,
  is_discoverable,
  is_available
) VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'Brea MVP Host',
    NULL,
    'Community host near Taipei Main Station',
    'Fixed server-side identity for the Brea MVP.',
    ARRAY['community building'],
    ARRAY['coffee', 'new connections'],
    'Available for introductions',
    25.0478,
    121.5170,
    false,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    'Maya Chen',
    NULL,
    'Product designer shaping friendly mobile experiences',
    'Designs early-stage products and loves swapping trail recommendations.',
    ARRAY['product design', 'prototyping', 'design systems'],
    ARRAY['hiking', 'illustration', 'local food'],
    'Free for a weekend hike or weekday lunch',
    25.0268,
    121.5434,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    'Haruto Sato',
    NULL,
    'Japanese language exchange facilitator',
    'Helps learners practice natural Japanese conversation in a relaxed setting.',
    ARRAY['Japanese conversation', 'language coaching', 'translation'],
    ARRAY['coffee', 'Taiwanese culture', 'photography'],
    'Available for language exchange after work',
    25.0527,
    121.5203,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000103',
    'Ethan Lin',
    NULL,
    'Full-stack TypeScript developer',
    'Builds useful web products and enjoys helping other developers unblock ideas.',
    ARRAY['TypeScript', 'React', 'PostgreSQL'],
    ARRAY['coffee', 'open source', 'cycling'],
    'Available for coffee on weekday afternoons',
    25.0442,
    121.5603,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000104',
    'Ivy Wu',
    NULL,
    'UX researcher focused on inclusive services',
    'Curious about how people navigate cities, teams, and unfamiliar experiences.',
    ARRAY['user research', 'service design', 'facilitation'],
    ARRAY['hiking', 'urban walks', 'board games'],
    'Open to a walk-and-talk this week',
    25.0421,
    121.5081,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000105',
    'Noah Tsai',
    NULL,
    'Backend developer and community mentor',
    'Mentors new engineers and is learning Japanese through weekly language exchange.',
    ARRAY['backend development', 'Deno', 'databases'],
    ARRAY['Japanese', 'language exchange', 'tea'],
    'Available for remote-work coffee mornings',
    24.9875,
    121.5770,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000106',
    'Clara Huang',
    NULL,
    'Outdoor community organizer',
    'Coordinates welcoming hiking groups around northern Taiwan.',
    ARRAY['community events', 'trip planning'],
    ARRAY['hiking', 'trail running', 'nature'],
    'Not accepting new meetups this week',
    25.0330,
    121.5654,
    true,
    false
  ),
  (
    '00000000-0000-4000-8000-000000000107',
    'Liam Kuo',
    NULL,
    'Frontend developer based in Tamsui',
    'Pairs on accessible interfaces and explores riverside trails.',
    ARRAY['JavaScript', 'accessibility', 'frontend development'],
    ARRAY['hiking', 'coffee', 'kayaking'],
    'Available for weekend coffee',
    25.1676,
    121.4450,
    true,
    true
  );
