CREATE INDEX IF NOT EXISTS idx_job_postings_status ON public.job_postings (status);
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON public.job_postings (employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status_vacancies ON public.job_postings (status, vacancies);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications (user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);
CREATE INDEX IF NOT EXISTS idx_user_affinity_user_id ON public.user_affinity (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_embeddings_user_id ON public.profile_embeddings (user_id);
CREATE INDEX IF NOT EXISTS idx_job_embeddings_content_hash ON public.job_embeddings (content_hash);
