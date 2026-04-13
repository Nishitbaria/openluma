import type React from "react";
import { cn } from "@/lib/utils";

export function LogoIcon({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-6", className)}
      {...props}
    >
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 7v8h6"
        stroke="var(--background, #fff)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function Logo({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 130 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5", className)}
      {...props}
    >
      {/* Icon */}
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M7 7v8h6"
        stroke="var(--background, #fff)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="2.5" fill="currentColor" opacity="0.4" />

      {/* Text */}
      <text
        x="30"
        y="17.5"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        fontSize="16"
        fill="currentColor"
      >
        OpenLuma
      </text>
    </svg>
  );
}
