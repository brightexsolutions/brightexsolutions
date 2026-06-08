import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#152238",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#f9a825",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 22,
            lineHeight: 1,
          }}
        >
          B
        </span>
      </div>
    ),
    { ...size }
  );
}
