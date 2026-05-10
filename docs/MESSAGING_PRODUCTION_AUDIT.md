# Audit producție — mesagerie ClickAnunț / auto-platform

Document de referință pentru sign-off producție și review periodic. Bazat pe implementarea actuală (Next.js App Router, Prisma/PostgreSQL, Redis Pub/Sub, SSE, JWT).

**Componente relevante în repo:**  
`app/api/messages/**`, `lib/messaging-*.ts`, `lib/message-events-sse-client.ts`, `lib/messaging-redis-bus.ts`, `lib/messaging-event-schema.ts`, `lib/messages-request-auth.ts`, `prisma/schema.prisma` (modele `Conversation`, `Message`).

---

## 1. Threat model

### Actori și zone de încredere

| Actor | Încredere | Motiv |
|-------|-----------|--------|
| Utilizator autentificat (browser/app) | Parțial | Poate avea sesiuni compromise, comportament abuziv sau scripturi automatizate. |
| CDN / LB / proxy invers | Parțial | Poate marca `Cache-Control`, time-out-uri idle, buffering. |
| Aplicație Node (workeri Next) | Maximală în zonă privată VPC | Publisher/subscriber Redis, autorizare mesaje. |
| PostgreSQL | Zonă privată | Sursă de adevăr pentru mesaje/conversații. |
| Redis | Zonă privată | Canal de livrare evenimente; dacă Redis e compromise, un atacator ar putea publica JSON pe canale cunoscute. |
| Observator rețea (client → origin) | Necredincios | URL SSE poate include token în query; TLS obligatoriu în producție. |

### Bunuri protejate

- Conținut mesaje, identități participanți, listă conversații, stare citit/livrat, relație conversație–anunț.
- Token-uri de sesiune (expuneri în referrer/loguri URL SSE).
- Disponibilitatea serviciului (DoS conversație, flooding Redis/pub).

### Vectori de amenințare (rezumat STRIDE orientat pragmatic)

| Categorie | Exemplu aplicat la mesagerie | Mitigare existentă / residuală |
|-----------|-------------------------------|--------------------------------|
| **S** Spoofing | Impersonarea altui user în API | JWT verificat; id utilizator canonizat pentru mesagerie. |
| **T** Tampering | Modificarea conversațiilor în tranzit sau în DB direct | HTTPS; scrieri numai via API autorizată. |
| **R** Repudiation | Contestarea că un mesaj a fost trimis | `createdAt`, `conversationId`; dedupe temporal la POST (în cod). |
| **I** Information disclosure | SSRF, leakage cross-user, enumerare utilizatori prin realtime | Participant checks pe GET/POST; canal Redis cu verificare `targetUserId` ≡ sufix canal; **residual:** token în URL SSE (`?token=`). |
| **D** Denial of service | Spam mesaje/typing/flood SSE | Rate limit middleware (`messages`, `api`); limită corp Redis 64KiB envelope; paginare thread. |
| **E** Elevation | Acces conversație fără partajare participant | `conversationId` + verificare `participant1Id`/`participant2Id`; 403 dacă lipsă drepturi. |

### Suprafață de atac

- **HTTP:** `/api/messages/[userId]`, `/api/messages/conversations`, `/api/messages/unread-count`, `/api/messages/events`, `/api/messages/typing`, `/api/messages/presence`, `/api/messages/stream-metrics`.
- **Conexiune lungă durată:** SSE (keep-alive).
- **Date în mișcare:** Redis Pub/Sub pe canale `{prefix}{userUuid}`.

---

## 2. Security audit

### Pozitive (implementate în cod sau documentate)

