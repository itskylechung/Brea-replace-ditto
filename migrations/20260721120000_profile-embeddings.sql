-- Cached profile embeddings for semantic people-search ranking (#69).
-- Read and written only by the server-side admin client inside the people-search
-- function; RLS stays deny-by-default, so no grant changes are needed.
-- ponytail: jsonb + in-memory cosine matches the existing full-scan ranking in
-- people-search; move to pgvector + an indexed match RPC when profile counts
-- make per-request scanning slow.
ALTER TABLE public.profiles
  ADD COLUMN embedding jsonb,
  ADD COLUMN embedding_hash text;
