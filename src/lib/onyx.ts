export type OnyxSport = {
  sport: string
  count: number
}

export type OnyxMarket = {
  id: string
  symbol: string
  sport: string
  name: string | null
  event_name: string | null
  status: string
  expiry_date: string | null
  min_price: number
  max_price: number
  yes_price: number | null
}

export type OnyxPrice = {
  symbol: string
  bid_price: number | null
  ask_price: number | null
  last_price: number | null
  volume: number | null
}

type MarketFilters = {
  sport?: string
  status?: string
  limit?: number
  offset?: number
}

const ONYX_API_BASE = import.meta.env.VITE_ONYX_API_BASE ?? "/onyx"

async function onyxRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("accept", "application/json")

  const response = await fetch(`${ONYX_API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new Error(`Onyx API request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getSports() {
  return onyxRequest<OnyxSport[]>("/markets/sports")
}

export function getMarkets(filters: MarketFilters = {}) {
  const params = new URLSearchParams()

  params.set("limit", String(filters.limit ?? 50))
  params.set("offset", String(filters.offset ?? 0))

  if (filters.sport && filters.sport !== "ALL") {
    params.set("sport", filters.sport)
  }

  if (filters.status) {
    params.set("status", filters.status)
  }

  return onyxRequest<OnyxMarket[]>(`/markets?${params.toString()}`)
}

export function getMarketPrice(symbol: string) {
  return onyxRequest<OnyxPrice>(`/markets/${encodeURIComponent(symbol)}/prices`)
}

export function getYesPrice(market: OnyxMarket, price?: OnyxPrice) {
  return normalizePrice(
    price?.ask_price ?? price?.last_price ?? market.yes_price
  )
}

export function getNoPrice(market: OnyxMarket, price?: OnyxPrice) {
  const yesPrice = getYesPrice(market, price)
  return yesPrice == null ? null : normalizePrice(1 - yesPrice)
}

function normalizePrice(price: number | null | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return null
  }

  return Math.min(0.99, Math.max(0.01, price))
}
