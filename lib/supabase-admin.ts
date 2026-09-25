import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseConfiguration() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      `Supabase is not configured (URL present: ${Boolean(supabaseUrl)}; service key present: ${Boolean(supabaseServiceRoleKey)}). ` +
        'Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.',
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
