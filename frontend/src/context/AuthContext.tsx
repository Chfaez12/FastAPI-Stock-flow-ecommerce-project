import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthService, UserService } from '../services/endpoints';
import { REFRESH_MARGIN_SECONDS, refreshSession, secondsUntilExpiry } from '../services/session';
import type { UnifiedRegisterRequest, UserResponse, UserRole } from '../types/api';

type RegisterResult = 'signed-in' | 'confirm-email';

interface AuthContextType {
  session: Session | null;
  user: UserResponse | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserResponse>;
  register: (payload: UnifiedRegisterRequest) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  setUser: (user: UserResponse) => void;
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    let active = true;

    // Restore an existing session and load the account (with its role) from the API.
    (async () => {
      let { data } = await supabase.auth.getSession();
      if (!active) return;
      // A stored session may have expired while the app was closed; renew it via /auth/refresh.
      if (data.session && secondsUntilExpiry(data.session.expires_at) < REFRESH_MARGIN_SECONDS) {
        await refreshSession();
        ({ data } = await supabase.auth.getSession());
        if (!active) return;
      }
      if (data.session) {
        setSession(data.session);
        try {
          const me = await UserService.getMe();
          if (active) setUser(me.data);
        } catch {
          await supabase.auth.signOut();
          if (active) setSession(null);
        }
      }
      if (active) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setUser(null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Rotate the token through POST /auth/refresh shortly before it expires.
  const expiresAt = session?.expires_at;
  useEffect(() => {
    if (!expiresAt) return;

    const refreshIfDue = () => {
      if (secondsUntilExpiry(expiresAt) < REFRESH_MARGIN_SECONDS) void refreshSession();
    };
    const delayMs = Math.max(0, (secondsUntilExpiry(expiresAt) - REFRESH_MARGIN_SECONDS) * 1000);
    const timer = setTimeout(refreshIfDue, delayMs);

    // Background tabs throttle timers, so re-check whenever the tab becomes visible again.
    const onVisible = () => document.visibilityState === 'visible' && refreshIfDue();
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [expiresAt]);

  const startSession = async (accessToken: string, refreshToken: string) => {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    setSession(data.session);
  };

  const login = async (email: string, password: string) => {
    const res = await AuthService.login({ email, password });
    await startSession(res.data.access_token, res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload: UnifiedRegisterRequest): Promise<RegisterResult> => {
    const res = await AuthService.register(payload);
    const { access_token, refresh_token, user: created } = res.data;
    // Supabase returns no session when email confirmation is required.
    if (!access_token || !refresh_token) return 'confirm-email';
    await startSession(access_token, refresh_token);
    setUser(created);
    return 'signed-in';
  };

  const logout = async () => {
    try {
      await AuthService.logout();
    } catch {
      /* the local session is cleared regardless */
    }
    await clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role: user?.role ?? null,
        loading,
        login,
        register,
        logout,
        setUser,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
