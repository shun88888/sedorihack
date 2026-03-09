'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'
import { useRouter } from 'next/navigation'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'your_supabase_url'

const DEMO_PROFILE: UserProfile = {
  id: 'demo',
  email: 'demo@sedorihack.com',
  plan: 'pro',
  stripe_customer_id: null,
  shipping_cost: 500,
  created_at: new Date().toISOString(),
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [shippingCost, setShippingCost] = useState(500)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()

  const loadProfile = async () => {
    if (DEMO_MODE) {
      setProfile(DEMO_PROFILE)
      setShippingCost(DEMO_PROFILE.shipping_cost)
      return
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setShippingCost(data.shipping_cost)
    }
  }

  useEffect(() => {
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (!profile) return

    const supabase = createClient()
    await supabase
      .from('user_profiles')
      .update({ shipping_cost: shippingCost })
      .eq('id', profile.id)

    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleUpgrade() {
    setUpgrading(true)
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setUpgrading(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) {
    return (
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>読み込み中...</div>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>設定</h1>
        <a href="/dashboard" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← ダッシュボードに戻る
        </a>
      </div>

      {/* Plan */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>プラン</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>
              {profile.plan === 'pro' ? (
                <span style={{ color: 'var(--blue)' }}>Pro プラン</span>
              ) : (
                <span>Free プラン</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {profile.plan === 'pro' ? '全件表示・4時間ごとの自動更新' : '上位5件のみ表示'}
            </div>
          </div>
          {profile.plan !== 'pro' && (
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              style={{
                padding: '10px 20px',
                background: 'var(--blue)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                opacity: upgrading ? 0.7 : 1,
              }}
            >
              {upgrading ? '...' : 'Proにアップグレード ¥2,980/月'}
            </button>
          )}
        </div>
      </div>

      {/* Settings */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>利益計算設定</h2>
        <form onSubmit={saveSettings}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
              デフォルト送料（円）
            </label>
            <input
              type="number"
              value={shippingCost}
              onChange={(e) => setShippingCost(Number(e.target.value))}
              min={0}
              style={{ maxWidth: 200 }}
            />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              FBAを使用する場合は0円に設定してください
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: saved ? 'var(--green)' : 'var(--surface-2)',
              color: saved ? '#000' : 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {saved ? '保存しました' : loading ? '保存中...' : '保存する'}
          </button>
        </form>
      </div>

      {/* Account */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>アカウント</h2>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>{profile.email}</div>
        <button
          onClick={handleSignOut}
          style={{
            padding: '10px 20px',
            background: 'none',
            color: '#ff5252',
            border: '1px solid #ff5252',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          ログアウト
        </button>
      </div>
    </main>
  )
}
