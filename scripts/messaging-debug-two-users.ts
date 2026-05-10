/**
 * PASUL 3–4: verificare DB pentru două conturi (fără browser).
 *
 * Usage — încarcă `DATABASE_URL` (ex.: `set -a && source .env && set +a`):
 *   npm run debug:messaging
 *
 * Opțional (doi useri concreți):
 *   BUYER_EMAIL=… SELLER_EMAIL=… npm run debug:messaging
 *
 * Dacă lipsesc userii pentru emailuri, sau emailurile nu există în DB:
 *   rezolvă automat primul listing (deletedAt: null) + owner + alt user.
 */

import { prisma } from "../lib/prisma";
import { conversationParticipantSlots } from "../lib/messaging-conversation-participants";
import { canonicalMessagingUserId } from "../lib/messaging-user-id";

async function main() {
  if (process.env.USE_IN_MEMORY_DB === "true") {
    console.error("[debug] USE_IN_MEMORY_DB=true — necesită Postgres real.");
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    console.error(
      "[debug] Lipsește DATABASE_URL în mediu — export din .env și reîncearcă."
    );
    process.exitCode = 1;
    return;
  }

  const buyerEmailEnv = process.env.BUYER_EMAIL?.trim().toLowerCase();
  const sellerEmailEnv = process.env.SELLER_EMAIL?.trim().toLowerCase();

  let buyer = buyerEmailEnv
    ? await prisma.user.findUnique({ where: { email: buyerEmailEnv } })
    : null;
  let seller = sellerEmailEnv
    ? await prisma.user.findUnique({ where: { email: sellerEmailEnv } })
    : null;

  if (!buyer || !seller || buyer.id === seller.id) {
    if (buyerEmailEnv || sellerEmailEnv) {
      console.warn(
        "[debug] Emailurile nu rezolvă doi useri distincți — folosesc fallback (primul listing + alt user)."
      );
    }
    const listing = await prisma.listing.findFirst({
      where: { deletedAt: null },
    });
    if (!listing) {
      console.error("[debug] Nu există listing cu deletedAt null.");
      process.exitCode = 1;
      return;
    }
    const owner = await prisma.user.findUnique({
      where: { id: listing.ownerUserId },
    });
    const other = await prisma.user.findFirst({
      where: {
        id: { not: listing.ownerUserId },
        deletedAt: null,
      },
    });
    if (!owner || !other) {
      console.error(
        "[debug] Nu pot rezolva owner + buyer diferit pentru listing."
      );
      process.exitCode = 1;
      return;
    }
    seller = owner;
    buyer = other;
  }

  const slots = conversationParticipantSlots(buyer.id, seller.id);

  console.log("=== UTILIZATORI ===");
  console.log({ buyerId: buyer.id, sellerId: seller.id, slots });

  for (const label of ["BUYER", "SELLER"] as const) {
    const u = label === "BUYER" ? buyer! : seller!;
    const userCanon =
      canonicalMessagingUserId(u.id) ?? u.id.trim().toLowerCase();
    const convs = await prisma.conversation.findMany({
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
        lastMessageAt: true,
        messages: {
          select: { id: true, senderId: true, receiverId: true, content: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    console.log(`\n=== CONVERSAȚII ${label} (${u.email}) count=${convs.length} ===`);
    console.log("ids:", convs.map((c) => c.id));
    for (const c of convs) {
      console.log({
        conversationId: c.id,
        listingId: c.listingId,
        p1: c.participant1Id,
        p2: c.participant2Id,
        messageCount: c._count.messages,
        lastFew: c.messages,
      });
    }
  }

  const pairListingConvs = await prisma.conversation.findMany({
    where: {
      participant1Id: slots.participant1Id,
      participant2Id: slots.participant2Id,
    },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true, listingId: true, lastMessageAt: true },
  });
  console.log("\n=== TOATE FIRURILE între BUYER și SELLER (după slots) ===");
  console.log(pairListingConvs);
  if (pairListingConvs.length > 1) {
    console.warn(
      "[debug] ATENȚIE: mai mult de un rând între aceiași doi participanți — diferențiere doar după listingId."
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
