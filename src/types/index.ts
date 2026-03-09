export type Plan = 'free' | 'pro'

export interface UserProfile {
  id: string
  email: string
  plan: Plan
  stripe_customer_id: string | null
  shipping_cost: number
  created_at: string
}

export interface Subscription {
  id: number
  user_id: string
  stripe_subscription_id: string
  status: 'active' | 'canceled' | 'past_due'
  current_period_end: string
}

export interface ScoredItem {
  id: number
  asin: string
  title: string
  image_url: string | null
  buy_price: number
  sell_price: number
  profit: number
  roi: number
  demand_score: number
  sedori_score: number
  daily_drop: number
  sales_rank: number
  seller_count: number
  bsr_drop_count: number
  out_of_stock_rate: number
  price_recovery_days: number
  bsr_trend: number
  fee: number
  shipping_cost: number
  review_count: number
  category: string
  detected_at: string
}

export type SortKey = 'sedori_score' | 'demand_score' | 'roi' | 'profit'

export interface SummaryStats {
  count: number
  avg_demand: number
  avg_roi: number
  total_profit: number
}
