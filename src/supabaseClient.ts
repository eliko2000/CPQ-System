import { createClient } from '@supabase/supabase-js';
import { config } from './lib/config';

// Use validated configuration from config.ts
// This ensures we never initialize Supabase with invalid credentials
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
