import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The client only stores the session. Token rotation goes through the API's POST /auth/refresh
// (see services/session.ts), so Supabase's own background refresh is turned off.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: true },
});
