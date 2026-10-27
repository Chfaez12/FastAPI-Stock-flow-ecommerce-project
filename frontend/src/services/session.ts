import { supabase } from './supabase';
import { AuthService } from './endpoints';

/**
 * Refresh this many seconds before the access token expires. supabase-js renews a session by
 * itself inside getSession() once it is within ~90s of expiry, so this stays ahead of that.
 */
export const REFRESH_MARGIN_SECONDS = 120;

let refreshInFlight: Promise<string | null> | null = null;

async function rotate(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const refreshToken = data.session?.refresh_token;
  if (!refreshToken) return null;

  try {
    const res = await AuthService.refresh({ refresh_token: refreshToken });
    await supabase.auth.setSession({
      access_token: res.data.access_token,
      refresh_token: res.data.refresh_token,
    });
    return res.data.access_token;
  } catch {
    // The refresh token is revoked or expired: end the session so the user signs in again.
    await supabase.auth.signOut();
    return null;
  }
}

/**
 * Rotate the session through POST /auth/refresh and return the new access token.
 * Concurrent callers share one request, since a refresh token can only be used once.
 */
export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= rotate().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/** Seconds until the stored access token expires (negative when already expired). */
export function secondsUntilExpiry(expiresAt: number | undefined): number {
  if (!expiresAt) return Infinity;
  return expiresAt - Date.now() / 1000;
}
