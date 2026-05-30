import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: "#000000",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "7px",
      }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
          d="M7 7v8h6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="6" r="2.5" fill="white" opacity="0.4" />
      </svg>
    </div>,
    { ...size }
  );
}
