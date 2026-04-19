import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pltaiozpoofchprydxuz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdGFpb3pwb29mY2hwcnlkeHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzg0MTksImV4cCI6MjA5MTkxNDQxOX0.nkV0AclS8hziq-HCk1kltp9T59u0tKqmcywLhprJ1HY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
