import { createClient } from '@supabase/supabase-js'

let supabaseClient = null;

export function getSupabase() {
  if (!supabaseClient) {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.SUPABASE_URL
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not set');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}
