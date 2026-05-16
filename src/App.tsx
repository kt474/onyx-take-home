/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  getMarkets,
  getSports,
  type OnyxMarket,
  type OnyxSport,
} from "@/lib/onyx"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

export function App() {
  const [markets, setMarkets] = useState<OnyxMarket[]>([])
  const [sports, setSports] = useState<OnyxSport[]>([])
  const [selectedSport, setSelectedSport] = useState("ALL")
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const filteredMarkets = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return markets
    }

    return markets.filter((market) => {
      const text = [
        market.name,
        market.event_name,
        market.symbol,
        market.sport,
        market.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return text.includes(query)
    })
  }, [markets, search])

  const loadMarketData = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const [nextSports, nextMarkets] = await Promise.all([
        getSports(),
        getMarkets({
          sport: selectedSport,
          status: "open",
          limit: 100,
        }),
      ])

      setSports(nextSports)
      setMarkets(nextMarkets)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load Onyx markets"
      )
    } finally {
      setIsLoading(false)
    }
  }, [selectedSport])

  useEffect(() => {
    void loadMarketData()
  }, [loadMarketData])

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Onyx Paper Trader
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Live prediction markets
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Browse open markets from the Onyx Predictions API. Trading and
            account state will come in later steps.
          </p>
        </header>

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by market, symbol, or sport"
            className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />

          <select
            value={selectedSport}
            onChange={(event) => setSelectedSport(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">All sports</option>
            {sports.map((sport) => (
              <option key={sport.sport} value={sport.sport}>
                {sport.sport} ({sport.count})
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMarketData()}
          >
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 border-b px-4 py-3 text-xs font-medium text-muted-foreground uppercase md:grid-cols-[minmax(0,1fr)_120px_120px_160px]">
            <span>Market</span>
            <span>Status</span>
            <span>Yes price</span>
            <span className="hidden md:block">Expires</span>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">
              Loading markets...
            </div>
          ) : null}

          {!isLoading && filteredMarkets.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No markets found.
            </div>
          ) : null}

          {!isLoading
            ? filteredMarkets.map((market) => (
                <MarketRow key={market.symbol} market={market} />
              ))
            : null}
        </section>
      </section>
    </main>
  )
}

function MarketRow({ market }: { market: OnyxMarket }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_120px_120px_160px]">
      <div className="min-w-0">
        <p className="truncate font-medium">{market.name ?? market.symbol}</p>
        <p className="truncate text-xs text-muted-foreground">
          {market.sport} / {market.symbol}
        </p>
      </div>
      <span className="text-muted-foreground capitalize">{market.status}</span>
      <span>{formatPrice(market.yes_price)}</span>
      <span className="hidden text-muted-foreground md:block">
        {formatDate(market.expiry_date)}
      </span>
    </div>
  )
}

function formatPrice(price: number | null) {
  if (price == null) {
    return "-"
  }

  return `${Math.round(price * 100)} cents`
}

function formatDate(value: string | null) {
  if (!value) {
    return "-"
  }

  return dateFormatter.format(new Date(value))
}

export default App
