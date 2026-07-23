import { ImageResponse } from "next/og";

export const size = { height: 32, width: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#000000",
        borderRadius: "7px",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
        <path
          d="M7 7v8h6"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <circle cx="18" cy="6" fill="white" opacity="0.4" r="2.5" />
      </svg>
    </div>,
    { ...size }
  );
}
