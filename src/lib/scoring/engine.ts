import { KEEPA_EPOCH_OFFSET, CSV_INDEX, type KeepaProduct } from '../keepa/types'

// Keepa time → Date
function keepaTimeToDate(keepaTime: number): Date {
  return new Date((keepaTime + KEEPA_EPOCH_OFFSET) * 60000)
}

// Parse csv array into [{time, value}], filtering by days and excluding -1
function parseCsv(
  csv: number[] | null | undefined,
  days: number,
  includeNegative = false
): Array<{ time: Date; value: number }> {
  if (!csv || csv.length < 2) return []
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const result: Array<{ time: Date; value: number }> = []
  for (let i = 0; i < csv.length - 1; i += 2) {
    const date = keepaTimeToDate(csv[i])
    if (date.getTime() >= cutoff) {
      if (includeNegative || csv[i + 1] !== -1) {
        result.push({ time: date, value: csv[i + 1] })
      }
    }
  }
  return result
}

// ── BSR Drop Score (weight: 40% in demand) ──────────────────────────────────
function calcBsrDropScore(bsrCsv: number[] | null | undefined): {
  score: number
  dropCount: number
} {
  const entries = parseCsv(bsrCsv, 30)
  let dropCount = 0
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].value < entries[i - 1].value) dropCount++
  }

  let score: number
  if (dropCount >= 30) score = 100
  else if (dropCount >= 15) score = 80
  else if (dropCount >= 10) score = 60
  else if (dropCount >= 5) score = 40
  else score = 20

  return { score, dropCount }
}

// ── Out-of-Stock Rate (weight: 30% in demand) ────────────────────────────────
// Amazon price = -1 means Amazon is OOS
function calcOutOfStockScore(amazonPriceCsv: number[] | null | undefined): {
  score: number
  rate: number
} {
  if (!amazonPriceCsv || amazonPriceCsv.length < 2) return { score: 20, rate: 0 }

  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  let oosCount = 0
  let totalCount = 0

  for (let i = 0; i < amazonPriceCsv.length - 1; i += 2) {
    const date = keepaTimeToDate(amazonPriceCsv[i])
    if (date.getTime() >= cutoff) {
      totalCount++
      if (amazonPriceCsv[i + 1] === -1) oosCount++
    }
  }

  if (totalCount === 0) return { score: 20, rate: 0 }

  const rate = (oosCount / totalCount) * 100

  let score: number
  if (rate >= 70 && rate <= 90) score = 100
  else if (rate >= 50 && rate < 70) score = 80
  else if (rate > 90 && rate < 100) score = 70
  else if (rate >= 30 && rate < 50) score = 40
  else score = 20

  return { score, rate }
}

// ── Price Recovery Speed (weight: 20% in demand) ─────────────────────────────
// After Amazon restocks, how many days to return to 80% of median price
function calcPriceRecoveryScore(amazonPriceCsv: number[] | null | undefined): {
  score: number
  days: number
} {
  if (!amazonPriceCsv || amazonPriceCsv.length < 4) return { score: 60, days: 14 }

  // Get all non-OOS prices to compute median
  const validPrices: number[] = []
  for (let i = 0; i < amazonPriceCsv.length - 1; i += 2) {
    if (amazonPriceCsv[i + 1] > 0) validPrices.push(amazonPriceCsv[i + 1])
  }
  if (validPrices.length === 0) return { score: 60, days: 14 }

  validPrices.sort((a, b) => a - b)
  const medianPrice = validPrices[Math.floor(validPrices.length / 2)]
  const targetPrice = medianPrice * 0.8

  // Find first OOS → restock transition in last 90 days
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  let recoveryDays = 14 // default

  for (let i = 2; i < amazonPriceCsv.length - 1; i += 2) {
    const date = keepaTimeToDate(amazonPriceCsv[i])
    if (date.getTime() < cutoff) continue

    const prevValue = amazonPriceCsv[i - 1]
    const currValue = amazonPriceCsv[i + 1]

    // OOS → in stock transition
    if (prevValue === -1 && currValue > 0) {
      const restockDate = date.getTime()
      // Find when price reaches target
      for (let j = i + 2; j < amazonPriceCsv.length - 1; j += 2) {
        if (amazonPriceCsv[j + 1] >= targetPrice) {
          const recoveryDate = keepaTimeToDate(amazonPriceCsv[j]).getTime()
          recoveryDays = Math.round((recoveryDate - restockDate) / (24 * 60 * 60 * 1000))
          break
        }
      }
      break
    }
  }

  let score: number
  if (recoveryDays <= 3) score = 100
  else if (recoveryDays <= 7) score = 80
  else if (recoveryDays <= 14) score = 60
  else if (recoveryDays <= 30) score = 40
  else score = 20

  return { score, days: recoveryDays }
}

