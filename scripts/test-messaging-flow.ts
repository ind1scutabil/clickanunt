/**
 * Test reproducibil pentru fluxul mesajelor (DOAR DB + aceeași logică ca inbox-ul).
 *
 * Nu deschide browser. Verifică ceea ce utilizatorul a cerut pentru „PASS local + DB”.
 *
 * Cerințe: `DATABASE_URL` în mediu (ex. încarcă `.env`).
 *
 *   npm run test:messaging-flow
 *
 * Opțional:
 *   BUYER_EMAIL=x SELLER_EMAIL=y LISTING_ID=z npm run test:messaging-flow
 */

import { prisma } from "../lib/prisma";
import { conversationParticipantSlots } from "../lib/messaging-conversation-participants";
import {
  canonicalMessagingUserId,
  messagingUserIdsEqual,
} from "../lib/messaging-user-id";

function fail(msg: string): never {
  console.error(`\nFAIL: ${msg}`);
  process.exit(1);
}

/** Ca GET /api/messages/conversations */
async function fetchConversationsForViewer(viewerDbId: string) {
  const userCanon =
    canonicalMessagingUserId(viewerDbId) ?? viewerDbId.trim().toLowerCase();
  return prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: userCanon },
        { participant2Id: userCanon },
      ],
    },
    select: {
      id: true,
      listingId: true,
      participant1Id: true,
      participant2Id: true,
    },
  });
}

/** Ca firul inclus într-o conversație (participant valid); fără filtru sender/receiver pe listă — doar membrii conversației */
async function assertParticipantSeesConversation(
  label: string,
  viewerDbId: string,
  conversationId: string
) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conv) {
    fail(`${label}: conversație inexistentă ${conversationId}`);
  }
  const ok =
    messagingUserIdsEqual(conv.participant1Id, viewerDbId) ||
    messagingUserIdsEqual(conv.participant2Id, viewerDbId);
  if (!ok) {
    fail(
      `${label}: user ${viewerDbId} nu este participant în ${conversationId} (p1=${conv.participant1Id}, p2=${conv.participant2Id})`
    );
  }
  return conv;
}