| Zonă | Observație |
|------|------------|
| Auth API mesaje | `getMessagingApiAuthPayload` — Bearer înainte de cookie (sync cu refresh SPA). |
| Auth SSE | `getAuthUserIdFromRequest` acceptă și query `token` pentru EventSource; token-uri refresh respinse unde e cazul (flux access). |
| Schimbător de stare (POST/PATCH-uri mesagerie) | CSRF pentru rute cu `validateSecureRequest` unde e aplicat (`POST` mesaj, typing, presence). |
| Intrare POST mesaj | `messageSendSchema` (lungime max, transform trim); `normalizeMessagingContent` (HTML strip / text curat); rate limit preset `messages`. |
| Conversație | Unic `(participant1Id, participant2Id, listingId)`; rezolvare canon participanți în cod. |
| GET thread cu `conversationId` | Participant trebuie să fie vizualizator — altfel **403 Forbidden**. |
| POST mesaj către utilizator interzis | Verificări `isBanned` / `deletedAt` pentru sender/receiver unde e codificat în rută. |
| Dedupe accidental | În `POST` mesaj există fenomen dedupe bazat pe conținut + timp în fereastra configurată în cod — reduce replay spam. |
| Redis inbound | Lungime envelope limitată (**65 536 caractere** max înainte de `JSON.parse`); allowlist **`event`**; verificare `targetUserId` canonic ≡ canal. |
| Typing/presence | `conversationId` verificată împotriva participanților — **403** dacă utilizatorul nu e în conversație. |
| Metrici interne | `GET /api/messages/stream-metrics` protejat prin **`MESSAGING_METRICS_SECRET`** (header dedicat); fără secret → **503**/forbidden după configurare. |

### Riscuri și recomandări (fără a impune modificări aici — listă pentru backlog securitate)

| ID | Severitate | Descriere | Recomandare |
|----|-------------|-----------|---------------|
| S-01 | Medie înaltă | JWT în **`?token=`** pe SSE — expuneri potențiale (loguri proxy, referrer, istoric proxy). | Prefer cookie httpOnly compatibilă SSE sau endpoint scurt-lived exchange token→session SSE; mascare în loguri LB pentru query string pe `/api/messages/events`. |
| S-02 | Medie | Compromitere **Redis**: publicare pe canal `prefix+uuid` dacă cunoaște prefixul/convenția. | Restricție rețea (ACL Redis), parole/TLS pentru Redis; NU expuneți Redis în internet public. |
| S-03 | Medie coborâtă | Conținut mesaj sanitizat la text dar politica de retention/legal hold nu este în acest audit. | Definiție politică de păstrare + GDPR dacă aplicabil (ștergeri user cascadă sunt modelate Parțial prin FK). |
| S-04 | Coborâtă | `stream-metrics` devine informational attack surface dacă secretul pierde în CI. | Rotație secret, acces RBAC dacă migrați spre Prometheus intern. |

### Compliance operațional

- În producție, **JWT_SECRET** și **REDIS_URL** trebuie secrete gestionate (vault/param store), nu în repo.
- **TLS end-to-end** obligatoriu pentru orice rută unde circulă token sau corp mesaj.

---

## 3. Performance audit

| Zonă | Evaluare | Note |
|------|----------|------|
| **GET thread** | Îmbunătățit | Paginare `limit` 10–150, `before` pentru mesaje mai vechi; reduce încărcare memorie pentru fire lungi (`approxPayloadBytes` informativ pentru client). |
| **POST mesaj** | Acceptabil pentru MVP | Dedupe cere query `findFirst` — ok pentru unicitate în fereastra de timp; monitorizați dacă devine hot path la burst. |
| **Redis publish** | Acceptabil | `Promise.all` pentru multi-destinatari reduce latența per batch comparativ cu secvențial. |
| **SSE** | Atenție la scale | Heartbeat ~25 s duble cadru (`: ping` + `data: heartbeat`) — cost mic per conexiune; la zeci de mii sesiuni, numărați file descriptors și timeouts LB. |
| **Subscriber Redis per proces** | O conexiune duplicate + subscribe per-canal refcount | Preferabil pentru PUBSUB clasic vs un canal unic broadcast (design actual e ok până la mii-canale/active users per worker — monitor Redis `CLIENT LIST`/`PUBSUB NUMSUB`). |
| **Client** | Fallback polling paralel SSE | Menține latența acceptabilă când realtime cade; verificați **nu aveți polling agresiv** în parallel cu SSE live pe aceeași resursă fără filtre în UI (existent pe dashboard/listing după última refactorizări „stabilization”). |

**Recomandări:**

- În PostgreSQL mențineți indexurile pe `conversationId`, `createdAt`, `receiverId`, `senderId`, `conversationId,senderId,createdAt` (conform schema actuală și migrații).
- Profilați **`GET /api/messages/conversations`** la utilizatori cu sute de fire (lista + agregări unread).

---

## 4. Scalability audit

