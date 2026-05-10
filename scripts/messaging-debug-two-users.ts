/**
 * PASUL 3–4: verificare DB pentru două conturi (fără browser).
 *
 * Usage — exportă întâi `DATABASE_URL` (ex. încarcă `.env`) apoi:
 *   BUYER_EMAIL=buyer@test.com SELLER_EMAIL=seller@test.com npm run debug:messaging
 */

import { prisma } from "@/lib/prisma";
import { conversationParticipantSlots } from "@/lib/messaging-conversation-participants";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "[debug] Lipsește DATABASE_URL în mediu — export din .env și reîncearcă."
    );
    process.exitCode = 1;
    return;
  }

  const buyerEmail =
    process.env.BUYER_EMAIL?.trim().toLowerCase() || "buyer@test.com";
  const sellerEmail =
    process.env.SELLER_EMAIL?.trim().toLowerCase() || "seller@test.com";

  const buyer = await prisma.user.findUnique({ where: { email: buyerEmail } });
  const seller = await prisma.user.findUnique({ where: { email: sellerEmail } });

  if (!buyer) {
    console.error(`[debug] Nu există user cu email ${buyerEmail}`);
    process.exitCode = 1;
    return;
  }
  if (!seller) {
    console.error(`[debug] Nu există user cu email ${sellerEmail}`);
    process.exitCode = 1;
    return;
  }

  const slots = conversationParticipantSlots(buyer.id, seller.id);

  console.log("=== UTILIZATORI ===");
  console.log({ buyerId: buyer.id, sellerId: seller.id, slots });

  for (const label of ["BUYER", "SELLER"] as const) {
    const u = label === "BUYER" ? buyer : seller;
    const convs = await prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: u.id }, { participant2Id: u.id }],
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
