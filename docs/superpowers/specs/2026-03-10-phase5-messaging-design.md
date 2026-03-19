# Phase 5: Messaging Migration — Design Spec

**Date:** 2026-03-10
**Status:** Approved

## Problem

Messaging system (conversations + messages) is still on Firebase Firestore with real-time `onSnapshot` listeners. Needs migration to Supabase with Realtime subscriptions.

## SQL Schema

Two new tables: `conversations` (deterministic text ID from sorted UIDs) and `messages` (UUID, FK to conversations).

- `conversations.participants` is `text[]` for `@>` containment queries
- `conversations.participant_info`, `last_message`, `unread_count` are `jsonb`
- `messages.conversation_id` is FK to `conversations.id`
- RLS scoped via `participants @> ARRAY[auth.uid()::text]`

## Real-time

Supabase Realtime `postgres_changes` channel subscriptions replace Firebase `onSnapshot`:
- Conversations list: subscribe to INSERT/UPDATE on `conversations` filtered by participant
- Messages: subscribe to INSERT on `messages` filtered by `conversation_id`
- Unread count: subscribe to UPDATE on `conversations` filtered by participant

## Files

- **Create:** `sql/phase5_messaging_tables.sql`
- **Rewrite:** `src/services/messagingService.js` (same API, Supabase internals)
- **Modify:** `src/pages/Messages.jsx` (one getDoc → supabase query)
- **No changes:** ChatWindow, ConversationList, Navbar, Diagnostic — they import from messagingService