| Dimensiune | Comportament așteptat | Observații |
|------------|------------------------|-----------|
| **Instanțe Node** | **Horizontal** dacă **`REDIS_URL` activ și coerent** — evenimentele traversează pub/sub între workeri. |
| **`MESSAGING_DISABLE_REDIS=1` sau failover publish→local-only** | Fiecare instanță vede doar conexiuni locale SSE — **cross-instance realtime se rupe**. | Documentați acest comportament pentru runbook incident. |
| **Redis Pub/Sub** | Nu persistă istoric livrări offline; mesaj pierdut pentru client offline = **necitit în DB**, nu SSE. | Încarcă unică pentru notificări push viitoare. |
| **Autoscaling** | Terminarea pod/worker ⇒ închidere SSE; client reconectare + Redis fanout ⇒ ok. |
| **Canale Redis per user cu subscribe dinamic** | Număr canal ≈ utilizatori simultan SSE pe acel worker; nu folosiți `PSUBSCRIBE *` în worker app (nu e caz în implementare). |

Limite cunoscute:

- **Fire-and-forget** `void publishEnvelopeToUsers` din hub — erorile neobservabile în rută dacă nu logați; metricile Redis publish/failure pe worker acoperă parțial.
- Scala globală SSE = **Nr. conexiuni × reziliență infra** — nu Redis singur bottleneck (uneori Postgres citiri conversație).

---

## 5. Failure scenarios (scenario library)

| # | Incident | Impact utilizator | Impact sistem |
|---|----------|-------------------|---------------|
| F1 | **Redis complet down** | Realtime între noduri întrerupt (fallback strictly local-per-instance). Unele liste/badge pot întârzia până la polling. | `redisPublishFailures` ↑; log `messaging.redis.publish.failed`. |
| F2 | **Redis latent / flaky** | Jitter realtime; cliente reconectări SSE; posibile timeouts publice observate sporadic. | Latența medie publish vizibilă în metrici dacă sunt exportate/agregated. |
| F3 | **PostgreSQL unavailable** | Trimiteți/citiți mesaje eșuat (5xx/auth layers). | Erori aplicatie; alerting la health/db. |
| F4 | **Single worker crashed** | Toate SSE pe acel worker închise; utilizator reconnect pe alt LB target. | Rebalansare; metric `activeSseClients` diferă per proces. |
| F5 | **LB timeout SSE** | Flux „silent”; client staleness detector (~85 s în client) și/sau proxies care taie keep-alive → reconectări ciclice. | Crescut `sseConnectionsAccepted/Closed`; user complaints latent. |
| F6 | **JWT expirată în mijloc SSE** | `401` eventual la reconectare cu vechi token; SPA trebuie refresh — clientul gestionează parțial prin backoff + tokenWatch. |
| F7 | **Abuz rate limit mesaje / typing** | **429** la client; degrade experiență, protejează platforma. |
| F8 | **Envelope Redis invalid sau prea mare** | Drop la subscriber; utilizatorului îi lipsesc incremental evenimentele până la poll/fetch. | `redisInvalidDropped` creste — investigație publisher/compromise. |

---

## 6. Recovery plan

1. **Clasificați incidentul:** DB vs Redis vs aplicație vs rețea (LB/CDN).
2. **Redis down:**  
   - Restaurați Redis managed (failover automat sau manual).  
   - Confirmați că toate workerii montează același **`REDIS_URL`**.  
   - NU lăsați permanent `MESSAGING_DISABLE_REDIS=1` pe multi-worker fără conștiență pierdere cross-pod.
3. **DB incident:** failover Postgres standard; migrații Prisma aplicate consecvent pe schema `messages/conversations`.
4. **SSE storm post-deploy:** rollback app (secțiunea 10); verificați dacă modificarea JWT sau ruta `/events` a introdus 401 repetate.
5. **Handler errors în SSE:** urmăriți **`sseHandlerDispatchErrors`** și corelați cu release notes (frontend parse JSON).
6. **Comunicare utilizatori:** „Mesajele se salvează; notificările în timp real pot întârzia scurt“ dacă realtime e degrade dar DB write ok.

---

## 7. Deployment checklist

