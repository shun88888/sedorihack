import DashboardApp from '@/components/DashboardApp'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url'

export default async function DashboardPage() {
  if (!DEMO_MODE) {
    const { redirect } = await import('next/navigation')
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  return <DashboardApp />
}
