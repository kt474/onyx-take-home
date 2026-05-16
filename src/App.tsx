/* eslint-disable react-hooks/set-state-in-effect */
import type { FormEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  loadAccountStore,
  logIn,
  logOut,
  saveAccountStore,
  signUp,
  STARTING_BALANCE,
  type AccountStore,
} from "@/lib/accountStore"
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const activeAccount = accountStore.accounts.find(
    (account) => account.id === accountStore.activeAccountId
  )

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

  useEffect(() => {
    saveAccountStore(accountStore)
  }, [accountStore])

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
