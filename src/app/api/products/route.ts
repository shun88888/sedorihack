import { NextRequest, NextResponse } from 'next/server'
import { MOCK_PRODUCTS } from '@/lib/mock/data'
import type { ScoredItem } from '@/types'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sortBy = searchParams.get('sort') ?? 'sedori_score'

  const validSorts = ['sedori_score', 'demand_score', 'roi', 'profit'] as const
  type SortCol = typeof validSorts[number]
  const sortColumn: SortCol = validSorts.includes(sortBy as SortCol) ? (sortBy as SortCol) : 'sedori_score'

  if (DEMO_MODE) {
    const sorted = [...MOCK_PRODUCTS].sort((a, b) => (b[sortColumn] as number) - (a[sortColumn] as number))
    return NextResponse.json({ products: sorted, isPro: true })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const isPro = profile?.plan === 'pro'

  let query = supabase
    .from('scored_items')
    .select('*')
    .order(sortColumn, { ascending: false })

  query = isPro ? query.limit(200) : query.limit(5)

  const { data, error } = await query as { data: ScoredItem[] | null; error: unknown }

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }

  return NextResponse.json({ products: data, isPro })
}
