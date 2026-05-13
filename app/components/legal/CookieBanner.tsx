"use client";

import { useEffect, useState } from "react";
import { useCookieConsent } from "./cookie-consent-context";

/**
 * Banner fix + modal setări. Stil dark aliniat footer-ului (neutral-950), fără dependențe externe.
 */
export function CookieBanner() {
  const {
    decided,
    consent,
    settingsOpen,
    openSettings,
    closeSettings,
    acceptAll,
    refuseNonEssential,
    saveCustom,
  } = useCookieConsent();

  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const [draftMarketing, setDraftMarketing] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    if (consent) {
      setDraftAnalytics(consent.analytics);
      setDraftMarketing(consent.marketing);
    } else {
      setDraftAnalytics(false);
      setDraftMarketing(false);
    }
  }, [settingsOpen, consent]);

  const showBar = !decided && !settingsOpen;

  if (!showBar && !settingsOpen) return null;

  return (
    <>
      {showBar ? (
        <div
          className="fixed inset-x-0 bottom-0 z-[90] border-t border-white/10 bg-neutral-950/95 px-4 py-3 text-neutral-200 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md max-md:pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
          role="dialog"
          aria-modal="false"
          aria-label="Consimțământ cookie"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-neutral-300 md:pr-4">
              Folosim cookie-uri necesare pentru funcționarea site-ului și, doar cu acordul tău, cookie-uri analitice
              (ex. statistici) și de marketing. Poți alege ce accepți.
            </p>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-400"
              >
                Acceptă toate
              </button>
              <button
                type="button"
                onClick={refuseNonEssential}
                className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm font-medium text-neutral-100 hover:bg-white/5"
              >
                Refuză
              </button>
              <button
                type="button"
                onClick={() => openSettings()}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/5"
              >
                Setări
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Setări cookie"
          onClick={() => closeSettings()}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-950 p-6 text-neutral-100 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-white">Preferințe cookie</h2>
            <p className="mb-4 text-sm text-neutral-400">
              Necesare sunt mereu active. Analitice și marketing sunt opționale și dezactivate implicit.
            </p>

            <ul className="mb-6 space-y-4 text-sm">
              <li className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div>
                  <p className="font-medium text-white">Necesare</p>
                  <p className="text-xs text-neutral-500">Autentificare, securitate, preferințe cookie.</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400">ACTIV</span>
              </li>
              <li className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="pr-2">
                  <p className="font-medium text-white">Analitice</p>
                  <p className="text-xs text-neutral-500">Măsurători agregate (ex. Google Analytics, Clarity).</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-orange-500"
                    checked={draftAnalytics}
                    onChange={(e) => setDraftAnalytics(e.target.checked)}
                  />
                </label>
              </li>
              <li className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="pr-2">
                  <p className="font-medium text-white">Marketing</p>
                  <p className="text-xs text-neutral-500">Reclame măsurabile (nu sunt încărcate pixeli fără acord).</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-orange-500"
                    checked={draftMarketing}
                    onChange={(e) => setDraftMarketing(e.target.checked)}
                  />
                </label>
              </li>
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveCustom(draftAnalytics, draftMarketing)}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
              >
                Salvează
              </button>
              <button
                type="button"
                onClick={() => closeSettings()}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-neutral-200 hover:bg-white/5"
              >
                Închide
              </button>
              {!decided ? (
                <button
                  type="button"
                  onClick={refuseNonEssential}
                  className="ml-auto rounded-lg px-2 py-2 text-sm text-neutral-400 hover:text-white"
                >
                  Refuză non-esențiale
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
