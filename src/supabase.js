import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqlpekpkbszpdgtuwybh.supabase.co'
const supabaseKey = 'sb_publishable_LVPwYYFIKjcMdMWlDD9xjQ_8qWHWlwv'

export const supabase = createClient(supabaseUrl, supabaseKey)