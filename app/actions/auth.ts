'use server'

import { createClient } from '@/lib/supabase/server'

export async function getEmailByNickname(nickname: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('nickname', nickname)
    .single()
  return data?.email ?? null
}
