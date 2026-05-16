export type Account = {
  id: string
  email: string
  password: string
  balance: number
  createdAt: string
}

export type OrderSide = "YES" | "NO"

export type Fill = {
  id: string
  accountId: string
  symbol: string
  marketName: string
  side: OrderSide
  quantity: number
  price: number
  cost: number
  createdAt: string
}

export type AccountStore = {
  accounts: Account[]
  fills: Fill[]
  activeAccountId: string | null
}

export const STARTING_BALANCE = 1000

const STORAGE_KEY = "onyx-paper-accounts"

const emptyStore: AccountStore = {
  accounts: [],
  fills: [],
  activeAccountId: null,
}

export function loadAccountStore(): AccountStore {
  try {
    const savedStore = localStorage.getItem(STORAGE_KEY)
    return savedStore
      ? { ...emptyStore, ...JSON.parse(savedStore) }
      : emptyStore
  } catch {
    return emptyStore
  }
}

export function saveAccountStore(store: AccountStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function signUp(
  store: AccountStore,
  email: string,
  password: string
): AccountStore {
  const normalizedEmail = email.trim().toLowerCase()

  if (store.accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account already exists for this email.")
  }

  const account: Account = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    password,
    balance: STARTING_BALANCE,
    createdAt: new Date().toISOString(),
  }

  return {
    accounts: [...store.accounts, account],
    fills: store.fills,
    activeAccountId: account.id,
  }
}

export function logIn(
  store: AccountStore,
  email: string,
  password: string
): AccountStore {
  const normalizedEmail = email.trim().toLowerCase()
  const account = store.accounts.find(
    (candidate) =>
      candidate.email === normalizedEmail && candidate.password === password
  )

  if (!account) {
    throw new Error("Email or password is incorrect.")
  }

  return {
    ...store,
    activeAccountId: account.id,
  }
}

export function logOut(store: AccountStore): AccountStore {
  return {
    ...store,
    activeAccountId: null,
  }
}

export function placePaperOrder(
  store: AccountStore,
  order: {
    accountId: string
    symbol: string
    marketName: string
    side: OrderSide
    quantity: number
    price: number
  }
): AccountStore {
  if (order.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.")
  }

  if (order.price <= 0 || order.price >= 1) {
    throw new Error("Price must be between 1 and 99 cents.")
  }

  const account = store.accounts.find(
    (candidate) => candidate.id === order.accountId
  )

  if (!account) {
    throw new Error("Account not found.")
  }

  const cost = order.quantity * order.price

  if (cost > account.balance) {
    throw new Error("Insufficient paper balance.")
  }

  const fill: Fill = {
    id: crypto.randomUUID(),
    accountId: account.id,
    symbol: order.symbol,
    marketName: order.marketName,
    side: order.side,
    quantity: order.quantity,
    price: order.price,
    cost,
    createdAt: new Date().toISOString(),
  }

  return {
    ...store,
    accounts: store.accounts.map((candidate) =>
      candidate.id === account.id
        ? { ...candidate, balance: candidate.balance - cost }
        : candidate
    ),
    fills: [fill, ...store.fills],
  }
}

export function getAccountFills(store: AccountStore, accountId: string) {
  return store.fills.filter((fill) => fill.accountId === accountId)
}
