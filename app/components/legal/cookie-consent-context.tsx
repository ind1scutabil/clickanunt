"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  dispatchCookieConsentUpdated,
  parseStoredCookieConsent,
  type StoredCookieConsent,
} from "@/lib/cookie-consent";
import { CookieBanner } from "./CookieBanner";

type CookieConsentContextValue = {
  consent: StoredCookieConsent | null;
  /** True după citirea din localStorage și există decizie salvată */
  decided: boolean;
  hydrated: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  settingsOpen: boolean;
  acceptAll: () => void;
  refuseNonEssential: () => void;
  saveCustom: (analytics: boolean, marketing: boolean) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredCookieConsent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      setConsent(parseStoredCookieConsent(raw));
    } catch {
      setConsent(null);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: StoredCookieConsent) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
    setConsent(next);
    dispatchCookieConsentUpdated();
  }, []);

  const acceptAll = useCallback(() => {
    persist({
      v: 1,
      necessary: true,
      analytics: true,
      marketing: true,
      decidedAt: new Date().toISOString(),
    });
    setSettingsOpen(false);
  }, [persist]);

  const refuseNonEssential = useCallback(() => {
    persist({
      v: 1,
      necessary: true,
      analytics: false,
      marketing: false,
      decidedAt: new Date().toISOString(),
    });
    setSettingsOpen(false);
  }, [persist]);

  const saveCustom = useCallback(
    (analytics: boolean, marketing: boolean) => {
      persist({
        v: 1,
        necessary: true,
        analytics,
        marketing,
        decidedAt: new Date().toISOString(),
      });
      setSettingsOpen(false);
    },
    [persist]
  );

  const decided = Boolean(consent);

  const value = useMemo(
    () => ({
      consent,
      decided,
      hydrated,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      settingsOpen,
      acceptAll,
      refuseNonEssential,
      saveCustom,
    }),
    [consent, decided, hydrated, settingsOpen, acceptAll, refuseNonEssential, saveCustom]
  );

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
      {hydrated ? <CookieBanner /> : null}
    </CookieConsentContext.Provider>
  );
}
