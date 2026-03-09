import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 48, fontWeight: 900, letterSpacing: '-1px' }}>SedoriHack</h1>
          <span style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #ff5252', color: '#ff5252', borderRadius: 20, fontWeight: 700 }}>
            刈り取り特化
          </span>
        </div>

        <p style={{ fontSize: 20, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
          本日<span style={{ color: 'var(--green)', fontWeight: 700 }}>30%以上値下がりした商品</span>を自動検出。<br />
          需要度・利益率・競合状況をスコアリングしてランキング表示。
        </p>

        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 48 }}>
          Keepa APIを活用した転売ヤー向けの刈り取り特化ダッシュボード
        </p>

        {/* Score colors preview */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 48 }}>
          {[
            { score: 85, label: '高評価', color: '#00e676' },
            { score: 62, label: '中評価', color: '#ffab00' },
            { score: 34, label: '低評価', color: '#ff5252' },
          ].map((item) => (
            <div key={item.score} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 64, height: 64,
                border: `2px solid ${item.color}`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: item.color,
              }}>
                {item.score}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
          {[
            { title: 'BSR分析', desc: '直近30日のBSRドロップ数で月間販売数を推定' },
            { title: '在庫切れ率', desc: '90日間のAmazon在庫切れ率でスイートスポットを特定' },
            { title: '利益計算', desc: 'カテゴリ別手数料を自動計算してROIを算出' },
          ].map((f) => (
            <div key={f.title} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px 16px',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 48, maxWidth: 500, margin: '0 auto 48px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Free</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>¥0</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>上位5件表示</div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--blue)', borderRadius: 12, padding: 24 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--blue)' }}>Pro</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>¥2,980<span style={{ fontSize: 14, fontWeight: 400 }}>/月</span></div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>全件表示・4時間更新</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link
            href="/signup"
            style={{
              padding: '14px 32px',
              background: 'var(--green)',
              color: '#000',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            無料で始める
          </Link>
          <Link
            href="/login"
            style={{
              padding: '14px 32px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              borderRadius: 10,
              fontWeight: 500,
              fontSize: 16,
              textDecoration: 'none',
            }}
          >
            ログイン
          </Link>
        </div>
      </div>
    </main>
  )
}
