-- Messaging between connected members (issue #66): 1:1 chat unlocked by an
-- accepted connection. Server-only table — browser clients go through the
-- connection-messages function, which enforces participant + accepted + blocks.

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_length_is_valid CHECK (
    char_length(btrim(body)) BETWEEN 1 AND 2000
  )
);

CREATE INDEX messages_connection_created_idx
  ON public.messages (connection_id, created_at DESC, id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM PUBLIC, anon, authenticated;