async function main() {
  console.log("[test-messaging-flow] start\n");

  if (process.env.USE_IN_MEMORY_DB === "true") {
    fail("USE_IN_MEMORY_DB=true — testul necesită Postgres real.");
  }
  if (!process.env.DATABASE_URL?.trim()) {
    fail(
      "Lipsește DATABASE_URL — export din .env (ex.: `set -a && source .env && set +a && npm run test:messaging-flow`)"
    );
  }

  let buyer = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
  let seller = null as Awaited<ReturnType<typeof prisma.user.findUnique>>;
  let listing = null as Awaited<ReturnType<typeof prisma.listing.findFirst>>;

  const buyerEmail = process.env.BUYER_EMAIL?.trim().toLowerCase();
  const sellerEmail = process.env.SELLER_EMAIL?.trim().toLowerCase();
  const listingIdEnv = process.env.LISTING_ID?.trim();

  if (buyerEmail && sellerEmail) {
    buyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
    seller = await prisma.user.findUnique({ where: { email: sellerEmail } });
    if (!buyer || !seller) {
      fail(`User negăsit (buyer sau seller după email).`);
    }
    if (listingIdEnv) {
      listing = await prisma.listing.findFirst({
        where: { id: listingIdEnv, deletedAt: null },
      });
    } else {
      listing = await prisma.listing.findFirst({
        where: {
          deletedAt: null,
          ownerUserId: seller.id,
        },
      });
    }
  } else {
    listing = await prisma.listing.findFirst({
      where: { deletedAt: null },
    });
    if (!listing) {
      fail(
        "Nu există niciun listing activ (deletedAt: null); creează un anunț sau setează LISTING_ID + BUYER_EMAIL + SELLER_EMAIL."
      );
    }
    seller = await prisma.user.findUnique({
      where: { id: listing.ownerUserId },
    });
    if (!seller) {
      fail(`Owner listing negăsit: ${listing.ownerUserId}`);
    }
    buyer = await prisma.user.findFirst({
      where: {
        id: { not: seller.id },
        deletedAt: null,
      },
    });
    if (!buyer) {
      fail(
        "Nu există un al doilea user în DB (buyer diferit de seller). Creează un cont sau folosește BUYER_EMAIL/SELLER_EMAIL."
      );
    }
  }

  if (!listing) {
    fail("Nu s-a putut rezolva un listing pentru test.");
  }

  console.log("=== UTILIZATORI & LISTING ===");
  console.log({
    buyerId: buyer!.id,
    buyerEmail: buyer!.email,
    sellerId: seller!.id,
    sellerEmail: seller!.email,
    listingId: listing.id,
    listingTitle: listing.title,
  });

  const slots = conversationParticipantSlots(buyer!.id, seller!.id);
  console.log("\n=== SLOTS (align @@unique) ===");
  console.log(slots);

  let conversation = await prisma.conversation.findFirst({
    where: {
      participant1Id: slots.participant1Id,
      participant2Id: slots.participant2Id,
      listingId: listing.id,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participant1Id: slots.participant1Id,
        participant2Id: slots.participant2Id,
        listingId: listing.id,
      },
    });
    console.log("\n(+ creat conversație nouă pentru listing + pereche)\n");
  } else {
    console.log("\n( conversație existentă refolosită )\n");
  }

  console.log("=== conversationId ===", conversation.id);

  const tag = Date.now();

  /* Mesaj buyer -> seller */
  const buyerCanon =
    canonicalMessagingUserId(buyer!.id) ?? buyer!.id.trim().toLowerCase();
  const sellerCanon =
    canonicalMessagingUserId(seller!.id) ?? seller!.id.trim().toLowerCase();

  const m1 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: buyerCanon,
      receiverId: sellerCanon,
      content: `[test-flow] buyer->seller ${tag}`,
    },
  });

  console.log("\n=== MESAJ 1 În DB ===");
  console.log({
    messageId: m1.id,
    conversationId: m1.conversationId,
    senderId: m1.senderId,
    receiverId: m1.receiverId,
    listingIdConversation: listing.id,
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  let buyerList = await fetchConversationsForViewer(buyer!.id);
  let sellerList = await fetchConversationsForViewer(seller!.id);
  console.log("\n=== DUPĂ MSG1 — fetch conversations BUYER === ");
  console.log("count:", buyerList.length, "ids:", buyerList.map((c) => c.id));
  console.log("\n=== DUPĂ MSG1 — fetch conversations SELLER === ");
  console.log("count:", sellerList.length, "ids:", sellerList.map((c) => c.id));

  const buyerHas = buyerList.some((c) => c.id === conversation.id);
  const sellerHas = sellerList.some((c) => c.id === conversation.id);
  if (!buyerHas || !sellerHas) {
    fail(
      `Conversația ${conversation.id} nu apare pentru ambii după MSG1 — buyer:${buyerHas} seller:${sellerHas}`
    );
  }

  const convForBuyer = await assertParticipantSeesConversation(
    "buyer",
    buyer!.id,
    conversation.id
  );
  const convForSeller = await assertParticipantSeesConversation(
    "seller",
    seller!.id,
    conversation.id
  );

  const msgBuyer = convForBuyer.messages.find((x) => x.id === m1.id);
  if (!msgBuyer) {
    fail("Buyer: fetch conversationId nu întoarce mesajul nou.");
  }

  const msgSeller = convForSeller.messages.find((x) => x.id === m1.id);
  if (!msgSeller) {
    fail("Seller: fetch conversationId nu întoarce mesajul nou.");
  }

  /* Mesaj seller -> buyer */
  const m2 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: sellerCanon,
      receiverId: buyerCanon,
      content: `[test-flow] seller->buyer ${tag}`,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  const convBuyer2 = await assertParticipantSeesConversation(
    "buyer-final",
    buyer!.id,
    conversation.id
  );
  const lastBuyer = convBuyer2.messages.filter((x) => x.id === m2.id);
  if (lastBuyer.length !== 1) {
    fail("Buyer nu vede răspunsul seller după MSG2.");
  }

  console.log("\n=== MESAJ 2 În DB ===");
  console.log({
    messageId: m2.id,
    conversationId: m2.conversationId,
    senderId: m2.senderId,
    receiverId: m2.receiverId,
  });

  const lastInDb = await prisma.message.findFirst({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
  });
  console.log("\n=== ULTIM MESAJ ÎN DB (conversation) ===");
  console.log(lastInDb);

  console.log(
    "\nPASS: același conversationId pentru buyer/seller; conversația listată pentru ambii; mesaje vizibile pentru ambii după cele două direcții."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
