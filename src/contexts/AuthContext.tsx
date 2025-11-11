import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null; message?: string }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; message?: string; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'todoapp://auth/callback',
      }
    });

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

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
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
