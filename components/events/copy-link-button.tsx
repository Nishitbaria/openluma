"use client";

import { Check, Copy, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const HTTP_PROTOCOL_RE = /^https?:\/\//;

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
      ? url.replace(HTTP_PROTOCOL_RE, "")
      : `${typeof window === "undefined" ? "" : window.location.host}${url}`;

    return (
      <button
        className="group flex max-w-xs items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        onClick={handleCopy}
        title="Copy link"
        type="button"
      >
        <Link className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{display}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    );
  }

  return (
    <Button onClick={handleCopy} size="icon" title="Copy link" variant="ghost">
      {copied ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      <span className="sr-only">Copy link</span>
    </Button>
  );
}
