import {
  FAVORITES_LIST_MAX,
  MESSAGING_CONVERSATIONS_HARD_MAX,
  PAGINATION_MAX_LIMIT,
  PHONE_REVEAL_MAX_PER_HOUR,
} from "@/lib/infra/production-limits";
import { resolveConversationsTake } from "@/lib/messaging/conversations-limit";

describe("production limits", () => {
  it("exports stable cap constants", () => {
    expect(PAGINATION_MAX_LIMIT).toBe(100);
    expect(FAVORITES_LIST_MAX).toBe(500);
    expect(MESSAGING_CONVERSATIONS_HARD_MAX).toBe(500);
    expect(PHONE_REVEAL_MAX_PER_HOUR).toBe(40);
  });

  it("resolveConversationsTake clamps requested limit to default cap", () => {
    expect(resolveConversationsTake("9999")).toBe(250);
    process.env.MESSAGING_CONVERSATIONS_MAX = String(MESSAGING_CONVERSATIONS_HARD_MAX);
    expect(resolveConversationsTake("9999")).toBe(MESSAGING_CONVERSATIONS_HARD_MAX);
    delete process.env.MESSAGING_CONVERSATIONS_MAX;
  });
});
