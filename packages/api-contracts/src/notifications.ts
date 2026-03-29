import type { IsoDateTimeString } from './common';

/**
 * In-app notification row (Prisma `UserNotification` — `prisma/schema.prisma`).
 * Exposed by GET /api/notifications (`app/api/notifications/route.ts`).
 */
export type UserNotificationDto = {
  id: string;
  userId: string;
  broadcastId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  readAt: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
};

/** GET /api/notifications — JSON envelope. */
export type NotificationsListResponseDto = {
  notifications: UserNotificationDto[];
};
