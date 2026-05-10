# Trust & anti-spam — plan de fundație

## Obiectiv

Construiți semnale **non-blocante** pentru moderare și prioritizare, fără a refuza automat utilizatori în această fază.

## Cod

- `lib/trust/listingTrust.ts` — `computeListingTrustScore`, `detectSuspiciousKeywords`, `isDuplicateTitleInBatch`

## Semnale folosite

- Prezență telefon
- Email verificat (când e disponibil în model)
- „Vârsta” contului (zile de la `createdAt`)
- Număr estimat de anunțuri active ale utilizatorului
- Număr de imagini la anunț
- Potrivire euristică pe cuvinte-cheie suspecte în titlu + descriere
- Helper pentru duplicate de titlu într-un batch (import)

## Ce nu face încă

- Nu oprește publicarea
- Nu înlocuiește moderarea umană
- Nu înlocuiește raportările utilizatorilor

## Pași următori recomandați

1. Afișarea scorului doar în **admin** / cozi de moderare
2. Legare la `scamScore` / `scamFlags` existente în DB unde are sens
3. Rate limiting la publicare și la mesagerie (în afara acestui layer)
4. Consent & transparență pentru orice semnal automat folosit împotriva unui cont
