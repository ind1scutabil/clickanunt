/** @jest-environment node */
import {
  formatModerationFlagSummary,
  formatModerationFlagsForNotes,
  userSafeModerationMessage,
} from "@/lib/moderation-flags-format";

describe("moderation flags format", () => {
  it("does not produce [object Object]", () => {
    const flags = [
      { type: "scam", reason: "pattern match" },
      { type: "text", categories: ["spam", "other"] },
      { type: "spam", keywords: ["gratis", "click"] },
      { type: "category_moderation", reason: 'Categoria "Auto" necesită verificare' },
    ];
    const notes = formatModerationFlagsForNotes(flags);
    expect(notes).toBeTruthy();
    expect(notes).not.toContain("[object Object]");
    expect(notes).toContain("scam: pattern match");
    expect(notes).toContain("text: spam|other");
    expect(formatModerationFlagSummary({ type: "image", details: { x: 1 } })).toBe(
      "image"
    );
  });

  it("handles empty / legacy strings", () => {
    expect(formatModerationFlagsForNotes([])).toBeNull();
    expect(formatModerationFlagSummary("legacy-string")).toBe("legacy-string");
    expect(userSafeModerationMessage([])).toBeNull();
    expect(userSafeModerationMessage([{ type: "category_moderation" }])).toMatch(
      /verificare manuală/
    );
  });
});
