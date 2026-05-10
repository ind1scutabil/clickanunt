# Import anunțuri (infrastructură pregătită)

Acest ghid descrie **șablonul CSV** și regulile de validare pentru importuri **legitime** (parteneri, migrări interne, feed-uri proprii). **Nu** include scraping de site-uri terțe și **nu** publică automat anunțuri fără moderare.

## Fișier șablon

- `docs/import-listings-template.csv`

## Câmpuri

| Coloană | Obligatoriu | Note |
|--------|-------------|------|
| `title` | Da | Text scurt, fără CAPS excesiv |
| `description` | Nu | Text simplu |
| `category` | Da | Trebuie să corespundă **etichetelor** din platformă (ex. `Auto, moto și ambarcațiuni`) |
| `city` | Da | Oraș recunoscut de filtre |
| `county` | Nu | Județ |
| `price` | Nu | În unitatea majoră (ex. lei întregi pentru RON) — aliniați cu scriptul de import |
| `currency` | Nu | Implicit `RON` dacă lipsește |
| `phone` | Nu | Format E.164 recomandat |
| `email` | Nu | Pentru mapare cont / contact |
| `images` | Nu | URL-uri separate cu `|` sau `;` (definiți separatorul în scriptul de import) |
| `external_reference` | Recomandat | ID unic în sistemul sursă — **deduplicare** |

## Validare (înainte de inserare)

1. `title`, `category`, `city` obligatorii.
2. `external_reference`: dacă există deja în DB pentru același sursă, **skip** sau **update** explicit (nu duplicat „orb”).
3. `moderationStatus`: implicit **`pending`** — anunțul **nu** e vizibil public până la **`approved`**.
4. `status`: păstrați `pending` sau `draft` până la aprobare; nu setați `active` + `approved` decât prin flux de moderare explicit.
5. Verificați că imaginile sunt **HTTPS** și că aveți dreptul de utilizare.

## Implementare

- **Nu** expuneți un endpoint public de import.
- Folosiți un **script intern** sau **panou admin** existent, cu autentificare și audit.
- După import: raportați erorile pe rând (CSV de respingere) fără a opri tot batch-ul, dacă e preferat.

## Conformitate

Respectați GDPR, termenii platformei și drepturile utilizatorilor; păstrați dovada consimțământului pentru datele de contact incluse în feed.
