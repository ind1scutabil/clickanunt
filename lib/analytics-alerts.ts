/**
 * Derived alerts: volume spikes/drops and conversion changes (real aggregates only).
 */

import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENT } from "@/lib/analytics-events";

export type AnalyticsAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  kind: "volume_spike" | "volume_drop" | "conversion_drop";
  message: string;
  metric: string;
  current: number;
  baseline: number;
  ratio: number | null;
};

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export async function computeAnalyticsAlerts(): Promise<AnalyticsAlert[]> {
  const alerts: AnalyticsAlert[] = [];
  const t0 = hoursAgo(24);
  const t1 = hoursAgo(48);

  const [views24, viewsPrev24, contacts24, contactsPrev24] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        createdAt: { gte: t0 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        createdAt: { gte: t1, lt: t0 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_contact_click,
        createdAt: { gte: t0 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_contact_click,
        createdAt: { gte: t1, lt: t0 },
      },
    }),
  ]);

  const minBaseline = 30;
  if (viewsPrev24 >= minBaseline) {
    const ratio = views24 / viewsPrev24;
    if (ratio >= 2) {
      alerts.push({
        id: "views_spike_24h",
        severity: ratio >= 3 ? "critical" : "warning",
        kind: "volume_spike",
        message: `listing_view count in the last 24h is ${(ratio * 100).toFixed(0)}% of the prior 24h window.`,
        metric: "listing_view",
        current: views24,
        baseline: viewsPrev24,
        ratio,
      });
    } else if (ratio <= 0.5) {
      alerts.push({
        id: "views_drop_24h",
        severity: "warning",
        kind: "volume_drop",
        message: `listing_view count in the last 24h dropped to ${(ratio * 100).toFixed(0)}% of the prior 24h window.`,
        metric: "listing_view",
        current: views24,
        baseline: viewsPrev24,
        ratio,
      });
    }
  }

  const start7 = hoursAgo(7 * 24);
  const start14 = hoursAgo(14 * 24);

  const [v7, c7, vPrev, cPrev] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        createdAt: { gte: start7 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_contact_click,
        createdAt: { gte: start7 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_view,
        createdAt: { gte: start14, lt: start7 },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: ANALYTICS_EVENT.listing_contact_click,
        createdAt: { gte: start14, lt: start7 },
      },
    }),
  ]);

  const rate7 = v7 > 0 ? c7 / v7 : null;
  const ratePrev = vPrev > 0 ? cPrev / vPrev : null;
  const minViewsForConversion = 200;

  if (
    rate7 != null &&
    ratePrev != null &&
    v7 >= minViewsForConversion &&
    vPrev >= minViewsForConversion &&
    rate7 < ratePrev * 0.8
  ) {
    alerts.push({
      id: "contact_conversion_drop_7d",
      severity: "warning",
      kind: "conversion_drop",
      message: `View→contact rate last 7d (${(rate7 * 100).toFixed(2)}%) is more than 20% below the previous 7d (${(ratePrev * 100).toFixed(2)}%).`,
      metric: "view_to_contact_rate",
      current: rate7,
      baseline: ratePrev,
      ratio: ratePrev > 0 ? rate7 / ratePrev : null,
    });
  }

  if (viewsPrev24 >= minBaseline && contactsPrev24 >= 10) {
    const r24 = views24 > 0 ? contacts24 / views24 : 0;
    const rPrev24 = viewsPrev24 > 0 ? contactsPrev24 / viewsPrev24 : 0;
    if (rPrev24 > 0 && r24 < rPrev24 * 0.75 && views24 >= 50) {
      alerts.push({
        id: "contact_conversion_drop_24h",
        severity: "info",
        kind: "conversion_drop",
        message: `Short-term view→contact rate fell vs prior 24h (current ${(r24 * 100).toFixed(2)}% vs ${(rPrev24 * 100).toFixed(2)}%).`,
        metric: "view_to_contact_rate_24h",
        current: r24,
        baseline: rPrev24,
        ratio: r24 / rPrev24,
      });
    }
  }

  return alerts;
}