// ── BSR Trend (weight: 10% in demand) ────────────────────────────────────────
function calcBsrTrendScore(bsrCsv: number[] | null | undefined): {
  score: number
  trendPercent: number
} {
  const entries = parseCsv(bsrCsv, 30)
  if (entries.length < 2) return { score: 50, trendPercent: 0 }

  const first = entries[0].value
  const last = entries[entries.length - 1].value
  // Improvement = BSR decreased (smaller = better rank)
  const trendPercent = ((first - last) / first) * 100

  let score: number
  if (trendPercent >= 30) score = 100
  else if (trendPercent >= 15) score = 80
  else if (trendPercent >= 0) score = 50
  else score = 20

  return { score, trendPercent }
}

// ── Demand Score ──────────────────────────────────────────────────────────────
function calcDemandScore(
  bsrCsv: number[] | null | undefined,
  amazonPriceCsv: number[] | null | undefined
): {
  score: number
  bsrDropScore: number
  dropCount: number
  oosScore: number
  oosRate: number
  recoveryScore: number
  recoveryDays: number
  trendScore: number
  trendPercent: number
} {
  const bsrDrop = calcBsrDropScore(bsrCsv)
  const oos = calcOutOfStockScore(amazonPriceCsv)
  const recovery = calcPriceRecoveryScore(amazonPriceCsv)
  const trend = calcBsrTrendScore(bsrCsv)

  const score = Math.round(
    bsrDrop.score * 0.4 +
    oos.score * 0.3 +
    recovery.score * 0.2 +
    trend.score * 0.1
  )

  return {
    score,
    bsrDropScore: bsrDrop.score,
    dropCount: bsrDrop.dropCount,
    oosScore: oos.score,
    oosRate: oos.rate,
    recoveryScore: recovery.score,
    recoveryDays: recovery.days,
    trendScore: trend.score,
    trendPercent: trend.trendPercent,
  }
}

// ── Profit Score (weight: 30%) ────────────────────────────────────────────────
export function calcFee(price: number, category: string): number {
  const rates: Record<string, number> = {
    ゲーム: 0.08,
    家電: 0.08,
    おもちゃ: 0.1,
    ファッション: 0.12,
    靴: 0.15,
    本: 0.15,
  }
  const matchedCategory = Object.keys(rates).find((k) => category.includes(k))
  const rate = matchedCategory ? rates[matchedCategory] : 0.1
  return Math.max(Math.round(price * rate), 30)
}

function calcProfitScore(roi: number): number {
  return Math.min(Math.round((roi / 50) * 100), 100)
}

// ── Price Stability Score (weight: 15%) ──────────────────────────────────────
function calcPriceStabilityScore(amazonPriceCsv: number[] | null | undefined): number {
  const entries = parseCsv(amazonPriceCsv, 30)
  if (entries.length < 2) return 50

  const prices = entries.map((e) => e.value)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? stdDev / mean : 1

  // Lower CV = more stable = higher score
  const score = Math.min(Math.round((1 / (cv + 0.01)) * 10), 100)
  return score
}

// ── Competitor Score (weight: 15%) ────────────────────────────────────────────
function calcCompetitorScore(sellerCount: number): number {
  if (sellerCount <= 2) return 100
  if (sellerCount <= 5) return 75
  if (sellerCount <= 10) return 50
  if (sellerCount <= 20) return 25
  return 10
}

// ── Score color ──────────────────────────────────────────────────────────────
export function getScoreColor(score: number): string {
  if (score >= 75) return '#00e676'
  if (score >= 50) return '#ffab00'
  return '#ff5252'
}

