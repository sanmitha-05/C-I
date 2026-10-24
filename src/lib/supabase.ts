import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate whether a valid HTTP/HTTPS URL is supplied
function isValidHttpUrl(stringToTest?: string): boolean {
  if (!stringToTest || typeof stringToTest !== 'string') return false
  if (stringToTest.includes('your_supabase_project_url_here') || stringToTest.includes('placeholder')) {
    return false
  }
  try {
    const url = new URL(stringToTest)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured =
  isValidHttpUrl(rawUrl) &&
  Boolean(rawKey) &&
  rawKey !== 'your_supabase_anon_key_here' &&
  !rawKey?.includes('placeholder')

const safeUrl = isSupabaseConfigured && rawUrl ? rawUrl : 'https://demo-project.supabase.co'
const safeKey =
  isSupabaseConfigured && rawKey
    ? rawKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key'

if (!isSupabaseConfigured) {
  console.info(
    'ℹ️ Raptee.HV FI Platform: Running in Local Demo Mode.\n' +
    'To connect your cloud database, configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  )
}

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    autoRefreshToken: isSupabaseConfigured,
    persistSession: true,
    detectSessionInUrl: isSupabaseConfigured,
  },
  global: {
    headers: {
      'x-application-name': 'raptee-fi-platform',
    },
  },
})

export default supabase
