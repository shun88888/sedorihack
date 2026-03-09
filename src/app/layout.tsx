import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SedoriHack - 刈り取り特化ダッシュボード',
  description: 'Keepa APIを活用した転売ヤー向け刈り取り特化ダッシュボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0, background: '#050505' }}>{children}</body>
    </html>
  )
}
