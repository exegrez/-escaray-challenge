export interface Profile {
  id: string
  nickname: string
  email: string
  created_at: string
}

export interface Training {
  id: string
  user_id: string
  date: string
  photo_url: string
  notes: string | null
  is_monday_escaray: boolean
  created_at: string
  profiles?: Profile
}

export interface DailyReport {
  id: string
  user_id: string
  date: string
  tobacco_count: number
  had_spirits: boolean
  wake_time: string | null
  woke_at_730: boolean
  had_paja: boolean
  paja_time: string | null
  used_green_card: boolean
  green_card_reason: string | null
  notes: string | null
  created_at: string
}

export interface WeeklyStats {
  nickname: string
  user_id: string
  trainings_this_week: number
  total_trainings: number
  green_cards_used: number
  green_cards_left: number
  pajas_this_week: number
  total_pajas: number
  monday_streak: number
  score: number
  compliance_pct: number
}
