import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bggngynmudonjbshqgys.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZ25neW5tdWRvbmpic2hxZ3lzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM2OTQ0MiwiZXhwIjoyMDk3OTQ1NDQyfQ.uBKQ4-hO311qeXQ_-bFE-IWnEDZurMv922NmJMFUbxw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})
