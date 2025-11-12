import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { 
  RateLimiter, 
  generateStateToken,
  storeStateToken,
  formatTimeRemaining
} from '../lib/security';
import { logger } from '../lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; message?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  remainingAuthAttempts: (email: string) => number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initialize rate limiter at module level
const rateLimiter = new RateLimiter();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Check rate limit before attempting sign in
    const { allowed, retryAfter } = rateLimiter.checkLimit(email);
    if (!allowed) {
      const timeRemaining = retryAfter ? formatTimeRemaining(retryAfter) : '30 minutes';
      return {
        error: new Error('Too many attempts') as AuthError,
        message: `Too many login attempts. Please try again in ${timeRemaining}.`
      };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Record attempt result
    rateLimiter.recordAttempt(email, !error);

    // Log error if sign in failed
    if (error) {
      logger.error(error, { context: 'sign_in', email, rateLimited: !allowed });
    }

    // Check if error is due to unconfirmed email
    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
        return { 
          error,
          message: 'Please verify your email before signing in. Check your inbox for the confirmation link.' 
        };
      }
      if (error.message.includes('Invalid login credentials')) {
        return {
          error,
          message: 'Invalid email or password. Please try again.'
        };
      }
      return { error };
    }

    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    // Check rate limit before attempting sign up
    const { allowed, retryAfter } = rateLimiter.checkLimit(email);
    if (!allowed) {
      const timeRemaining = retryAfter ? formatTimeRemaining(retryAfter) : '30 minutes';
      return {
        error: new Error('Too many attempts') as AuthError,
        message: `Too many sign up attempts. Please try again in ${timeRemaining}.`
      };
    }

    // Generate and store CSRF state token
    const stateToken = generateStateToken();
    storeStateToken(stateToken);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `todoapp://auth/callback?state=${stateToken}`,
      }
    });

    // Record attempt result
    rateLimiter.recordAttempt(email, !error);

    // Log error if sign up failed
    if (error) {
      logger.error(error, { context: 'sign_up', email, rateLimited: !allowed });
    }

    if (error) {
      // Check for specific error types
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return { 
          error,
          message: 'This email is already registered. Please sign in instead.' 
        };
      }
      return { error };
    }

    // Check if user was created but needs to confirm email
    if (data.user && !data.session) {
      return { 
        error: null,
        message: 'Check your email for the confirmation link. Click the link to verify your account.',
        needsEmailConfirmation: true 
      };
    }

    // If session exists, user is automatically confirmed (email confirmation disabled)
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const remainingAuthAttempts = (email: string): number => {
    return rateLimiter.getRemainingAttempts(email);
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    remainingAuthAttempts,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
