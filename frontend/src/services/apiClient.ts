import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Imported lazily: session.ts depends on endpoints.ts, which depends on this module.
const loadSession = () => import('./session');

const isAuthCall = (url?: string) => !!url?.startsWith('/auth/');

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;

  // Renew a token that is about to expire before sending the request, instead of waiting for a 401.
  if (token && !isAuthCall(config.url)) {
    const { REFRESH_MARGIN_SECONDS, refreshSession, secondsUntilExpiry } = await loadSession();
    if (secondsUntilExpiry(data.session?.expires_at) < REFRESH_MARGIN_SECONDS) {
      token = (await refreshSession()) ?? undefined;
    }
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the API still rejects the token, rotate it through POST /auth/refresh once and retry.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall(original.url)) {
      original._retried = true;
      const { refreshSession } = await loadSession();
      const token = await refreshSession();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);
