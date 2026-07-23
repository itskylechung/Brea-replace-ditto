-- The messages.sender_id FK cascades profile deletes, so it needs a supporting
-- non-partial index to avoid scanning the full messages table during deletion.

CREATE INDEX IF NOT EXISTS messages_sender_idx
  ON public.messages (sender_id);
