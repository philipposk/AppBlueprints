import { ImageResponse } from "next/og";

export const alt = "AppBlueprints";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Share card shown when a link to the site is posted (Open Graph / Twitter).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{"AppBlueprints"}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#cbd5e1", maxWidth: 1000 }}>{"Talk through your app idea and get a development blueprint you can build from."}</div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#94a3b8" }}>by 6x7</div>
      </div>
    ),
    size,
  );
}
