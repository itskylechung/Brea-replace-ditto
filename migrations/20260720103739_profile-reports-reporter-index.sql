-- Backend advisor: FK profile_reports.reporter_profile_id (ON DELETE SET NULL)
-- had no supporting index, so deleting a profile seq-scans profile_reports.
-- Intentionally non-partial so FK-index checks recognize it.

CREATE INDEX IF NOT EXISTS profile_reports_reporter_idx
  ON public.profile_reports (reporter_profile_id);
