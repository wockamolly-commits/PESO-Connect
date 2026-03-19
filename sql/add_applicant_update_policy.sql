-- Allow jobseekers to update (withdraw) their own applications
CREATE POLICY "Applicants can update their own applications"
  ON public.applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow jobseekers to delete their own withdrawn applications (for re-apply)
CREATE POLICY "Applicants can delete their own withdrawn applications"
  ON public.applications FOR DELETE
  USING (user_id = auth.uid() AND status = 'withdrawn');
