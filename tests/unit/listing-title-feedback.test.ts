/** @jest-environment node */
import { getListingTitleFeedback } from "@/lib/listing-title-feedback";

describe("getListingTitleFeedback", () => {
  it("marks Peugeot alone as too short / hint for Auto", () => {
    const short = getListingTitleFeedback({
      title: "Peug",
      isAutoCategory: true,
    });
    expect(short?.tone).toBe("error");
    expect(short?.message).toBe("Titlul este prea scurt.");

    const peugeot = getListingTitleFeedback({
      title: "Peugeot",
      isAutoCategory: true,
      make: "Peugeot",
    });
    expect(peugeot?.tone).toBe("hint");
    expect(peugeot?.message).toMatch(/Adaugă modelul/);
    expect(JSON.stringify(peugeot)).not.toMatch(/perfect/i);
  });

  it("accepts Peugeot 508 as clear", () => {
    const ok = getListingTitleFeedback({
      title: "Peugeot 508",
      isAutoCategory: true,
      make: "Peugeot",
      model: "508",
    });
    expect(ok).toEqual({ tone: "ok", message: "Titlul este clar." });
  });

  it("hints on vague sale titles", () => {
    const vague = getListingTitleFeedback({
      title: "Vând mașină",
      isAutoCategory: true,
    });
    expect(vague?.tone).toBe("hint");
  });

  it("never returns Titlu perfect", () => {
    for (const title of [
      "Peugeot",
      "BMW",
      "Peugeot 508 1.6 BlueHDi 2017",
      "  iPhone 14 Pro  ",
    ]) {
      const f = getListingTitleFeedback({
        title,
        isAutoCategory: title.toLowerCase().includes("peugeot") || title === "BMW",
      });
      expect(f?.message ?? "").not.toMatch(/perfect/i);
    }
  });
});
