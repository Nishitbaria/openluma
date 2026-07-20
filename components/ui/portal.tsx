"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface PortalProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Portal({ children, className, id }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn("fixed inset-x-0 bottom-0 z-50 bg-background", className)}
      id={id}
    >
      {children}
    </div>,
    document.body
  );
}

export function PortalBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[-1] bg-background/80 backdrop-blur-sm",
        className
      )}
    />
  );
}
