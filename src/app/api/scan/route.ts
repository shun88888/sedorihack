import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findDroppedProducts, getProductDetails, sleep } from '@/lib/keepa/client'
import { scoreProduct } from '@/lib/scoring/engine'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Authenticate cron request
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create Supabase admin client inside handler to avoid build-time evaluation
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Find dropped products via Product Finder
    const finderResult = await findDroppedProducts(0)
    const asins = finderResult.asinList ?? []

    if (asins.length === 0) {
      return NextResponse.json({ message: 'No products found', count: 0 })
    }

    // 2. Fetch product details in batches of 20
    const BATCH_SIZE = 20
    const scored = []

    for (let i = 0; i < asins.length; i += BATCH_SIZE) {
      const batch = asins.slice(i, i + BATCH_SIZE)
      const detailResult = await getProductDetails(batch)

      for (const product of detailResult.products ?? []) {
        const result = scoreProduct(product)
        if (result) scored.push(result)
      }

      // Respect Keepa rate limit: 100 tokens/min
      if (i + BATCH_SIZE < asins.length) {
        await sleep(2000)
      }
    }

    if (scored.length === 0) {
      return NextResponse.json({ message: 'No qualifying products', count: 0 })
    }

    // 3. Save to Supabase (upsert by ASIN to avoid duplicates)
    const rows = scored.map((s) => ({
      asin: s.asin,
      title: s.title,
      image_url: s.imageUrl,
      buy_price: s.buyPrice,
      sell_price: s.sellPrice,
      profit: s.profit,
      roi: s.roi,
      demand_score: s.demandScore,
      sedori_score: s.sedoriScore,
      daily_drop: s.dailyDrop,
      sales_rank: s.salesRank,
      seller_count: s.sellerCount,
      bsr_drop_count: s.bsrDropCount,
      out_of_stock_rate: s.outOfStockRate,
      price_recovery_days: s.priceRecoveryDays,
      bsr_trend: s.bsrTrend,
      fee: s.fee,
      shipping_cost: s.shippingCost,
      review_count: s.reviewCount,
      category: s.category,
      detected_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('scored_items')
      .upsert(rows, { onConflict: 'asin' })

    if (error) throw error

    // 4. Delete old records (keep only latest 200)
    await supabase.rpc('cleanup_old_scored_items')

    return NextResponse.json({
      message: 'Scan complete',
      found: asins.length,
      qualified: scored.length,
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json(
      { error: 'Scan failed', detail: String(err) },
      { status: 500 }
    )
  }
}
