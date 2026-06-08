import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Brightex Solutions — Digital Agency Nairobi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #152238 0%, #1c2f4f 55%, #0d1928 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "rgba(249,168,37,0.08)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: 220,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "rgba(249,168,37,0.05)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 160,
            right: 80,
            width: 180,
            height: 180,
            borderRadius: "50%",
            border: "1px solid rgba(249,168,37,0.12)",
            display: "flex",
          }}
        />

        {/* Gold accent bar + location tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div
            style={{
              background: "#f9a825",
              width: 5,
              height: 32,
              borderRadius: 3,
              display: "flex",
            }}
          />
          <span
            style={{
              color: "#f9a825",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Nairobi · Kenya
          </span>
        </div>

        {/* Company name */}
        <div
          style={{
            color: "#ffffff",
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            marginBottom: 20,
            display: "flex",
          }}
        >
          Brightex Solutions
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "rgba(255,255,255,0.55)",
            fontSize: 26,
            fontWeight: 400,
            marginBottom: 52,
            display: "flex",
          }}
        >
          Digital Agency — Websites, ERP &amp; AI Tools
        </div>

        {/* CTA pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              padding: "14px 32px",
              background: "#f9a825",
              borderRadius: 8,
              color: "#152238",
              fontSize: 20,
              fontWeight: 700,
              display: "flex",
            }}
          >
            brightexsolutions.co.ke
          </div>
          <div
            style={{
              padding: "14px 32px",
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: 8,
              color: "rgba(255,255,255,0.7)",
              fontSize: 20,
              fontWeight: 500,
              display: "flex",
            }}
          >
            Web · ERP · AI
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
