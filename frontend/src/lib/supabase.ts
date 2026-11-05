import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Configure a URL e a chave publicável no arquivo frontend/.env.local.',
  )
}

if (!supabaseKey.startsWith('sb_publishable_')) {
  throw new Error(
    'Use a chave publicável do Supabase, iniciada por sb_publishable_.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)