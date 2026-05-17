import { prisma } from "@/lib/prisma";
import { formatListingExpiryDateRO } from "@/lib/listing-expiry";

export const USER_NOTIFICATION_TITLES = {
  benefitsGranted: "Beneficii adăugate în cont",
  listingPromoted: "Anunț promovat",
  promotionUpdated: "Promovare actualizată",
} as const;

const BENEFITS_GRANTED_MESSAGE =
  "Administratorul ți-a adăugat beneficii/credite în cont. Le poți folosi pentru promovarea anunțurilor.";

const DEDUP_WINDOW_MS = 5 * 60 * 1000;

export type ListingPromotionNotifyInput = {
  userId: string;
  listingTitle: string;
  promotionExpiresAt: Date;
  wasPromoted: boolean;
  previousPromotionExpiresAt: Date | null;
};

export function buildListingPromotionNotification(input: ListingPromotionNotifyInput): {
  title: string;
  message: string;
} | null {
  const prev = input.previousPromotionExpiresAt;
  const next = input.promotionExpiresAt;
  const expiresLabel = formatListingExpiryDateRO(next);

  if (
    input.wasPromoted &&
    prev &&
    prev.getTime() === next.getTime()
  ) {
    return null;
  }

  const isUpdate =
    input.wasPromoted &&
    prev != null &&
    prev.getTime() !== next.getTime();

  const title = isUpdate
    ? USER_NOTIFICATION_TITLES.promotionUpdated
    : USER_NOTIFICATION_TITLES.listingPromoted;

  const message = isUpdate
    ? `Promovarea pentru anunțul «${input.listingTitle}» este activă până la ${expiresLabel}.`
    : `Anunțul tău «${input.listingTitle}» a fost promovat până la ${expiresLabel}.`;

  return { title, message };
}

export async function createUserNotification(params: {
  userId: string;
  title: string;
  message: string;
}): Promise<{ id: string } | null> {
  const recent = await prisma.userNotification.findFirst({
    where: {
      userId: params.userId,
      title: params.title,
      message: params.message,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (recent && Date.now() - recent.createdAt.getTime() < DEDUP_WINDOW_MS) {
    return { id: recent.id };
  }

  const row = await prisma.userNotification.create({
    data: {
      userId: params.userId,
      title: params.title,
      message: params.message,
    },
    select: { id: true },
  });

  return row;
}

export async function notifyBenefitsGranted(userId: string): Promise<void> {
  await createUserNotification({
    userId,
    title: USER_NOTIFICATION_TITLES.benefitsGranted,
    message: BENEFITS_GRANTED_MESSAGE,
  });
}

export async function notifyListingPromoted(
  input: ListingPromotionNotifyInput
): Promise<void> {
  const built = buildListingPromotionNotification(input);
  if (!built) return;

  await createUserNotification({
    userId: input.userId,
    title: built.title,
    message: built.message,
  });
}
