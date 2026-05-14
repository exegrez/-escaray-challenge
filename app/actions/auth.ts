'use server'

import { createClient } from '@/lib/supabase/server'

export async function getEmailByNickname(nickname: string): Promise<{ email: string | null; debug: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('nickname', nickname)
    .single()
  return {
    email: data?.email ?? null,
    debug: error ? `${error.code}: ${error.message}` : (data ? 'ok' : 'no data')
  }
}
