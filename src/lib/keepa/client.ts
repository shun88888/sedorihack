import type { KeepaProductFinderResponse, KeepaProductResponse } from './types'

const BASE_URL = 'https://api.keepa.com'
const DOMAIN = 6 // Amazon.co.jp
const API_KEY = process.env.KEEPA_API_KEY!

// Product Finder: search products with specific criteria
// Returns ASINs matching 30%+ daily price drop, BSR within 50k
export async function findDroppedProducts(page = 0): Promise<KeepaProductFinderResponse> {
  const selection = JSON.stringify({
    deltaPercentRange: [-99, -30],   // 1-day price drop 30~99%
    salesRankRange: [1, 50000],      // BSR within 50,000
    currentPriceRange: [500, -1],    // Minimum price 500 JPY
    salesRankDropsRange30: [1, -1],  // At least 1 BSR drop in 30 days
  })

  const params = new URLSearchParams({
    key: API_KEY,
    domain: String(DOMAIN),
    page: String(page),
    perPage: '50',
    selection,
  })

  const res = await fetch(`${BASE_URL}/query?${params}`, {
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Keepa Product Finder failed: ${res.status}`)
  }

  return res.json()
}

// Product API: get detailed data for ASINs (max 100 per request)
export async function getProductDetails(asins: string[]): Promise<KeepaProductResponse> {
  const params = new URLSearchParams({
    key: API_KEY,
    domain: String(DOMAIN),
    asin: asins.join(','),
    history: '1',
    stats: '90',
    offers: '20',
    buybox: '1',
  })

  const res = await fetch(`${BASE_URL}/product?${params}`, {
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`Keepa Product API failed: ${res.status}`)
  }

  return res.json()
}

// Utility: sleep between batches to respect rate limits
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
