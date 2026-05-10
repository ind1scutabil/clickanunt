# Mesagerie distribuită — arhitectură producie

Documentul descrie livrarea realtime între mai multe instanțe Node (PM2 cluster, VPS + load balancer, autoscaling).

## Sinteză

| Componentă | Rol |
|------------|-----|
| **Redis Pub/Sub** | Canal per utilizator (`ca:msg:user:<uuid-canonic>`). Orice worker care publică un eveniment ajunge la toți worker-ii care au clienți SSE abonați la acel utilizator. |
| **SSE** (`GET /api/messages/events?token=`) | Flux keep-alive unic per tab; JWT validat din query/cookie/header. |
| **Fallback** | `MESSAGING_DISABLE_REDIS=1` sau publicare Redis eșuată → fanout în memorie în același proces. |
| **Metrici** | `GET /api/messages/stream-metrics` cu header `x-messaging-metrics-secret` dacă este setat `MESSAGING_METRICS_SECRET`. Include `sseHandlerDispatchErrors` pentru excepții în callback-ul SSE. |

## Stabilizare operațională

- Envelope Redis respins dacă au `event` necunoscut sau depășesc **`MESSAGING_REDIS_PAYLOAD_MAX_CHARS` (64 KiB)** — vezi `lib/messaging-event-schema.ts`.
- Publicările multi-destinatar rulează **`Promise.all`** (Prisma rutele continuă să apeleze hub-ul fire-and-forget).

## Canale Redis

- Prefix configurabil: `MESSAGING_REDIS_CHANNEL_PREFIX` (implicit `ca:msg:user:`).
- Nume efectiv: `{prefix}{userIdLower}`.
- **Nu** subscribe la pattern global `PSUBSCRIBE *` în proces UI — doar canalul utilizatorilor care au încă o conexiune SSE activă (ref counted).

Payload pe canal este un **JSON envelope server-only** (`v:1`), vezi `lib/messaging-event-schema.ts`:

- `targetUserId`, `event`, `ts`, `ssePayload`.

Subscriber-ul verifică `targetUserId` canonic ≡ sufix canal înainte de fanout către SSE.

Evenimente `ssePayload.type` cunoscute de cliente:

| `ssePayload.type` | Scop |
|-------------------|------|
| `connected` | Handshake SSE (primele cadre locale). |
| `heartbeat` | Semnal live + interval ~25 s (în plus de comentariu `: ping`). |
| `message` | Mesaj nou (înainte cod `new_message`). |
| `unread_update` | Badge unread (destinatar nou mesaj). |
| `conversation_update` | Lista conversații / preview. |
| `read_receipt` | Participantul celălalt marcat mesaje citite (GET thread). |
| `delivery_receipt` | Vizualizare thread destinatar ⇒ `deliveredAt` DB. |
| `typing`, `presence` | API-uri dedicate `/api/messages/typing` și `/api/messages/presence` (payload respectă același discriminator `type`; UI poate fi inactiv dacă produsul cere fără elemente vizuale). |

## Ciclu de viață SSE

1. Browser deschide `EventSource` cu JWT în query (`lib/message-events-sse-client.ts`).
2. După handshake, backoff exponential la reconectare; la schimb refresh token reclădește manual fluxul la fiecare 30 s.
3. **Heartbeat stare**: dacă mai mult de ~85 s fără nici un `MessageEvent`, clientul declară fluxul blocat și forțează reconectare (mitigare proxy/LB mute).
4. Server trimite `: ping ...` și `data: heartbeat` pentru a nu depinde doar de comentarii (dacă nivelul mijlociu le elimină).

## GET thread — paginare

`GET /api/messages/[userId]?listingId=&conversationId=&limit=&before=`

- `limit` între **10 și 150** (implicit ~60).
- `before=<messageUuid>` pentru pagină **mai veche** (în sens chat: mesaje anterior cursorului).
- Răspuns extins: `pagination.hasOlderMessages`, `oldestMessageIdOnPage`, `approxPayloadBytes` (orientativ).
- În thread, destinatarului i se marchează `deliveredAt` / `readAt` și se emit evenimente `delivery_receipt` / `read_receipt` distribuite.

Migrare DB: `deliveredAt` pe `messages` (`prisma/migrations/20260510194500_message_delivered_at`).

## Securitate

- SSE: `getAuthUserIdFromRequest` + verificări existente JWT (inclusiv respingerea token refresh).
- Nu există enumerare implicită între utilizatori din Redis; doar procesul aplicăție publică către utilizatori canonici validați de API-uri.
- `typing` / `presence`: validare că `conversationId` (dacă e trimis) conține apelantul participant.

## Fallback și scalabilitate strategie verticală vs orizontală

- **Horizontal**: Redis este obligatoriu pentru consecvență între worker-i.
- **Vertical** (singur proces): Redis tot funcționează; dacăRedis e oprit temporar sau `MESSAGING_DISABLE_REDIS`, fanout-ul rămâne în același worker (NU traversează între PMI workers).

Alternativ extern (Pusher/Ably): înlocuire posibilă păstrând aceeași interfață de publicare dacă encapsulați în `publishEnvelopeToUser`.

## Observații operaționale deploy

- **PM2 reload** / deploy: sesiuni SSE sunt închise; clientul reconnectează automat.
- **Load balancer**: sticky sessions NU sunt necesare pentru Redis; SSE doar necesită time-out suficient (>90 s) dacă aveți idle timeout agresiv.
- **Migrări**: aplicați Prisma migrație nouă pentru `deliveredAt`.
- Variabile recomandate: `REDIS_URL`, optional `MESSAGING_METRICS_SECRET`, `MESSAGING_PRESENCE_KEY_PREFIX`.

## Încărcare / test

Rulează `scripts/messaging-load-smoke.ts` cu utilizator sintetic pentru a benchmark strict Redis publish (nu E2E complet).
