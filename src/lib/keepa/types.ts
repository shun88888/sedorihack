// Keepa API time: minutes since 2011-01-01T00:00:00Z
export const KEEPA_EPOCH_OFFSET = 21564000

// CSV array indices
export const CSV_INDEX = {
  AMAZON_PRICE: 0,      // Amazon price (-1 = OOS)
  MARKETPLACE_NEW: 1,   // Marketplace new price
  MARKETPLACE_USED: 2,  // Marketplace used price
  SALES_RANK: 3,        // Sales rank (BSR)
  LISTING_PRICE: 4,     // Listing price
  COLLECTED_PRICE: 5,   // Collected price
  COUNT_NEW: 7,         // New offer count (seller count)
  RATING: 16,           // Rating
  COUNT_REVIEWS: 17,    // Review count
} as const

export interface KeepaProduct {
  asin: string
  title: string
  imagesCSV: string
  rootCategory: number
  categoryTree?: Array<{ catId: number; name: string }>
  csv: (number[] | null)[]
  stats?: {
    current: number[]
    avg: number[]
    avg30: number[]
    avg90: number[]
    min: number[]
    max: number[]
    deltaPercent: number[]
  }
  reviewCount?: number
  rating?: number
}

export interface KeepaProductFinderResponse {
  asinList: string[]
  totalResults: number
  domainId: number
}

export interface KeepaProductResponse {
  products: KeepaProduct[]
  tokensLeft: number
}
