import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
          borderRadius: 8,
          border: "2px solid #e8352b",
        }}
      >
        <span style={{ color: "#e8352b", fontSize: 20, fontWeight: 900 }}>D</span>
      </div>
    ),
    { ...size }
  );
}
