import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

interface UseAuthReturn {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let validationComplete = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // 初回検証が完了するまでonAuthStateChangeによる更新を無視する
      if (validationComplete) {
        setSession(newSession);
        setLoading(false);
      }
    });

    const initAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        await supabase.auth.signOut();
        setSession(null);
      } else {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
      }
      validationComplete = true;
      setLoading(false);
    };

    void initAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        logger.warn('Sign in failed', error.message);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      logger.error('Unexpected sign in error', err);
      return { error: 'ログインに失敗しました' };
    }
  };

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        logger.warn('Sign up failed', error.message);
        return { error: error.message };
      }
      return { error: null };
    } catch (err) {
      logger.error('Unexpected sign up error', err);
      return { error: 'アカウント作成に失敗しました' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('Sign out error', err);
    }
  };

  return { session, loading, signIn, signUp, signOut };
}
