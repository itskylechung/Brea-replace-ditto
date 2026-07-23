-- MOD-01 (#68): moderation console needs resolution state on reports.
-- resolved_by stores the admin's email (env allowlist, no admin role table yet).

ALTER TABLE public.profile_reports
  ADD COLUMN status text NOT NULL DEFAULT 'open',
  ADD COLUMN resolved_at timestamptz,
  ADD COLUMN resolved_by text,
  ADD CONSTRAINT profile_reports_status_is_valid
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  ADD CONSTRAINT profile_reports_resolution_is_consistent
    CHECK ((status = 'open') = (resolved_at IS NULL));

CREATE INDEX profile_reports_open_created_idx
  ON public.profile_reports (created_at DESC)
  WHERE status = 'open';
