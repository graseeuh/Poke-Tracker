import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// persistSession + autoRefreshToken are supabase-js's defaults, made
// explicit here: the session is saved to localStorage and silently
// refreshed in the background, so a logged-in user stays logged in across
// tabs and browser restarts until they explicitly log out.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
