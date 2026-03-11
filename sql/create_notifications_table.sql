-- Create notifications table
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
    ON public.notifications(user_id) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert notifications (employer inserts for jobseeker)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
