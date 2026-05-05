import { supabase } from '../config/supabase'

export function deriveStatus(event) {
    const now = new Date()
    const eventDate = new Date(event.event_date)
    const endDate = event.end_date ? new Date(event.end_date) : null

    if (endDate && endDate < now) return 'closed'
    if (!event.is_registration_open) return 'closed'
    if (eventDate > now) return 'upcoming'
    return 'open'
}

export async function listEvents() {
    const { data, error } = await supabase
        .from('job_fair_events')
        .select('*')
        .order('event_date', { ascending: true })
    if (error) throw error
    return data
}

export async function getEvent(id) {
    const { data, error } = await supabase
        .from('job_fair_events')
        .select('*')
        .eq('id', id)
        .single()
    if (error) throw error
    return data
}

export async function createEvent(eventData) {
    const { data, error } = await supabase
        .from('job_fair_events')
        .insert(eventData)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function updateEvent(id, eventData) {
    const { data, error } = await supabase
        .from('job_fair_events')
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    if (error) throw error
    return data
}

export async function deleteEvent(id) {
    const { error } = await supabase
        .from('job_fair_events')
        .delete()
        .eq('id', id)
    if (error) throw error
}

export async function toggleBookmark(userId, eventId) {
    const { data: existing } = await supabase
        .from('job_fair_bookmarks')
        .select('event_id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle()

    if (existing) {
        const { error } = await supabase
            .from('job_fair_bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('event_id', eventId)
        if (error) throw error
        return { bookmarked: false }
    } else {
        const { error } = await supabase
            .from('job_fair_bookmarks')
            .insert({ user_id: userId, event_id: eventId })
        if (error) throw error
        return { bookmarked: true }
    }
}

export async function listBookmarks(userId) {
    const { data, error } = await supabase
        .from('job_fair_bookmarks')
        .select('event_id')
        .eq('user_id', userId)
    if (error) throw error
    return new Set(data.map(b => b.event_id))
}