export function getScoreClass(score: number): string {
  if (score >= 75) return 'score-green'
  if (score >= 50) return 'score-yellow'
  return 'score-red'
}

// ── Main scoring function ─────────────────────────────────────────────────────
export interface ScoreResult {
  asin: string
  title: string
  imageUrl: string | null
  buyPrice: number
  sellPrice: number
  profit: number
  roi: number
  demandScore: number
  sedoriScore: number
  dailyDrop: number
  salesRank: number
  sellerCount: number
  bsrDropCount: number
  outOfStockRate: number
  priceRecoveryDays: number
  bsrTrend: number
  fee: number
  shippingCost: number
  reviewCount: number
  category: string
}

export function scoreProduct(
  product: KeepaProduct,
  shippingCost: number = 500
): ScoreResult | null {
  const amazonPriceCsv = product.csv?.[CSV_INDEX.AMAZON_PRICE]
  const bsrCsv = product.csv?.[CSV_INDEX.SALES_RANK]
  // seller count is read from stats.current below

  // Get current prices
  const stats = product.stats
  const currentAmazonPrice = stats?.current?.[CSV_INDEX.AMAZON_PRICE]
  const currentBsr = stats?.current?.[CSV_INDEX.SALES_RANK]
  const currentSellerCount = stats?.current?.[CSV_INDEX.COUNT_NEW] ?? 0

  // Must have a valid buy price
  if (!currentAmazonPrice || currentAmazonPrice <= 0) return null

  const buyPrice = currentAmazonPrice
  const category =
    product.categoryTree?.map((c) => c.name).join(' > ') ?? 'その他'

  // Sell price = 90-day median when Amazon has stock
  const validPrices: number[] = []
  if (amazonPriceCsv) {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    for (let i = 0; i < amazonPriceCsv.length - 1; i += 2) {
      const date = keepaTimeToDate(amazonPriceCsv[i])
      if (date.getTime() >= cutoff && amazonPriceCsv[i + 1] > 0) {
        validPrices.push(amazonPriceCsv[i + 1])
      }
    }
  }
  validPrices.sort((a, b) => a - b)
  const sellPrice =
    validPrices.length > 0
      ? validPrices[Math.floor(validPrices.length / 2)]
      : buyPrice

  const fee = calcFee(sellPrice, category)
  const profit = sellPrice - buyPrice - fee - shippingCost
  const roi = buyPrice > 0 ? (profit / buyPrice) * 100 : 0

  // Skip products that don't meet alert thresholds
  if (profit < 500 || roi < 15) return null
  if (currentBsr && currentBsr > 50000) return null

  // Daily drop rate (from stats)
  const dailyDrop = stats?.deltaPercent?.[CSV_INDEX.AMAZON_PRICE] ?? 0

  // Scores
  const demand = calcDemandScore(bsrCsv, amazonPriceCsv)
  const profitScore = calcProfitScore(roi)
  const stabilityScore = calcPriceStabilityScore(amazonPriceCsv)
  const competitorScore = calcCompetitorScore(currentSellerCount)

  const sedoriScore = Math.round(
    demand.score * 0.4 +
    profitScore * 0.3 +
    stabilityScore * 0.15 +
    competitorScore * 0.15
  )

  // Image URL
  const imageUrl = product.imagesCSV
    ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}`
    : null

  // Review count
  const reviewCountCsv = product.csv?.[CSV_INDEX.COUNT_REVIEWS]
  const reviewCount = reviewCountCsv?.length
    ? reviewCountCsv[reviewCountCsv.length - 1]
    : 0

  return {
    asin: product.asin,
    title: product.title,
    imageUrl,
    buyPrice,
    sellPrice,
    profit,
    roi: Math.round(roi * 10) / 10,
    demandScore: demand.score,
    sedoriScore,
    dailyDrop: Math.abs(dailyDrop),
    salesRank: currentBsr ?? 0,
    sellerCount: currentSellerCount,
    bsrDropCount: demand.dropCount,
    outOfStockRate: Math.round(demand.oosRate),
    priceRecoveryDays: demand.recoveryDays,
    bsrTrend: Math.round(demand.trendPercent),
    fee,
    shippingCost,
    reviewCount,
    category,
  }
}
