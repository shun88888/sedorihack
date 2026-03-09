'use client'

import { useEffect, useRef } from 'react'
import { createChart, ColorType, LineStyle, AreaSeries } from 'lightweight-charts'
import type { IChartApi, Time } from 'lightweight-charts'

interface ChartDataPoint {
  time: string  // 'YYYY-MM-DD'
  value: number
}

interface PriceChartProps {
  data: ChartDataPoint[]
  color?: string
  height?: number
}

export function generateMockPriceHistory(
  cur: number,
  avg: number,
  hi: number,
  lo: number,
  days: number = 365
): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  const now = new Date()
  // Work backwards from current price
  let price = cur
  const volatility = (hi - lo) / avg * 0.015
  const range = hi - lo

  // Generate data from oldest to newest
  const prices: number[] = [cur]
  for (let i = 1; i < days; i++) {
    // Random walk with mean reversion toward avg
    const meanReversion = (avg - price) * 0.008
    const noise = (Math.random() - 0.5) * range * volatility
    // Add some seasonal patterns
    const seasonal = Math.sin(i / 30 * Math.PI) * range * 0.02
    price = price + meanReversion + noise + seasonal
    price = Math.max(lo * 0.9, Math.min(hi * 1.1, price))
    prices.push(Math.round(price))
  }

  // Reverse so oldest is first, then assign dates
  prices.reverse()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (days - 1 - i))
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    points.push({ time: `${yyyy}-${mm}-${dd}`, value: prices[i] })
  }

  return points
}

export function generateMockBSRHistory(
  bh: number[],
  days: number = 365
): ChartDataPoint[] {
  const points: ChartDataPoint[] = []
  const now = new Date()
  const lastBsr = bh[bh.length - 1] * 1000
  const avgBsr = bh.reduce((a, b) => a + b, 0) / bh.length * 1000
  const maxBsr = Math.max(...bh) * 1000
  const minBsr = Math.min(...bh) * 1000
  const range = maxBsr - minBsr || avgBsr * 0.5

  let bsr = lastBsr
  const values: number[] = [bsr]

  for (let i = 1; i < days; i++) {
    const meanReversion = (avgBsr - bsr) * 0.01
    const noise = (Math.random() - 0.5) * range * 0.08
    const spike = Math.random() < 0.03 ? (Math.random() - 0.5) * range * 0.5 : 0
    bsr = bsr + meanReversion + noise + spike
    bsr = Math.max(500, Math.round(bsr))
    values.push(bsr)
  }

  values.reverse()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - (days - 1 - i))
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    points.push({ time: `${yyyy}-${mm}-${dd}`, value: values[i] })
  }

  return points
}

const PERIOD_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
}

export default function PriceChart({ data, color = '#22c55e', height = 200 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#555',
        fontFamily: "'IBM Plex Mono','Menlo',monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#111', style: LineStyle.Dotted },
        horzLines: { color: '#111', style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: { color: '#333', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a1a1a' },
        horzLine: { color: '#333', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#1a1a1a' },
      },
      rightPriceScale: {
        borderColor: '#111',
        scaleMargins: { top: 0.1, bottom: 0.05 },
      },
      timeScale: {
        borderColor: '#111',
        timeVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    })

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      lineWidth: 2,
      topColor: `${color}20`,
      bottomColor: `${color}00`,
      crosshairMarkerBackgroundColor: color,
      crosshairMarkerBorderColor: color,
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `¥${Math.round(price).toLocaleString()}`,
      },
    })

    areaSeries.setData(data as { time: Time; value: number }[])
    chart.timeScale().fitContent()

    chartRef.current = chart

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width })
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, color, height])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <style>{`.tv-lightweight-charts a[href*="tradingview"] { opacity: 0 !important; pointer-events: none !important; }`}</style>
    </div>
  )
}

export function sliceByPeriod(data: ChartDataPoint[], period: string): ChartDataPoint[] {
  const days = PERIOD_DAYS[period] ?? 90
  return data.slice(-days)
}
