"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_DISPLAY_CURRENCY,
  isSupportedCurrency,
  STORAGE_KEY_DISPLAY_CURRENCY,
} from "@/lib/currencies";
import { formatMoney } from "@/lib/money";

/** Same-tab updates: `storage` only fires in other documents. */
const CURRENCY_PREFERENCE_EVENT = "expensify:currency-preference" as const;

type CurrencyContextValue = {
  /** ISO 4217 code used for `formatMoney` and the amount field symbol. */
  currency: string;
  setCurrency: (code: string) => void;
  /** Binds the current `currency` for list/total display. */
  formatMoney: (amount: string | number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readPersisted(): string {
  const storage = globalThis.window?.localStorage;
  if (storage == null) return DEFAULT_DISPLAY_CURRENCY;
  try {
    const raw = storage.getItem(STORAGE_KEY_DISPLAY_CURRENCY);
    if (raw && isSupportedCurrency(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_DISPLAY_CURRENCY;
}

function getCurrencyServerSnapshot(): string {
  return DEFAULT_DISPLAY_CURRENCY;
}

function subscribeToCurrencyStore(onChange: () => void): () => void {
  const win = globalThis.window;
  if (win == null) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY_DISPLAY_CURRENCY || e.key === null) onChange();
  };
  const onLocal = () => onChange();
  win.addEventListener("storage", onStorage);
  win.addEventListener(CURRENCY_PREFERENCE_EVENT, onLocal);
  return () => {
    win.removeEventListener("storage", onStorage);
    win.removeEventListener(CURRENCY_PREFERENCE_EVENT, onLocal);
  };
}

export function CurrencyPreferenceProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const currency = useSyncExternalStore(
    subscribeToCurrencyStore,
    readPersisted,
    getCurrencyServerSnapshot,
  );

  const setCurrency = useCallback((code: string) => {
    if (!isSupportedCurrency(code)) return;
    const win = globalThis.window;
    if (win == null) return;
    try {
      win.localStorage.setItem(STORAGE_KEY_DISPLAY_CURRENCY, code);
    } catch {
      /* private mode, etc. */
    }
    win.dispatchEvent(new Event(CURRENCY_PREFERENCE_EVENT));
  }, []);

  const boundFormat = useCallback(
    (amount: string | number) => formatMoney(amount, currency),
    [currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      formatMoney: boundFormat,
    }),
    [currency, setCurrency, boundFormat],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx == null) {
    throw new Error(
      "useDisplayCurrency must be used within CurrencyPreferenceProvider",
    );
  }
  return ctx;
}

/**
 * For components that may render outside the provider (e.g. tests) — uses defaults.
 */
export function useDisplayCurrencyOptional(): CurrencyContextValue | null {
  return useContext(CurrencyContext);
}
