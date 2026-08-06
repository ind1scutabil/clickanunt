/** @jest-environment jsdom */
/**
 * Regression test for the 2026-08-05 incident: NEXT_PUBLIC_GA_ID /
 * NEXT_PUBLIC_CLARITY_ID are the SAME real IDs in every environment's
 * .env.production, including a developer's local checkout. A local
 * `npm run build && next start` (or any non-canonical host) must never load
 * the real analytics tags, regardless of NODE_ENV or consent.
 */
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { GoogleAnalytics } from "@/app/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/app/components/analytics/MicrosoftClarity";

const ORIGINAL_ENV = process.env.NODE_ENV;

function setHostname(hostname: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, hostname, href: `https://${hostname}/`, host: hostname },
    writable: true,
  });
}

async function renderGoogleAnalytics() {
  return render(<GoogleAnalytics />);
}

async function renderMicrosoftClarity() {
  return render(<MicrosoftClarity />);
}

describe("analytics canonical-host guard", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_GA_ID = "G-C0F3DZEDPG";
    process.env.NEXT_PUBLIC_CLARITY_ID = "abc123";
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(process.env, "NODE_ENV", { value: ORIGINAL_ENV, configurable: true });
  });

  it("does NOT render the GA script tag on localhost, even with a real ID and NODE_ENV=production", async () => {
    setHostname("localhost");
    const { container } = await renderGoogleAnalytics();
    expect(container.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
  });

  it("does NOT render on an arbitrary test host", async () => {
    setHostname("some-preview-deploy.example.com");
    const { container } = await renderGoogleAnalytics();
    expect(container.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
  });

  it("DOES render on the canonical apex domain", async () => {
    setHostname("clickanunt.ro");
    await renderGoogleAnalytics();
    // next/script injects into document.head, not the render container.
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).not.toBeNull();
  });

  it("DOES render on the canonical www subdomain", async () => {
    setHostname("www.clickanunt.ro");
    await renderGoogleAnalytics();
    expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).not.toBeNull();
  });

  it("rejects a lookalike host (clickanunt.ro.evil.example)", async () => {
    setHostname("clickanunt.ro.evil.example");
    const { container } = await renderGoogleAnalytics();
    expect(container.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
  });

  it("Microsoft Clarity: does NOT render on localhost", async () => {
    setHostname("localhost");
    const { container } = await renderMicrosoftClarity();
    expect(container.querySelector("script#microsoft-clarity")).toBeNull();
  });

  it("Microsoft Clarity: DOES render on the canonical host", async () => {
    setHostname("www.clickanunt.ro");
    await renderMicrosoftClarity();
    expect(document.querySelector("script#microsoft-clarity")).not.toBeNull();
  });
});
