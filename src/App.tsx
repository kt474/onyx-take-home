/* eslint-disable react-hooks/set-state-in-effect */
import type { FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  getAccountFills,
  getAccountPositions,
  loadAccountStore,
  logIn,
  logOut,
  placePaperOrder,
  saveAccountStore,
  signUp,
  STARTING_BALANCE,
  type AccountStore,
  type OrderSide,
} from "@/lib/accountStore"
import {
  getMarketPrice,
  getMarkets,
  getNoPrice,
  getSports,
  getYesPrice,
  type OnyxMarket,
  type OnyxPrice,
  type OnyxSport,
} from "@/lib/onyx"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

const MARKETS_PER_PAGE = 20

export function App() {
  const [accountStore, setAccountStore] = useState<AccountStore>(() =>
    loadAccountStore()
  )
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup")
  const [authError, setAuthError] = useState("")
  const [markets, setMarkets] = useState<OnyxMarket[]>([])
  const [sports, setSports] = useState<OnyxSport[]>([])
  const [selectedSport, setSelectedSport] = useState("ALL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<OnyxPrice | null>(null)
  const [orderSide, setOrderSide] = useState<OrderSide>("YES")
  const [quantity, setQuantity] = useState(10)
  const [orderMessage, setOrderMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const activeAccount = accountStore.accounts.find(
    (account) => account.id === accountStore.activeAccountId
  )
  const selectedMarket =
    markets.find((market) => market.symbol === selectedSymbol) ?? markets[0]
  const selectedYesPrice = selectedMarket
    ? getYesPrice(selectedMarket, selectedPrice ?? undefined)
    : null
  const selectedNoPrice = selectedMarket
    ? getNoPrice(selectedMarket, selectedPrice ?? undefined)
    : null
  const orderPrice = orderSide === "YES" ? selectedYesPrice : selectedNoPrice
  const orderCost = orderPrice == null ? null : orderPrice * quantity
  const accountFills = activeAccount
    ? getAccountFills(accountStore, activeAccount.id)
    : []
  const accountPositions = activeAccount
    ? getAccountPositions(accountStore, activeAccount.id)
    : []

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
  const pageCount = Math.max(
    1,
    Math.ceil(filteredMarkets.length / MARKETS_PER_PAGE)
  )
  const visibleMarkets = filteredMarkets.slice(
    (page - 1) * MARKETS_PER_PAGE,
    page * MARKETS_PER_PAGE
  )

  const loadMarketData = useCallback(async () => {
    setIsLoading(true)
    setError("")

    try {
      const [nextSports, nextMarkets] = await Promise.all([
        getSports(),
        getMarkets({
          sport: selectedSport,
          status: "open",
          limit: 500,
        }),
      ])

      setSports(nextSports)
      setMarkets(nextMarkets)
      setSelectedSymbol((currentSymbol) =>
        currentSymbol &&
        nextMarkets.some((market) => market.symbol === currentSymbol)
          ? currentSymbol
          : (
              nextMarkets.find((market) => market.yes_price != null) ??
              nextMarkets[0]
            )?.symbol
      )
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

  useEffect(() => {
    saveAccountStore(accountStore)
  }, [accountStore])

  useEffect(() => {
    setPage(1)
  }, [search, selectedSport])

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount))
  }, [pageCount])

  useEffect(() => {
    setSelectedPrice(null)

    if (!selectedMarket) {
      return
    }

    let isCurrent = true

    getMarketPrice(selectedMarket.symbol)
      .then((price) => {
        if (isCurrent) {
          setSelectedPrice(price)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setSelectedPrice(null)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [selectedMarket])

  function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError("")

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")

    try {
      const nextStore =
        authMode === "signup"
          ? signUp(accountStore, email, password)
          : logIn(accountStore, email, password)

      setAccountStore(nextStore)
    } catch (caughtError) {
      setAuthError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not authenticate."
      )
    }
  }

  function handleOrderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOrderMessage("")

    if (!selectedMarket || !activeAccount || orderPrice == null) {
      setOrderMessage("Select a market with a tradable price first.")
      return
    }

    try {
      const nextStore = placePaperOrder(accountStore, {
        accountId: activeAccount.id,
        symbol: selectedMarket.symbol,
        marketName: selectedMarket.name ?? selectedMarket.symbol,
        side: orderSide,
        quantity,
        price: orderPrice,
      })

      setAccountStore(nextStore)
      setOrderMessage(
        `Filled ${quantity} ${orderSide} at ${formatPrice(orderPrice)}.`
      )
    } catch (caughtError) {
      setOrderMessage(
        caughtError instanceof Error ? caughtError.message : "Order rejected."
      )
    }
  }

  if (!activeAccount) {
    return (
      <main className="min-h-svh bg-background text-foreground">
        <section className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-6 py-8">
          <header className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Onyx Paper Trader
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {authMode === "signup" ? "Create an account" : "Log in"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Each paper account starts with{" "}
              {currencyFormatter.format(STARTING_BALANCE)}.
            </p>
          </header>

          <form
            onSubmit={handleAuthSubmit}
            className="flex flex-col gap-4 rounded-lg border bg-card p-4"
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input
                required
                name="email"
                type="email"
                placeholder="trader@example.com"
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Password
              <input
                required
                minLength={4}
                name="password"
                type="password"
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </label>

            {authError ? (
              <p className="text-sm text-destructive">{authError}</p>
            ) : null}

            <Button type="submit">
              {authMode === "signup" ? "Sign up" : "Log in"}
            </Button>

            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() =>
                setAuthMode(authMode === "signup" ? "login" : "signup")
              }
            >
              {authMode === "signup"
                ? "Already have an account? Log in"
                : "Need an account? Sign up"}
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Onyx Paper Trader
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Live prediction markets
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Browse open markets from the Onyx Predictions API.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm md:min-w-64">
            <div>
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate font-medium">{activeAccount.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paper balance</p>
              <p className="font-medium">
                {currencyFormatter.format(activeAccount.balance)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAccountStore(logOut(accountStore))}
            >
              Log out
            </Button>
          </div>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
              ? visibleMarkets.map((market) => (
                  <MarketRow
                    key={market.symbol}
                    market={market}
                    isSelected={selectedMarket?.symbol === market.symbol}
                    onSelect={() => {
                      setSelectedSymbol(market.symbol)
                      setOrderMessage("")
                    }}
                  />
                ))
              : null}

            {!isLoading && filteredMarkets.length > 0 ? (
              <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <span>
                  Showing {(page - 1) * MARKETS_PER_PAGE + 1}-
                  {Math.min(page * MARKETS_PER_PAGE, filteredMarkets.length)} of{" "}
                  {filteredMarkets.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((currentPage) => currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={page === pageCount}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="rounded-lg border bg-card p-4 lg:sticky lg:top-6 lg:self-start">
            <form onSubmit={handleOrderSubmit} className="flex flex-col gap-4">
              <div>
                <h2 className="font-semibold">Order ticket</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Orders fill instantly using the selected market price.
                </p>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {selectedMarket?.name ?? "Select a market"}
                </p>
                <p className="mt-1 text-xs break-all text-muted-foreground">
                  {selectedMarket?.symbol ?? "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={orderSide === "YES" ? "default" : "outline"}
                  onClick={() => setOrderSide("YES")}
                >
                  Buy YES
                </Button>
                <Button
                  type="button"
                  variant={orderSide === "NO" ? "default" : "outline"}
                  onClick={() => setOrderSide("NO")}
                >
                  Buy NO
                </Button>
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Contracts
                <input
                  min={1}
                  step={1}
                  type="number"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Number(event.currentTarget.value))
                  }
                  className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <div className="grid gap-2 rounded-md bg-muted p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Fill price</span>
                  <span className="font-medium">{formatPrice(orderPrice)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Estimated cost</span>
                  <span className="font-medium">
                    {orderCost == null
                      ? "-"
                      : currencyFormatter.format(orderCost)}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={orderPrice == null || quantity <= 0}
              >
                Place paper order
              </Button>

              {orderMessage ? (
                <p className="text-sm text-muted-foreground">{orderMessage}</p>
              ) : null}
            </form>
          </aside>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Positions</h2>
            </div>

            {accountPositions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                No positions yet.
              </p>
            ) : (
              <div className="divide-y">
                {accountPositions.map((position) => {
                  const market = markets.find(
                    (candidate) => candidate.symbol === position.symbol
                  )
                  const markPrice = market
                    ? position.side === "YES"
                      ? getYesPrice(market)
                      : getNoPrice(market)
                    : null
                  const unrealizedPnl =
                    markPrice == null
                      ? null
                      : (markPrice - position.avgPrice) * position.quantity

                  return (
                    <div
                      key={`${position.symbol}:${position.side}`}
                      className="grid gap-2 p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {position.marketName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {position.side} / {position.symbol}
                          </p>
                        </div>
                        <span className="font-medium">
                          {position.quantity} contracts
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                        <span>Avg {formatPrice(position.avgPrice)}</span>
                        <span>Mark {formatPrice(markPrice)}</span>
                        <span>
                          P&L{" "}
                          {unrealizedPnl == null
                            ? "-"
                            : currencyFormatter.format(unrealizedPnl)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">Order history</h2>
            </div>

            {accountFills.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No fills yet.</p>
            ) : (
              <div className="divide-y">
                {accountFills.slice(0, 10).map((fill) => (
                  <div key={fill.id} className="grid gap-2 p-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {fill.marketName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {fill.side} / {fill.symbol}
                        </p>
                      </div>
                      <span className="font-medium">
                        {currencyFormatter.format(fill.cost)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fill.quantity} contracts at {formatPrice(fill.price)} on{" "}
                      {formatDate(fill.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

function MarketRow({
  market,
  isSelected,
  onSelect,
}: {
  market: OnyxMarket
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[minmax(0,1fr)_120px_120px] gap-3 border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/60 md:grid-cols-[minmax(0,1fr)_120px_120px_160px] ${
        isSelected ? "bg-muted" : ""
      }`}
    >
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
    </button>
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
