"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_DISPLAY_CURRENCY,
  isSupportedCurrency,
  STORAGE_KEY_DISPLAY_CURRENCY,
} from "@/lib/currencies";
import { formatMoney } from "@/lib/money";

type CurrencyContextValue = {
  /** ISO 4217 code used for `formatMoney` and the amount field symbol. */
  currency: string;
  setCurrency: (code: string) => void;
  /** Binds the current `currency` for list/total display. */
  formatMoney: (amount: string | number) => string;
};

const CurrencyContext = React.createContext<CurrencyContextValue | null>(null);

function readPersisted(): string {
  if (typeof window === "undefined") return DEFAULT_DISPLAY_CURRENCY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DISPLAY_CURRENCY);
    if (raw && isSupportedCurrency(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_DISPLAY_CURRENCY;
}

export function CurrencyPreferenceProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  const [currency, setCurrencyState] = useState<string>(DEFAULT_DISPLAY_CURRENCY);

  useEffect(() => {
    setCurrencyState(readPersisted());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DISPLAY_CURRENCY && e.newValue && isSupportedCurrency(e.newValue)) {
        setCurrencyState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCurrency = useCallback((code: string) => {
    if (!isSupportedCurrency(code)) return;
    setCurrencyState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY_DISPLAY_CURRENCY, code);
    } catch {
      /* private mode, etc. */
    }
  }, []);

  const boundFormat = useCallback(
    (amount: string | number) => formatMoney(amount, currency),
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      formatMoney: boundFormat,
    }),
    [currency, setCurrency, boundFormat]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useDisplayCurrency(): CurrencyContextValue {
  const ctx = React.useContext(CurrencyContext);
  if (ctx == null) {
    throw new Error("useDisplayCurrency must be used within CurrencyPreferenceProvider");
  }
  return ctx;
}

/**
 * For components that may render outside the provider (e.g. tests) — uses defaults.
 */
export function useDisplayCurrencyOptional(): CurrencyContextValue | null {
  return React.useContext(CurrencyContext);
}
