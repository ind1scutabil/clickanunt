/**
 * Defensive cap for GET /api/messages/conversations (ordered by lastMessageAt desc).
 */

import {
  MESSAGING_CONVERSATIONS_DEFAULT,
  MESSAGING_CONVERSATIONS_HARD_MAX,
} from "@/lib/infra/production-limits";

const DEFAULT_MAX = MESSAGING_CONVERSATIONS_DEFAULT;
const HARD_MAX = MESSAGING_CONVERSATIONS_HARD_MAX;

export function resolveConversationsTake(requestedLimit: string | null): number {
  const envMax = Number(process.env.MESSAGING_CONVERSATIONS_MAX);
  const cap =
    Number.isFinite(envMax) && envMax > 0
      ? Math.min(Math.floor(envMax), HARD_MAX)
      : DEFAULT_MAX;

  if (!requestedLimit?.trim()) {
    return cap;
  }

  const parsed = parseInt(requestedLimit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return cap;
  }

  return Math.min(parsed, cap);
}
