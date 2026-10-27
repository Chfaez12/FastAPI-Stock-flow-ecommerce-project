import { supabase } from '../services/supabase';

export interface AuthLinkResult {
  accessToken: string | null;
  error: string | null;
}

/**
 * Read the result of a Supabase email link (password reset or signup confirmation).
 *
 * Supabase redirects to the app with `#access_token=…` on success or `#error_description=…` on
 * failure. supabase-js may already have consumed the fragment and stored the session by the time a
 * page mounts, so fall back to the stored session when the fragment is gone.
 */
export async function readAuthLink(): Promise<AuthLinkResult> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get('error_description') ?? query.get('error_description');
  if (error) return { accessToken: null, error: error.replace(/\+/g, ' ') };

  const fromHash = hash.get('access_token');
  if (fromHash) return { accessToken: fromHash, error: null };

  const { data } = await supabase.auth.getSession();
  return { accessToken: data.session?.access_token ?? null, error: null };
}
