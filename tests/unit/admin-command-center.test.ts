/** @jest-environment node */
import {
  ADMIN_COMMAND_CARDS,
  ADMIN_COMMAND_CENTER_HEADING,
  ADMIN_COMMAND_CENTER_ROUTES,
  ADMIN_MODERATION_QUICK_LINKS,
  resolveAdminCardCount,
  resolveQuickLinkCount,
  type AdminCommandCenterStats,
} from "@/app/components/admin/admin-command-center-config";

describe("admin command center config", () => {
  const stats: AdminCommandCenterStats = {
    pendingListings: 3,
    activeListings: 28,
    registeredUsers: 42,
    reportsReceived: 1,
  };

  it("exposes expected heading", () => {
    expect(ADMIN_COMMAND_CENTER_HEADING).toBe("Admin Command Center");
  });

  it("defines six priority cards with existing admin routes", () => {
    expect(ADMIN_COMMAND_CARDS).toHaveLength(6);
    const hrefs = ADMIN_COMMAND_CARDS.map((c) => c.href);
    expect(hrefs.some((h) => h.startsWith("/admin/moderation"))).toBe(true);
    expect(hrefs).toContain("/admin/promotions");
    expect(hrefs).toContain("/admin/invoices");
    expect(hrefs).toContain("/admin/messaging");
    expect(hrefs).toContain("/listings");
  });

  it("moderation quick links target moderation tabs", () => {
    for (const link of ADMIN_MODERATION_QUICK_LINKS) {
      expect(link.href.startsWith("/admin/moderation")).toBe(true);
    }
    expect(ADMIN_MODERATION_QUICK_LINKS.map((l) => l.id)).toEqual(
      expect.arrayContaining(["pending", "users", "reports", "rejected"])
    );
  });

  it("resolveAdminCardCount returns null when no countKey", () => {
    const promos = ADMIN_COMMAND_CARDS.find((c) => c.id === "promotions")!;
    expect(resolveAdminCardCount(promos, stats)).toBeNull();
  });

  it("resolveAdminCardCount returns number when countKey set", () => {
    const mod = ADMIN_COMMAND_CARDS.find((c) => c.id === "moderation")!;
    expect(resolveAdminCardCount(mod, stats)).toBe(3);
  });

  it("resolveQuickLinkCount handles missing key", () => {
    const rejected = ADMIN_MODERATION_QUICK_LINKS.find((l) => l.id === "rejected")!;
    expect(resolveQuickLinkCount(rejected, stats)).toBeNull();
  });

  it("all command center base routes are known admin paths", () => {
    for (const route of ADMIN_COMMAND_CENTER_ROUTES) {
      expect(
        route.startsWith("/admin") || route === "/listings"
      ).toBe(true);
    }
  });
});
