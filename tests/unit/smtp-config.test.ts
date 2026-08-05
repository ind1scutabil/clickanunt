/** @jest-environment node */
import {
  isSmtpTransportConfigured,
  resolveSmtpPassword,
} from "@/lib/smtp-config";

describe("smtp-config", () => {
  it("prefers SMTP_PASS over SMTP_PASSWORD", () => {
    expect(
      resolveSmtpPassword({
        SMTP_PASS: "a",
        SMTP_PASSWORD: "b",
      } as NodeJS.ProcessEnv)
    ).toBe("a");
  });

  it("falls back to SMTP_PASSWORD", () => {
    expect(
      resolveSmtpPassword({
        SMTP_PASSWORD: " only-pass ",
      } as NodeJS.ProcessEnv)
    ).toBe("only-pass");
  });

  it("detects transport when host/user/pass present", () => {
    expect(
      isSmtpTransportConfigured({
        SMTP_HOST: "smtp.example",
        SMTP_USER: "u",
        SMTP_PASSWORD: "p",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isSmtpTransportConfigured({
        SMTP_HOST: "smtp.example",
        SMTP_USER: "u",
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});
