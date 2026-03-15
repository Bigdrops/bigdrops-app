import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqlpekpkbszpdgtuwybh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxbHBla3BrYnN6cGRndHV3eWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjUzNDgsImV4cCI6MjA4NzgwMTM0OH0.hpfFuzlVEp5BPQaKbYbRjoAR-jlOJlEYM7sWVatLNXs'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
  },
})
