import type React from "react";
import { cn } from "@/lib/utils";

export function LogoIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("size-6", className)}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect fill="currentColor" height="24" rx="6" width="24" />
      <path
        d="M7 7v8h6"
        stroke="var(--background, #fff)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <circle cx="18" cy="6" fill="currentColor" opacity="0.4" r="2.5" />
    </svg>
  );
}

export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      className={cn("h-5", className)}
      fill="none"
      viewBox="0 0 130 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Icon */}
      <rect fill="currentColor" height="24" rx="6" width="24" />
      <path
        d="M7 7v8h6"
        stroke="var(--background, #fff)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <circle cx="18" cy="6" fill="currentColor" opacity="0.4" r="2.5" />

      {/* Text */}
      <text
        fill="currentColor"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="16"
        fontWeight="700"
        x="30"
        y="17.5"
      >
        OpenLuma
      </text>
    </svg>
  );
}
