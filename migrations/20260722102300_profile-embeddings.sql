-- Cached profile embeddings for semantic people-search ranking (#69).
-- Written only by the server-side admin client inside the people-search function
-- (the client UPDATE/INSERT grants are column-scoped and exclude these columns).
-- Note: the pre-existing table-wide GRANT SELECT + own-row RLS policy means a
-- member can read these columns on their own row — harmless here, but any future
-- sensitive column on profiles inherits the same exposure.
-- ponytail: jsonb + in-memory cosine matches the existing full-scan ranking in
-- people-search; move to pgvector + an indexed match RPC when profile counts
-- make per-request scanning slow.
ALTER TABLE public.profiles
  ADD COLUMN embedding jsonb,
  ADD COLUMN embedding_hash text;
