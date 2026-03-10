-- ============================================================
-- Phase 5: conversations and messages tables + RLS
-- ============================================================

-- 1. conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id               text PRIMARY KEY,  -- deterministic: sorted uid1_uid2
  participants     text[] NOT NULL,
  participant_info jsonb NOT NULL DEFAULT '{}',
  last_message     jsonb,
  unread_count     jsonb NOT NULL DEFAULT '{}',
  job_id           text,
  job_title        text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Participants can read their own conversations
CREATE POLICY "Users can read own conversations"
  ON public.conversations FOR SELECT
  USING (participants @> ARRAY[auth.uid()::text]);

-- Authenticated users can insert conversations they participate in
CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (participants @> ARRAY[auth.uid()::text]);

-- Participants can update their own conversations
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (participants @> ARRAY[auth.uid()::text]);

-- 2. messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  text             text NOT NULL,
  sender_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name      text,
  read_by          text[] DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages in conversations they participate in
CREATE POLICY "Users can read messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
        AND participants @> ARRAY[auth.uid()::text]
    )
  );

-- Users can insert messages in conversations they participate in
CREATE POLICY "Users can insert messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
        AND participants @> ARRAY[auth.uid()::text]
    )
  );

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participants
  ON public.conversations USING GIN (participants);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (conversation_id, created_at);

-- 4. Enable Realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
