import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqlpekpkbszpdgtuwybh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjUzNDgsImV4cCI6MjA4NzgwMTM0OH0.hpfFuzlVEp5BPQaKbYbRjoAR-jlOJlEYM7sWVatLNXs'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
  },
})

export const mockUser = {
  id: 'demo-user-id',
  email: 'jaiyewisdom@gmail.com',
  role: 'authenticated',
  aud: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
}

export const mockSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
}

const auth = supabase.auth
const originalGetSession = auth.getSession.bind(auth)
const originalGetUser = auth.getUser.bind(auth)
const originalOnAuthStateChange = auth.onAuthStateChange.bind(auth)

auth.getSession = async () => {
  try {
    await originalGetSession()
  } catch {
    // Ignore demo auth fallbacks.
  }
  return { data: { session: mockSession }, error: null }
}

auth.getUser = async () => {
  try {
    await originalGetUser()
  } catch {
    // Ignore demo auth fallbacks.
  }
  return { data: { user: mockUser }, error: null }
}

auth.onAuthStateChange = (callback) => {
  const result = originalOnAuthStateChange(callback)
  queueMicrotask(() => callback('SIGNED_IN', mockSession))
  return result
}

auth.signOut = async () => ({ error: null })

auth.updateUser = async (attributes) => ({
  data: { user: { ...mockUser, ...attributes } },
  error: null,
})
