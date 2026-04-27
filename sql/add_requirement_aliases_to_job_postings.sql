ALTER TABLE job_postings
    ADD COLUMN IF NOT EXISTS requirement_aliases JSONB DEFAULT '{}'::jsonb;
