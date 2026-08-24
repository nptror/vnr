import { createClient } from '@supabase/supabase-js'

// Trim guards against trailing newlines/spaces sneaking into env vars on
// hosting platforms (e.g. pasted into Vercel dashboard). REST tolerates them
// (HTTP headers auto-trim) but the Realtime WebSocket URL would carry the raw
// character (%0A) and fail auth forever — exactly the bug seen on production.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && anonKey)
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
