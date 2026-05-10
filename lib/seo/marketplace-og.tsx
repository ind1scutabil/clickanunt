import { ImageResponse } from "next/og";

export const MARKETPLACE_OG_SIZE = { width: 1200, height: 630 } as const;

type OgOpts = {
  title: string;
  subtitle?: string;
  priceLine?: string;
  footer?: string;
};

/** Shared 1200×630 OG artwork — Romanian marketplace style, dark theme. */
export function marketplaceOpenGraphImageResponse({ title, subtitle, priceLine, footer }: OgOpts) {
  const safeTitle = title.slice(0, 120) || "ClickAnunț";
  const safeSub = subtitle?.slice(0, 140);
  const safePrice = priceLine?.slice(0, 80);
  const safeFooter = footer?.slice(0, 80) ?? "www.clickanunt.ro";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background: "linear-gradient(145deg, #0f1117 0%, #151a24 45%, #1a1530 100%)",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1 0%, #22d3ee 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            CA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#a5b4fc", fontSize: 22, fontWeight: 700 }}>ClickAnunț</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18 }}>Marketplace · România</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, justifyContent: "center" }}>
          <div
            style={{
              fontSize: safeTitle.length > 70 ? 44 : 56,
              fontWeight: 800,
              color: "#f8fafc",
              lineHeight: 1.12,
              letterSpacing: -0.02,
            }}
          >
            {safeTitle}
          </div>
          {safeSub ? (
            <div style={{ fontSize: 28, color: "rgba(226,232,240,0.85)", lineHeight: 1.35 }}>{safeSub}</div>
          ) : null}
          {safePrice ? (
            <div
              style={{
                marginTop: 8,
                fontSize: 36,
                fontWeight: 700,
                color: "#7dd3fc",
              }}
            >
              {safePrice}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "rgba(148,163,184,0.9)",
            fontSize: 22,
          }}
        >
          <span>{safeFooter}</span>
          <span style={{ color: "rgba(99,102,241,0.95)", fontWeight: 600 }}>Anunțuri gratuite</span>
        </div>
      </div>
    ),
    { ...MARKETPLACE_OG_SIZE },
  );
}
