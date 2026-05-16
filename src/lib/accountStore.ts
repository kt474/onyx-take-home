export type Account = {
  id: string
  email: string
  password: string
  balance: number
  createdAt: string
}

export type AccountStore = {
  accounts: Account[]
  activeAccountId: string | null
}

export const STARTING_BALANCE = 1000

const STORAGE_KEY = "onyx-paper-accounts"

const emptyStore: AccountStore = {
  accounts: [],
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
