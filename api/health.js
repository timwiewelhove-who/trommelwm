import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://pltaiozpoofchprydxuz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdGFpb3pwb29mY2hwcnlkeHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzg0MTksImV4cCI6MjA5MTkxNDQxOX0.nkV0AclS8hziq-HCk1kltp9T59u0tKqmcywLhprJ1HY'
)

export default async function handler(req, res) {
  try {
    const { error } = await supabase.from('tournament').select('id').limit(1)
    if (error) throw error
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message })
  }
}
