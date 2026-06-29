import { createClient } from '@supabase/supabase-js';

// Public anon credentials — safe to ship in the browser bundle (RLS protects
// the data). Set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in
// Vercel. If they're absent the app still runs in local-only mode.
const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const supabaseEnabled = !!supabase;
