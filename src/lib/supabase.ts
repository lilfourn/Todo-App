import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables exist
if (!supabaseUrlRaw || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please copy .env.example to .env and fill in your Supabase credentials. ' +
    'See README.md for setup instructions.'
  );
}

// Normalize Supabase URL: trim whitespace and remove trailing slash
const supabaseUrl = supabaseUrlRaw.trim().replace(/\/$/, '');

// Validate Supabase URL format
const urlPattern = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/;
if (!urlPattern.test(supabaseUrl)) {
  throw new Error(
    `Invalid VITE_SUPABASE_URL format: "${supabaseUrl}". ` +
    'Expected format: https://your-project-ref.supabase.co'
  );
}

// Validate anon key format (should be a JWT starting with "eyJ")
if (!supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.split('.').length !== 3) {
  throw new Error(
    'Invalid VITE_SUPABASE_ANON_KEY format. ' +
    'Expected a valid JWT token from your Supabase project settings.'
  );
}

// Development mode logging
logger.debug('Running in development mode with Supabase configuration');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Database types
export interface Task {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  completed_at?: string | null;
  deleted_at?: string | null;
  is_late?: boolean;
}
