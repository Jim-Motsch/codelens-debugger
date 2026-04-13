import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://psookuogjmqlvaoutdtx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzb29rdW9nam1xbHZhb3V0ZHR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTUxNDksImV4cCI6MjA5MTQzMTE0OX0.JOcWwyhPxKNzGKlgaUB1mU6Lc6vSHkgr_g6w54Et8OI'

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function checkSubscription(email) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('email', email)
    .eq('status', 'active')
    .single()
  
  if (error || !data) return false
  return true
}