"use client";

import { Check, Copy, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyLinkButtonProps {
  url: string;
  /** Show as a pill with the URL text (default: icon-only) */
  variant?: "icon" | "pill";
}

export function CopyLinkButton({ url, variant = "icon" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    // Always copy the full absolute URL
    const fullUrl = url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (variant === "pill") {
    const display = url.startsWith("http")
      ? url.replace(/^https?:\/\//, "")
      : `${typeof window !== "undefined" ? window.location.host : ""}${url}`;

    return (
      <button
        type="button"
        onClick={handleCopy}
        className="group flex items-center gap-2 rounded-lg border bg-muted/40 hover:bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-xs"
        title="Copy link"
      >
        <Link className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{display}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy link">
      {copied ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="sr-only">Copy link</span>
    </Button>
  );
}