- [ ] `REDIS_URL` setată identic pentru **toți** workerii producție multi-instancă.  
- [ ] `MESSAGING_DISABLE_REDIS` **ne** este setată la `1` în producție multi-worker (dacă realtime cross-node e cerință).  
- [ ] `JWT_SECRET`, `DATABASE_URL`, credențiale Redis din secret manager.  
- [ ] Migrări Prisma aplicate inclusiv **`deliveredAt`** pe `messages` dacă release include coloana.  
- [ ] **`npx prisma migrate deploy`** rulat în pipeline sau manual controlat pentru release.  
- [ ] Smoke test după deploy: Login user A/B, POST mesaj, **primire SSE** pe instanță diferită (test cu 2 hostname LB sau staggered curl + browser).  
- [ ] Smoke `GET /api/messages/stream-metrics` cu secret acolo unde aveți alerting.  
- [ ] LB: timeout idle SSE > **120 s** (recomandat orientativ; heartbeat la 25 s); `proxy_buffering off` echivalent unde e Nginx/Ingress pentru `/api/messages/events`.  
- [ ] TLS valid pe domeniu; fără mixare HTTP token în producție reală.  

---

## 8. Monitoring checklist

| Metrică / semnal | Unde în cod sau cum | Folos pentru |
|------------------|---------------------|---------------|
| `activeSseClients` | Snapshot `stream-metrics` | Capacitate, leak după reload. |
| `sseConnectionsAccepted` vs `sseConnectionsClosed` | idem | Diferențe anormale ⇒ leak sau reconect storms. |
| `redisPublishFailures` / rate | idem | Incidents Redis/network. |
| `redisInvalidDropped` | idem | Poison messages sau bug publisher. |
| `sseHandlerDispatchErrors` | idem | Erori handler sau payload neașteptat client în branch release. |
| `avgRedisPublishLatencyMsRounded` | idem | Degradare Redis. |
| Log structurat `logger` | Redis subscribe/publish/subscribe.failed | Correlație incident. |
| **DB** | latency / pool saturation | GET conversație la load. |

**Alerting suggerit exemplu:** dacă **`redisPublishFailures / (redisPublishFailures+redisPublishes) > prag** timp de **5 min**, pagină ops + verifică Redis.

---

## 9. Backup strategy

Messaging-ul **persistă în PostgreSQL** (`conversations`, `messages`). Nu există „snapshot messaging“ separat de backup-ul DB.

| Artefact | Strategie recomandată |
|----------|------------------------|
| **PostgreSQL** | Backup periodic (logic + fizic după policy companie): PITR dacă SLA cere. Replica read replica pentru failover. Test restore trimestrial. |
| **Redis** | Folosit pentru pub/sub ephemeral + chei presence; **nu bazați recovery mesaje pe Redis**. Persist opțional AOF/RDB dacă aveți și alți workload-uri Redis — dar mesajele reale sunt în PG. |

Verificări după restore DB:

- Consistența FK `Message.conversationId` → `Conversation`.  
- Constrângerea unic conversație anunț + perechi participanți neschimbată.

---

## 10. Rollback strategy

### Aplicație (release urât în mesagerie)

1. Deploy **versiunea anterioară cunoscută bună** a imaginii/containerului sau checkout git + rebuild.  
2. Re-rulați `prisma migrate` **dedesubt** caută: dacă noua migrație e **additive** (`ADD COLUMN nullable`), rollback app fără `migrate rollback` destructive e safe; dacă migrație distructivă, **coordonați rollback DB** conform politicii dumneavoastră (uneori migrație invers manuală întârziată).

### Redis

- Înlocuirea clusterului Redis sau schimb URI — **restart workeri** după pentru conexii curate subscriber/publisher (`ioredis` reconect în multe scenarii, dar pentru siguranță planificați rulare graceful).

### SSE / config

- **`MESSAGING_DISABLE_REDIS=1`** pe scurt rollback **singur-pod** dacă Redis e problema și aveți tolerate pierderea cross-pod (documentați risc utilizatorilor multi-tab dacă aveți scaling).

---

## Concluzie audit

Implementarea combină **surssă de adevăr Postgres**, **livra realtime SSE** cu **distribuire optională Redis** și **garduri importante** la auth, participant, rate limit și payload Redis. Risc principal rămas din perspectiva securitate operatională este **expunerea tokenului JWT în URL SSE**, care trebuie gestionată prin infra (log-uri, polítici) și prin roadmap (schema auth alternative pentru EventSource).

**Recomandare finală:** păstrați acest audit ca artefact vie — revizuit la fiecare release major touching `lib/messaging-*` sau `app/api/messages`.
