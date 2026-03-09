'use client'

import { useState, useEffect, useMemo, useId, useRef } from 'react'
import PriceChart, { generateMockPriceHistory, generateMockBSRHistory, sliceByPeriod } from './PriceChart'
import { createChart, ColorType, AreaSeries } from 'lightweight-charts'
import type { IChartApi, Time } from 'lightweight-charts'

const M = "'IBM Plex Mono','Menlo',monospace"
const S = "'Outfit',-apple-system,sans-serif"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Portfolio {
  id: string
  name: string
  productIds: string[]
}

interface Product {
  id: string
  name: string
  sub: string
  cat?: string
  cur: number
  avg: number
  hi: number
  lo: number
  chg: number
  roi: number
  demand: number
  score: number
  sales: number
  sellers: number
  oos: number
  exp: { profit: number; prob: number }
  ph: number[]
  bh: number[]
}

interface NewsItem {
  id: number
  t: string
  src: string
  time: string
  neg: boolean
  sum: string
  cats: string[]
}

interface MktItem {
  name: string
  avg: number
  chg: number
  data: number[]
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  { id:'B0CX1234AB',name:"Nike Air Force 1 '07",sub:'ホワイト / 27.0cm',cur:9800,avg:15800,hi:18200,lo:9200,chg:-38,roi:36,demand:86,score:78,sales:22,sellers:3,oos:78,exp:{profit:3130,prob:78},ph:[158,152,148,155,160,158,142,138,150,162,158,145,132,128,140,152,158,168,152,135,120,112,105,98],bh:[32,28,31,25,22,28,19,21,18,24,19,16,20,18,19,17,21,15,18,16,19,17,18,18] },
  { id:'B0AB5678CD',name:'New Balance 990v6',sub:'グレー / 26.5cm',cat:'靴',cur:22800,avg:36900,hi:42000,lo:21500,chg:-42,roi:35,demand:82,score:76,sales:18,sellers:1,oos:85,exp:{profit:8065,prob:72},ph:[369,358,342,360,380,375,330,310,340,365,358,320,295,280,310,345,369,385,340,300,270,255,240,228],bh:[18,15,16,12,11,14,9,10,8,12,9,8,10,8,9,8,10,7,9,8,9,8,8,8] },
  { id:'B0EF9012GH',name:'Sony WH-1000XM5',sub:'ブラック',cat:'家電',cur:32800,avg:44800,hi:49800,lo:31000,chg:-30,roi:25,demand:78,score:72,sales:35,sellers:5,oos:42,exp:{profit:8216,prob:65},ph:[448,435,420,440,460,448,410,390,420,450,448,415,380,365,390,425,448,470,425,380,355,340,335,328],bh:[4,3,3,3,2,3,2,2,2,3,2,2,2,2,2,2,2,2,2,2,2,2,2,2] },
  { id:'B0QR1234ST',name:'Nike Dunk Low Retro',sub:'パンダ / 27.0cm',cat:'靴',cur:9800,avg:16500,hi:19800,lo:9500,chg:-40,roi:38,demand:80,score:75,sales:28,sellers:3,oos:45,exp:{profit:3725,prob:74},ph:[165,160,152,158,170,165,145,135,150,168,165,148,130,122,138,155,165,180,155,130,115,108,102,98],bh:[9,7,8,6,5,7,5,6,4,7,5,4,5,5,5,4,5,4,5,4,5,4,5,5] },
  { id:'B0UV5678WX',name:'ポケモンカード 151 BOX',sub:'強化拡張パック',cat:'トレカ',cur:5980,avg:9800,hi:12500,lo:5500,chg:-39,roi:47,demand:72,score:70,sales:30,sellers:8,oos:55,exp:{profit:2840,prob:68},ph:[98,95,90,95,105,98,88,80,88,100,98,85,75,70,80,92,98,110,92,78,70,65,62,60],bh:[2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { id:'B0ZZ3333CC',name:'Converse Chuck 70 Hi',sub:'ブラック / 26.0cm',cat:'靴',cur:7200,avg:12800,hi:14500,lo:7000,chg:-36,roi:44,demand:76,score:71,sales:22,sellers:2,oos:72,exp:{profit:3180,prob:70},ph:[128,125,120,125,135,128,115,105,115,130,128,115,100,95,105,120,128,140,120,100,90,82,76,72],bh:[20,18,19,15,13,17,12,14,11,16,12,10,13,12,12,11,13,10,12,11,12,11,12,12] },
  { id:'B0IJ3456KL',name:'Apple AirTag 4個入り',sub:'',cat:'家電',cur:14200,avg:15200,hi:17800,lo:11200,chg:12,roi:9,demand:90,score:68,sales:38,sellers:5,oos:65,exp:{profit:1112,prob:88},ph:[152,148,142,148,160,152,135,130,140,155,152,140,128,122,135,148,152,162,148,140,138,140,141,142],bh:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { id:'B0MN7890OP',name:'Switch Proコントローラー',sub:'スプラ3エディション',cat:'ゲーム',cur:5480,avg:7980,hi:9200,lo:5200,chg:-31,roi:25,demand:75,score:68,sales:25,sellers:4,oos:50,exp:{profit:1362,prob:72},ph:[79,78,75,78,82,79,72,68,72,80,79,73,65,62,68,75,79,85,75,65,60,58,56,55],bh:[9,8,8,7,6,8,6,6,5,7,6,5,6,5,6,5,6,4,5,5,6,5,5,5] },
  { id:'B0PK1111AA',name:'ポケカ バトルマスター BOX',sub:'新弾',cat:'トレカ',cur:12800,avg:9800,hi:13200,lo:8500,chg:31,roi:28,demand:88,score:74,sales:42,sellers:6,oos:80,exp:{profit:2240,prob:82},ph:[85,88,90,92,95,98,102,105,108,110,112,115,118,120,122,124,126,128,126,124,126,127,128,128],bh:[1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2] },
  { id:'B0AD2222BB',name:'adidas Samba OG',sub:'ホワイト / 27.5cm',cat:'靴',cur:18500,avg:14200,hi:19000,lo:12800,chg:18,roi:22,demand:84,score:71,sales:19,sellers:2,oos:70,exp:{profit:2680,prob:75},ph:[128,130,132,135,138,140,142,145,148,150,152,155,158,160,162,165,167,170,172,174,176,180,183,185],bh:[8,8,9,9,10,10,11,11,12,12,13,13,14,14,15,15,16,16,17,17,18,18,19,18] },
  { id:'B0LG3333CC',name:'LEGO Icons フラワーブーケ',sub:'10280',cat:'おもちゃ',cur:8200,avg:6800,hi:8500,lo:5900,chg:21,roi:18,demand:79,score:66,sales:31,sellers:7,oos:58,exp:{profit:1020,prob:70},ph:[62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,80,81,82,82],bh:[3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9,9,8,8,8] },
  { id:'B0YM4444DD',name:'メルカリ定番 ルンバ j7+',sub:'ロボット掃除機',cat:'家電',cur:52000,avg:44000,hi:53000,lo:38000,chg:15,roi:14,demand:76,score:63,sales:12,sellers:3,oos:62,exp:{profit:4800,prob:68},ph:[410,415,420,422,425,428,432,435,438,440,442,445,448,450,452,455,458,460,462,465,465,468,470,520],bh:[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2] },
]

const NEWS: NewsItem[] = [
  { id:1, t:'ナイキ、Air Force 1 新カラーウェイを4月発売予定', src:'Fashionsnap', time:'3時間前', neg:true, sum:'旧モデルの在庫処分で値下がりの可能性', cats:['靴'] },
  { id:2, t:'スニーカーリセール市場、2026年も二桁成長を維持', src:'日経', time:'1日前', neg:false, sum:'中長期的な需要は引き続き堅調', cats:['靴'] },
  { id:3, t:'ソニー、WH-1000XM6を今夏発表か', src:'AV Watch', time:'2時間前', neg:true, sum:'現行モデルの値下がりが加速する可能性', cats:['家電'] },
  { id:4, t:'Switch 2 発売日が正式決定、6月5日', src:'ファミ通', time:'4時間前', neg:true, sum:'現行周辺機器の需要減少', cats:['ゲーム'] },
  { id:5, t:'ポケカ新弾「バトルマスター」予約開始即完売', src:'電撃', time:'1時間前', neg:false, sum:'ポケカ市場全体の需要上昇の兆し', cats:['トレカ'] },
  { id:6, t:'Amazon春のファッションセール、3月15日から開催', src:'ITmedia', time:'5時間前', neg:true, sum:'セール期間中は価格低下、終了後に回復見込み', cats:['靴','家電'] },
  { id:7, t:'円安加速、1ドル155円突破', src:'Bloomberg', time:'30分前', neg:false, sum:'海外仕入れコスト上昇、国内在庫の価値が上昇', cats:['靴','家電','トレカ','ゲーム'] },
  { id:8, t:'メルカリ、手数料を10%→8%に引き下げ検討', src:'TechCrunch', time:'6時間前', neg:false, sum:'販売チャネルの利益率改善の可能性', cats:['靴','家電','トレカ','ゲーム'] },
]

const MKT: MktItem[] = [
  { name:'ナイキ', avg:12500, chg:-7.6, data:[158,155,148,142,138,135,130,128,125] },
  { name:'NB', avg:24500, chg:-0.2, data:[250,248,252,245,242,248,245,240,245] },
  { name:'ソニー', avg:35200, chg:-5.2, data:[448,435,420,410,390,380,365,352,352] },
  { name:'ポケカ', avg:7800, chg:8.5, data:[60,62,65,68,70,72,75,76,78] },
  { name:'adidas', avg:11800, chg:0.3, data:[115,116,118,117,118,119,118,118,118] },
]

const CATS = ['すべて','靴','家電','ゲーム','トレカ']
const SORTS: [string, string][] = [['score','スコア'],['roi','ROI'],['demand','需要度'],['profit','期待利益']]

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

// ─── Fade ─────────────────────────────────────────────────────────────────────
function F({ children, delay = 0, show = true }: { children: React.ReactNode; delay?: number; show?: boolean }) {
  const [v, setV] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setV(show), show ? delay * 1000 : 0)
    return () => clearTimeout(t)
  }, [show, delay])
  return (
    <div style={{ opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
      {children}
    </div>
  )
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function Chart({ data, color, h = 120 }: { data: number[]; color: string; h?: number }) {
  const uid = useId()
  const gid = `c${uid.replace(/:/g, '')}`
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ')
  const ly = 100 - ((data[data.length - 1] - min) / range) * 100
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: h, overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${pts} 100,100`} fill={`url(#${gid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx="100" cy={ly} r="2" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  )
}

function Spark({ data, color = '#22c55e', w = 44, h = 18 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: w, height: h, overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

// ─── MiniPriceChart (lightweight-charts) ─────────────────────────────────────
function MiniPriceChart({ product, color = '#22c55e', w = 80, h = 36 }: { product: Product; color?: string; w?: number; h?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const data = useMemo(() => {
    const sliced = generateMockPriceHistory(product.cur, product.avg, product.hi, product.lo, 365)
    return sliceByPeriod(sliced, '3M')
  }, [product.id, product.cur, product.avg, product.hi, product.lo])

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      width: w,
      height: h,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'transparent',
        fontFamily: "'IBM Plex Mono','Menlo',monospace",
        fontSize: 1,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: { visible: false, labelVisible: false },
      },
      rightPriceScale: {
        visible: false,
        borderVisible: false,
      },
      timeScale: {
        visible: false,
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScale: false,
      handleScroll: false,
    })

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}18`,
      bottomColor: `${color}00`,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    areaSeries.setData(data as { time: Time; value: number }[])
    chart.timeScale().fitContent()

    chartRef.current = chart

    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [data, color, w, h])

  return (
    <div ref={containerRef} style={{ width: w, height: h, flexShrink: 0, overflow: 'hidden' }}>
      <style>{`.tv-lightweight-charts a[href*="tradingview"] { opacity: 0 !important; pointer-events: none !important; }`}</style>
    </div>
  )
}

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useW() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

// ─── ProductRow ───────────────────────────────────────────────────────────────
function ProductRow({ p, rank, onClick, active, delay = 0 }: { p: Product; rank: number; onClick: (p: Product) => void; active: boolean; delay?: number }) {
  const down = p.chg < 0
  return (
    <F delay={delay}>
      <div
        onClick={() => onClick(p)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid #111', cursor:'pointer', background: active ? 'rgba(34,197,94,0.03)' : 'transparent', borderLeft: active ? '2px solid #22c55e' : '2px solid transparent', transition:'background 0.15s' }}
      >
        <span style={{ width:18, fontSize:12, fontWeight:800, fontFamily:M, color: rank<=3 ? ['#e5e5e5','#888','#6b5b3a'][rank-1] : '#333', textAlign:'center' }}>{rank}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#ccc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:S, margin:0 }}>{p.name}</p>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
            <span style={{ fontSize:10, fontWeight:700, fontFamily:M, color: down ? '#ef4444' : '#22c55e', background: down ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding:'1px 5px', borderRadius:3 }}>{down ? '▼' : '▲'}{Math.abs(p.chg)}%</span>
            <span style={{ fontSize:10, color:'#444' }}>{p.cat}</span>
          </div>
        </div>
        <MiniPriceChart product={p} color={down ? '#ef4444' : '#22c55e'} />
        <div style={{ textAlign:'right', minWidth:56 }}>
          <p style={{ fontSize:13, fontWeight:700, fontFamily:M, color:'#22c55e', margin:0 }}>{p.exp.profit.toLocaleString()}</p>
          <p style={{ fontSize:10, fontFamily:M, color:'#555', margin:0 }}>{p.roi}%</p>
        </div>
      </div>
    </F>
  )
}

// ─── NewsTicker ───────────────────────────────────────────────────────────────
const NEWS_PAGE = 3

function NewsTicker() {
  const [page, setPage] = useState(0)
  const [visible, setVisible] = useState(true)
  const totalPages = Math.ceil(NEWS.length / NEWS_PAGE)

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setPage(p => (p + 1) % totalPages)
        setVisible(true)
      }, 400)
    }, 8000)
    return () => clearInterval(iv)
  }, [totalPages])

  const items = [0, 1, 2].map(i => NEWS[(page * NEWS_PAGE + i) % NEWS.length])

  return (
    <div style={{ padding:'0 16px', marginBottom:12 }}>
      <style>{`@keyframes news-in { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }`}</style>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, margin:0 }}>NEWS</p>
        <div style={{ display:'flex', gap:3 }}>
          {Array.from({ length: totalPages }).map((_,i) => (
            <span key={i} style={{ width: i===page ? 12 : 4, height:3, borderRadius:2, background: i===page ? '#22c55e' : '#222', transition:'all 0.3s' }} />
          ))}
        </div>
      </div>
      <div key={page} style={{ animation: visible ? 'news-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards' : 'none', opacity: visible ? undefined : 0, transition:'opacity 0.3s' }}>
        {items.map((n, i) => (
          <div key={n.id} style={{ display:'flex', gap:8, padding:'7px 0', borderBottom: i < items.length - 1 ? '1px solid #111' : 'none' }}>
            <div style={{ width:5, height:5, borderRadius:3, background: n.neg ? '#ef4444' : '#22c55e', marginTop:5, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:12, fontWeight:600, color:'#ccc', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.4, margin:0 }}>{n.t}</p>
              <p style={{ fontSize:10, color:'#333', fontFamily:M, margin:'1px 0 0' }}>{n.src} · {n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── HomeList ─────────────────────────────────────────────────────────────────
function HomeList({ onProduct, activeId }: { onProduct: (p: Product) => void; activeId: string | null }) {
  return (
    <div>
      <div style={{ padding:'14px 16px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:18, fontWeight:900, color:'#e5e5e5', fontFamily:S }}>ホーム</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:3, background:'#22c55e', boxShadow:'0 0 8px rgba(34,197,94,0.4)', display:'inline-block' }} />
          <span style={{ fontSize:10, fontFamily:M, color:'#444' }}>LIVE</span>
        </div>
      </div>

      <NewsTicker />

      {/* Market */}
      <div style={{ padding:'0 16px', marginBottom:12 }}>
        <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, margin:'0 0 6px' }}>MARKET INDEX</p>
        <div style={{ overflow:'hidden', position:'relative' }}>
          {/* fade edges */}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:24, background:'linear-gradient(to right, #050505, transparent)', zIndex:1, pointerEvents:'none' }} />
          <div style={{ position:'absolute', right:0, top:0, bottom:0, width:24, background:'linear-gradient(to left, #050505, transparent)', zIndex:1, pointerEvents:'none' }} />
          <style>{`@keyframes mkt-scroll { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }`}</style>
          <div style={{ display:'flex', gap:6, width:'max-content', animation:'mkt-scroll 40s linear infinite' }}>
            {[...MKT, ...MKT].map((m,i) => (
              <div key={i} style={{ flexShrink:0, minWidth:88, background:'#0a0a0a', border:'1px solid #141414', borderRadius:5, padding:'8px 10px' }}>
                <p style={{ fontSize:10, color:'#555', margin:0 }}>{m.name}</p>
                <p style={{ fontSize:12, fontWeight:700, fontFamily:M, color:'#ccc', margin:'2px 0 0' }}>{m.avg.toLocaleString()}</p>
                <p style={{ fontSize:10, fontWeight:700, fontFamily:M, color: m.chg>=0 ? '#22c55e' : '#ef4444', margin:0 }}>{m.chg>=0 ? '+' : ''}{m.chg}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 急落ランキング */}
      <div style={{ padding:'0 16px 6px', display:'flex', justifyContent:'space-between' }}>
        <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, margin:0 }}>急落ランキング</p>
        <span style={{ fontSize:10, color:'#333', fontFamily:M }}>{PRODUCTS.filter(p=>p.chg<0).length}件</span>
      </div>
      <div style={{ borderTop:'1px solid #111' }}>
        {PRODUCTS.filter(p=>p.chg<0).sort((a,b)=>a.chg-b.chg).slice(0,5).map((p,i) => (
          <ProductRow key={p.id} p={p} rank={i+1} onClick={onProduct} active={activeId===p.id} delay={0.05+i*0.03} />
        ))}
      </div>

      {/* 急上昇ランキング */}
      <div style={{ padding:'12px 16px 6px', display:'flex', justifyContent:'space-between' }}>
        <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, margin:0 }}>急上昇ランキング</p>
        <span style={{ fontSize:10, color:'#333', fontFamily:M }}>{PRODUCTS.filter(p=>p.chg>0).length}件</span>
      </div>
      <div style={{ borderTop:'1px solid #111' }}>
        {PRODUCTS.filter(p=>p.chg>0).sort((a,b)=>b.chg-a.chg).slice(0,5).map((p,i) => (
          <ProductRow key={p.id} p={p} rank={i+1} onClick={onProduct} active={activeId===p.id} delay={0.05+i*0.03} />
        ))}
        {PRODUCTS.filter(p=>p.chg>0).length === 0 && (
          <p style={{ textAlign:'center', padding:20, color:'#333', fontSize:12 }}>該当なし</p>
        )}
      </div>
    </div>
  )
}

// ─── RankingList ──────────────────────────────────────────────────────────────
function RankingList({ onProduct, activeId }: { onProduct: (p: Product) => void; activeId: string | null }) {
  const [mode, setMode] = useState<'down'|'up'>('down')
  const [cat, setCat] = useState('すべて')
  const [sort, setSort] = useState('score')

  const filtered = useMemo(() => {
    let items = mode==='down' ? PRODUCTS.filter(p=>p.chg<0) : PRODUCTS.filter(p=>p.chg>0)
    if (cat!=='すべて') items = items.filter(p=>p.cat===cat)
    return [...items].sort((a,b) =>
      sort==='score' ? b.score-a.score :
      sort==='roi' ? b.roi-a.roi :
      sort==='demand' ? b.demand-a.demand :
      b.exp.profit-a.exp.profit
    )
  }, [mode, cat, sort])

  return (
    <div>
      <div style={{ padding:'14px 16px 10px' }}>
        <span style={{ fontSize:18, fontWeight:900, color:'#e5e5e5', fontFamily:S }}>ランキング</span>
      </div>

      <div style={{ display:'flex', margin:'0 16px 8px', border:'1px solid #1a1a1a', borderRadius:6, overflow:'hidden' }}>
        {([['down','急落'],['up','急騰']] as [string,string][]).map(([k,l]) => (
          <button key={k} onClick={()=>setMode(k as 'down'|'up')} style={{ flex:1, padding:'7px 0', background: mode===k ? (k==='down' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)') : 'transparent', border:'none', color: mode===k ? (k==='down' ? '#ef4444' : '#22c55e') : '#444', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:S, borderRight: k==='down' ? '1px solid #1a1a1a' : 'none' }}>
            {k==='down' ? '▼' : '▲'} {l}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', gap:5, padding:'0 16px', marginBottom:6, overflowX:'auto' }}>
        {CATS.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{ padding:'4px 10px', borderRadius:16, border: cat===c ? '1px solid #333' : '1px solid #1a1a1a', background: cat===c ? '#1a1a1a' : 'transparent', color: cat===c ? '#ccc' : '#555', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', fontFamily:S }}>{c}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:3, padding:'0 16px 6px' }}>
        {SORTS.map(([k,l]) => (
          <button key={k} onClick={()=>setSort(k)} style={{ padding:'2px 7px', borderRadius:3, border:'none', background: sort===k ? 'rgba(34,197,94,0.1)' : 'transparent', color: sort===k ? '#22c55e' : '#444', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:M }}>{l}</button>
        ))}
      </div>

      <div style={{ borderTop:'1px solid #111' }}>
        {filtered.map((p,i) => <ProductRow key={p.id} p={p} rank={i+1} onClick={onProduct} active={activeId===p.id} delay={i*0.02} />)}
        {filtered.length===0 && <p style={{ textAlign:'center', padding:40, color:'#333', fontSize:13 }}>該当なし</p>}
      </div>
    </div>
  )
}

// ─── NewsList ─────────────────────────────────────────────────────────────────
function NewsList() {
  const [cat, setCat] = useState('すべて')
  const filtered = cat==='すべて' ? NEWS : NEWS.filter(n=>n.cats.includes(cat))

  return (
    <div>
      <div style={{ padding:'14px 16px 10px' }}>
        <span style={{ fontSize:18, fontWeight:900, color:'#e5e5e5', fontFamily:S }}>ニュース</span>
      </div>
      <div style={{ display:'flex', gap:5, padding:'0 16px', marginBottom:10, overflowX:'auto' }}>
        {CATS.map(c => (
          <button key={c} onClick={()=>setCat(c)} style={{ padding:'4px 10px', borderRadius:16, border: cat===c ? '1px solid #333' : '1px solid #1a1a1a', background: cat===c ? '#1a1a1a' : 'transparent', color: cat===c ? '#ccc' : '#555', fontSize:10, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', fontFamily:S }}>{c}</button>
        ))}
      </div>
      {filtered.map((n,i) => (
        <F key={n.id} delay={i*0.03}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #111' }}>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ width:5, height:5, borderRadius:3, background: n.neg ? '#ef4444' : '#22c55e', marginTop:6, flexShrink:0 }} />
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#ccc', lineHeight:1.4, fontFamily:S, margin:0 }}>{n.t}</p>
                <p style={{ fontSize:11, color: n.neg ? '#ef4444' : '#22c55e', margin:'4px 0 0' }}>→ {n.sum}</p>
                <div style={{ display:'flex', gap:6, marginTop:4 }}>
                  <span style={{ fontSize:10, color:'#444', fontFamily:M }}>{n.src} · {n.time}</span>
                </div>
              </div>
            </div>
          </div>
        </F>
      ))}
    </div>
  )
}

// ─── SavedList ────────────────────────────────────────────────────────────────
function SavedList({ portfolios, onUpdate, onProduct, activeId }: {
  portfolios: Portfolio[]
  onUpdate: (ps: Portfolio[]) => void
  onProduct: (p: Product) => void
  activeId: string | null
}) {
  const [activePortId, setActivePortId] = useState(portfolios[0]?.id ?? '')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const portfolio = portfolios.find(p => p.id === activePortId) ?? portfolios[0]
  const items = PRODUCTS.filter(p => portfolio?.productIds.includes(p.id) ?? false)

  const createPortfolio = () => {
    const name = newName.trim()
    if (!name) { setCreating(false); return }
    const id = `p${Date.now()}`
    const updated = [...portfolios, { id, name, productIds: [] }]
    onUpdate(updated)
    setActivePortId(id)
    setNewName('')
    setCreating(false)
  }

  const removeItem = (productId: string) => {
    onUpdate(portfolios.map(p => p.id === portfolio?.id
      ? { ...p, productIds: p.productIds.filter(x => x !== productId) }
      : p
    ))
  }

  const deletePortfolio = (portId: string) => {
    if (portfolios.length <= 1) return
    const updated = portfolios.filter(p => p.id !== portId)
    onUpdate(updated)
    if (activePortId === portId) setActivePortId(updated[0].id)
  }

  return (
    <div>
      <div style={{ padding:'14px 16px 8px' }}>
        <span style={{ fontSize:18, fontWeight:900, color:'#e5e5e5', fontFamily:S }}>保存</span>
      </div>

      {/* Portfolio tabs */}
      <div style={{ display:'flex', gap:6, padding:'0 16px 10px', overflowX:'auto' }}>
        {portfolios.map(port => (
          <div key={port.id} style={{ position:'relative', flexShrink:0 }}>
            <button
              onClick={() => setActivePortId(port.id)}
              style={{ padding:'5px 10px', borderRadius:8, border: activePortId===port.id ? '1px solid #22c55e' : '1px solid #1a1a1a', background: activePortId===port.id ? 'rgba(34,197,94,0.08)' : 'transparent', color: activePortId===port.id ? '#22c55e' : '#555', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:S, paddingRight: portfolios.length > 1 ? 24 : 10 }}
            >
              {port.name}
              <span style={{ fontSize:10, fontFamily:M, marginLeft:5, color: activePortId===port.id ? 'rgba(34,197,94,0.6)' : '#333' }}>{port.productIds.length}</span>
            </button>
            {portfolios.length > 1 && (
              <button
                onClick={() => deletePortfolio(port.id)}
                style={{ position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#333', fontSize:10, cursor:'pointer', padding:'0 2px', lineHeight:1 }}
              >×</button>
            )}
          </div>
        ))}

        {creating ? (
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={createPortfolio}
            onKeyDown={e => { if (e.key==='Enter') createPortfolio(); if (e.key==='Escape') { setCreating(false); setNewName('') } }}
            placeholder="リスト名"
            style={{ width:90, padding:'4px 8px', background:'#0a0a0a', border:'1px solid #22c55e', borderRadius:8, color:'#e5e5e5', fontSize:11, fontFamily:S, outline:'none' }}
          />
        ) : (
          <button
            onClick={() => setCreating(true)}
            style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #1a1a1a', background:'transparent', color:'#444', fontSize:12, cursor:'pointer', flexShrink:0 }}
          >＋</button>
        )}
      </div>

      {/* Items */}
      <div style={{ borderTop:'1px solid #111' }}>
        {items.map((p,i) => (
          <ProductRow key={p.id} p={p} rank={i+1} onClick={onProduct} active={activeId===p.id} delay={i*0.03} />
        ))}
        {items.length===0 && (
          <div style={{ textAlign:'center', padding:'50px 20px', color:'#333' }}>
            <p style={{ fontSize:22, marginBottom:8 }}>☆</p>
            <p style={{ fontSize:12, color:'#444' }}>商品の ☆ をタップして追加</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PriceChartSection ────────────────────────────────────────────────────────
interface PeriodStats { lo: number; hi: number; avg: number; mid: number }

function usePriceChartData(product: Product, chartTab: 'price' | 'bsr', period: string) {
  const priceData = useMemo(() => generateMockPriceHistory(product.cur, product.avg, product.hi, product.lo), [product.id, product.cur, product.avg, product.hi, product.lo])
  const bsrData = useMemo(() => generateMockBSRHistory(product.bh), [product.id, product.bh])
  const fullData = chartTab === 'price' ? priceData : bsrData
  const sliced = useMemo(() => sliceByPeriod(fullData, period), [fullData, period])
  const stats: PeriodStats = useMemo(() => {
    const vals = sliced.map(d => d.value)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    const mid = Math.round((lo + hi) / 2)
    return { lo, hi, avg, mid }
  }, [sliced])
  return { sliced, stats }
}

function ChartWithStats({ product, chartTab, period, down, mob }: {
  product: Product
  chartTab: 'price' | 'bsr'
  period: string
  down: boolean
  mob: boolean
}) {
  const { sliced, stats } = usePriceChartData(product, chartTab, period)
  const color = down ? '#ef4444' : '#22c55e'

  return (
    <>
      <PriceChart data={sliced} color={color} height={mob ? 160 : 220} />
      <div style={{ display:'flex', justifyContent:'space-around', padding:'8px 0', marginTop:4, borderTop:'1px solid #111', borderBottom:'1px solid #111' }}>
        {([['最安',stats.lo,'#ef4444'],['中央',stats.mid,'#888'],['平均',stats.avg,'#555'],['最高',stats.hi,'#22c55e']] as [string,number,string][]).map(([l,v,c]) => (
          <div key={l} style={{ textAlign:'center' }}>
            <p style={{ fontSize:9, color:'#333', fontFamily:M, margin:0 }}>{l}</p>
            <p style={{ fontSize:14, fontWeight:700, fontFamily:M, color:c, margin:'2px 0 0' }}>{v.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────
function DetailPanel({ p, saved, onToggle, onBack, mob, portfolios, onUpdatePortfolios }: {
  p: Product | null
  saved: boolean
  onToggle: (id: string) => void
  onBack: () => void
  mob: boolean
  portfolios: Portfolio[]
  onUpdatePortfolios: (ps: Portfolio[]) => void
}) {
  const [chartTab, setChartTab] = useState<'price'|'bsr'>('price')
  const [period, setPeriod] = useState('3M')
  const [dotMenu, setDotMenu] = useState(false)

  if (!p) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#222' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:32, marginBottom:8, opacity:0.2 }}>◆</p>
        <p style={{ fontSize:13, color:'#444' }}>商品を選択してください</p>
      </div>
    </div>
  )

  const down = p.chg < 0
  const relNews = NEWS.filter(n => p.cat && n.cats.includes(p.cat))
  const px = mob ? '16px' : '20px'

  const toggleInPortfolio = (portId: string) => {
    onUpdatePortfolios(portfolios.map(port => port.id === portId
      ? { ...port, productIds: port.productIds.includes(p!.id)
          ? port.productIds.filter(x => x !== p!.id)
          : [...port.productIds, p!.id] }
      : port
    ))
  }

  return (
    <div style={{ height:'100%', overflowY:'auto' }} onClick={() => setDotMenu(false)}>
      {/* Header */}
      <div style={{ padding:`12px ${px}`, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #111' }}>
        {mob && <button onClick={onBack} style={{ background:'none', border:'none', color:'#22c55e', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:M }}>← 戻る</button>}
        {!mob && <span style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1 }}>PRODUCT DETAIL</span>}
        <div style={{ display:'flex', alignItems:'center', gap:4, position:'relative' }}>
          <button onClick={()=>onToggle(p.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color: saved ? '#e5e5e5' : '#333', padding:'4px' }}>{saved ? '★' : '☆'}</button>
          <button
            onClick={e => { e.stopPropagation(); setDotMenu(v => !v) }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#444', fontSize:16, padding:'4px 6px', lineHeight:1, letterSpacing:2 }}
          >⋯</button>
          {dotMenu && (
            <div
              onClick={e => e.stopPropagation()}
              style={{ position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:20, background:'#111', border:'1px solid #1a1a1a', borderRadius:10, overflow:'hidden', minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.7)' }}
            >
              <p style={{ fontSize:9, fontFamily:M, color:'#333', letterSpacing:1, padding:'8px 14px 4px', margin:0 }}>リストに追加</p>
              {portfolios.map(port => {
                const inList = port.productIds.includes(p.id)
                return (
                  <button
                    key={port.id}
                    onClick={() => { toggleInPortfolio(port.id); setDotMenu(false) }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', padding:'9px 14px', background:'none', border:'none', color: inList ? '#22c55e' : '#aaa', fontSize:12, fontFamily:S, textAlign:'left', cursor:'pointer', borderTop:'1px solid #1a1a1a' }}
                  >
                    {port.name}
                    <span style={{ fontSize:14 }}>{inList ? '✓' : '＋'}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <F delay={0}>
        <div style={{ padding:`14px ${px} 12px`, display:'flex', gap:20, alignItems:'flex-start' }}>
          {/* Product image */}
          <div style={{ flexShrink:0, width:95, height:95, borderRadius:8, overflow:'hidden', background:'#0e0e0e', border:'1px solid #1a1a1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img
              src={`https://picsum.photos/seed/${p.id}/200/200`}
              alt={p.name}
              width={95}
              height={95}
              style={{ width:'100%', height:'100%', objectFit:'contain' }}
              onError={e => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                el.parentElement!.innerHTML = '<span style="font-size:22px;opacity:0.15">◆</span>'
              }}
            />
          </div>
          {/* Text info */}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize: mob?15:16, fontWeight:800, color:'#e5e5e5', fontFamily:S, margin:0, lineHeight:1.3 }}>{p.name}</p>
            {p.sub && <p style={{ fontSize:11, color:'#444', margin:'2px 0 0' }}>{p.sub}</p>}
            <p style={{ fontSize:10, color:'#333', fontFamily:M, margin:'4px 0 0' }}>ASIN: {p.id}</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:8, marginTop:8 }}>
              <span style={{ fontSize: mob?22:24, fontWeight:900, fontFamily:M, color:'#e5e5e5' }}>{p.cur.toLocaleString()}</span>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:M, color: down ? '#ef4444' : '#22c55e' }}>{down ? '▼' : '▲'}{Math.abs(p.chg)}%</span>
            </div>
          </div>
        </div>
      </F>

      {/* Chart */}
      <F delay={0.06}>
        <div style={{ padding:`0 ${px}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ display:'flex', gap:4 }}>
              {([['price','価格'],['bsr','BSR']] as [string,string][]).map(([k,l]) => (
                <button key={k} onClick={()=>setChartTab(k as 'price'|'bsr')} style={{ padding:'3px 8px', borderRadius:4, border:'none', background: chartTab===k ? '#1a1a1a' : 'transparent', color: chartTab===k ? '#ccc' : '#444', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:M }}>{l}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:2 }}>
              {['1W','1M','3M','6M','1Y'].map(x => (
                <button key={x} onClick={()=>setPeriod(x)} style={{ padding:'2px 5px', borderRadius:3, border:'none', background: period===x ? '#1a1a1a' : 'transparent', color: period===x ? '#ccc' : '#444', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:M }}>{x}</button>
              ))}
            </div>
          </div>
          <ChartWithStats product={p} chartTab={chartTab} period={period} down={down} mob={mob} />
        </div>
      </F>

      {/* Scores & Metrics */}
      <F delay={0.1}>
        <div style={{ padding:`0 ${px}` }}>
          <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, paddingTop:12, paddingBottom:6, margin:0 }}>指標</p>
          {([
            ['スコア', `${p.score}`, p.score>=70 ? '#22c55e' : p.score>=40 ? '#e5e5e5' : '#ef4444'],
            ['需要度', `${p.demand}%`, p.demand>=70 ? '#22c55e' : p.demand>=40 ? '#e5e5e5' : '#ef4444'],
            ['ROI', `${p.roi}%`, p.roi>=30 ? '#22c55e' : p.roi>=15 ? '#e5e5e5' : '#ef4444'],
            ['月間販売数', `${p.sales}個`, '#ccc'],
            ['出品者数', `${p.sellers}人`, '#ccc'],
            ['在庫切れ率', `${p.oos}%`, p.oos>=50 ? '#22c55e' : '#ccc'],
          ] as [string,string,string][]).map(([l,v,c]) => (
            <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #0e0e0e' }}>
              <span style={{ fontSize:12, color:'#555' }}>{l}</span>
              <span style={{ fontSize:12, fontWeight:700, fontFamily:M, color:c }}>{v}</span>
            </div>
          ))}
        </div>
      </F>

      {/* Amazon link */}
      <F delay={0.14}>
        <div style={{ padding:`14px ${px}` }}>
          <a href={`https://www.amazon.co.jp/dp/${p.id}`} target="_blank" rel="noopener noreferrer" style={{ display:'block', textAlign:'center', padding:'11px', borderRadius:6, background:'#22c55e', color:'#050505', fontSize:14, fontWeight:700, textDecoration:'none', fontFamily:S }}>Amazonで見る →</a>
        </div>
      </F>

      {/* Related news */}
      <F delay={0.26}>
        <div style={{ padding:`0 ${px} 16px` }}>
          <p style={{ fontSize:10, fontFamily:M, color:'#333', letterSpacing:1, margin:'0 0 8px' }}>関連ニュース</p>
          {relNews.length===0 ? (
            <p style={{ fontSize:12, color:'#333', textAlign:'center', padding:12 }}>なし</p>
          ) : (
            relNews.map((n,i) => (
              <div key={n.id} style={{ display:'flex', gap:8, padding:'7px 0', borderBottom: i<relNews.length-1 ? '1px solid #0e0e0e' : 'none' }}>
                <div style={{ width:5, height:5, borderRadius:3, background: n.neg ? '#ef4444' : '#22c55e', marginTop:5, flexShrink:0 }} />
                <div>
                  <p style={{ fontSize:12, fontWeight:600, color:'#999', lineHeight:1.4, margin:0 }}>{n.t}</p>
                  <p style={{ fontSize:10, color: n.neg ? '#ef4444' : '#22c55e', margin:'2px 0 0' }}>→ {n.sum}</p>
                  <p style={{ fontSize:10, color:'#333', fontFamily:M, margin:'2px 0 0' }}>{n.src} · {n.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </F>

      <p style={{ textAlign:'center', padding:'8px', fontSize:9, color:'#1a1a1a', fontFamily:M }}>スコアは過去データに基づく参考値です</p>
    </div>
  )
}

// ─── Sidebar (Desktop) ────────────────────────────────────────────────────────
type Tab = 'home' | 'ranking' | 'news' | 'saved'
const TABS: [Tab, string, string][] = [['home','ホーム','⬡'],['ranking','ランキング','◆'],['news','ニュース','◈'],['saved','保存','☆']]

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div style={{ width:180, minHeight:'100vh', background:'#050505', borderRight:'1px solid #111', display:'flex', flexDirection:'column', flexShrink:0 }}>
      <div style={{ padding:'20px 16px 24px' }}>
        <p style={{ fontSize:16, fontWeight:900, color:'#e5e5e5', fontFamily:S, margin:0 }}>SedoriHack</p>
        <p style={{ fontSize:9, color:'#333', fontFamily:M, margin:'2px 0 0' }}>商品を、銘柄のように分析する</p>
      </div>
      {TABS.map(([k,l,ic]) => (
        <button key={k} onClick={()=>setTab(k)} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'10px 16px', background:'none', border:'none', borderLeft: tab===k ? '2px solid #22c55e' : '2px solid transparent', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:14, color: tab===k ? '#22c55e' : '#333' }}>{ic}</span>
          <span style={{ fontSize:13, fontWeight: tab===k ? 700 : 500, color: tab===k ? '#e5e5e5' : '#555', fontFamily:S }}>{l}</span>
        </button>
      ))}
      <div style={{ flex:1 }} />
      <div style={{ padding:'12px 16px', borderTop:'1px solid #111' }}>
        <a href="/settings" style={{ display:'block', fontSize:10, color:'#333', fontFamily:M, textDecoration:'none', marginBottom:6 }}>設定</a>
        <p style={{ fontSize:9, color:'#222', fontFamily:M, margin:0 }}>© 2026 SedoriHack</p>
      </div>
    </div>
  )
}

// ─── TabBar (Mobile) ──────────────────────────────────────────────────────────
function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'rgba(5,5,5,0.92)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', borderTop:'1px solid #141414', display:'flex', zIndex:50, paddingBottom:'env(safe-area-inset-bottom, 12px)' }}>
      {TABS.map(([k,l,ic]) => (
        <button key={k} onClick={()=>setTab(k)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, padding:'8px 0', background:'none', border:'none', cursor:'pointer' }}>
          <span style={{ fontSize:16, color: tab===k ? '#22c55e' : '#333' }}>{ic}</span>
          <span style={{ fontSize:9, fontWeight:600, color: tab===k ? '#22c55e' : '#444', fontFamily:M }}>{l}</span>
        </button>
      ))}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function DashboardApp() {
  const w = useW()
  const mob = w < 768
  const [tab, setTab] = useState<Tab>('home')
  const [detail, setDetail] = useState<Product | null>(null)
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    { id: 'p0', name: 'ウォッチリスト', productIds: ['B0CX1234AB','B0AB5678CD'] },
  ])
  const allSavedIds = useMemo(() => new Set(portfolios.flatMap(p => p.productIds)), [portfolios])
  const toggle = (id: string) => setPortfolios(ps => ps.map((p, i) => i === 0
    ? { ...p, productIds: p.productIds.includes(id) ? p.productIds.filter(x=>x!==id) : [...p.productIds, id] }
    : p
  ))

  // Mobile
  if (mob) return (
    <div style={{ background:'#050505', color:'#ccc', minHeight:'100vh', fontFamily:S }}>
      <div style={{ position:'fixed', inset:0, opacity:0.02, pointerEvents:'none', backgroundImage:NOISE_BG }} />
      {detail ? (
        <DetailPanel p={detail} saved={allSavedIds.has(detail.id)} onToggle={toggle} onBack={()=>setDetail(null)} mob portfolios={portfolios} onUpdatePortfolios={setPortfolios} />
      ) : (
        <>
          <div style={{ paddingBottom:70, position:'relative', zIndex:1 }}>
            {tab==='home' && <HomeList onProduct={setDetail} activeId={null} />}
            {tab==='ranking' && <RankingList onProduct={setDetail} activeId={null} />}
            {tab==='news' && <NewsList />}
            {tab==='saved' && <SavedList portfolios={portfolios} onUpdate={setPortfolios} onProduct={setDetail} activeId={null} />}
          </div>
          <TabBar tab={tab} setTab={setTab} />
        </>
      )}
    </div>
  )

  // Desktop
  return (
    <div style={{ display:'flex', height:'100vh', background:'#050505', color:'#ccc', fontFamily:S, overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, opacity:0.02, pointerEvents:'none', backgroundImage:NOISE_BG }} />
      <Sidebar tab={tab} setTab={setTab} />
      <div style={{ width: w>=1200 ? 420 : 360, minWidth:320, borderRight:'1px solid #111', overflowY:'auto', position:'relative', zIndex:1, flexShrink:0 }}>
        {tab==='home' && <HomeList onProduct={setDetail} activeId={detail?.id ?? null} />}
        {tab==='ranking' && <RankingList onProduct={setDetail} activeId={detail?.id ?? null} />}
        {tab==='news' && <NewsList />}
        {tab==='saved' && <SavedList portfolios={portfolios} onUpdate={setPortfolios} onProduct={setDetail} activeId={detail?.id ?? null} />}
      </div>
      <div style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1 }}>
        <DetailPanel p={detail} saved={detail ? allSavedIds.has(detail.id) : false} onToggle={toggle} onBack={()=>setDetail(null)} mob={false} portfolios={portfolios} onUpdatePortfolios={setPortfolios} />
      </div>
    </div>
  )
}
