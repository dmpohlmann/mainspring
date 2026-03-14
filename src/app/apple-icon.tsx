import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1B3A5C",
          borderRadius: "22%",
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(256, 256)">
            <circle cx="0" cy="0" r="145" fill="none" stroke="#ffffff" strokeWidth="6" />
            <circle cx="0" cy="0" r="10" fill="#C9964C" />
            <path
              d="M 0,-22 A 22,22 0 1,1 0,22 A 46,46 0 1,1 0,-46 A 70,70 0 1,1 0,70 A 94,94 0 1,1 0,-94 A 118,118 0 1,1 0,118"
              fill="none"
              stroke="#ffffff"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="0" cy="118" r="10" fill="#ffffff" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
