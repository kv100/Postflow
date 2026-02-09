import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// TODO: Add proper Database types later
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
