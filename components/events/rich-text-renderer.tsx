"use client";

import Link from "@tiptap/extension-link";
import { generateHTML } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "react";

interface RichTextRendererProps {
  content: string;
}

export function RichTextRenderer({ content }: RichTextRendererProps) {
  const html = useMemo(() => {
    try {
      const json = JSON.parse(content);
      return generateHTML(json, [StarterKit, Link]);
    } catch {
      return null;
    }
  }, [content]);

  if (!html) {
    return null;
  }

  return (
    <div
      className="tiptap-prose text-muted-foreground text-sm"
      // Safe: generateHTML only renders known Tiptap node types — no arbitrary HTML
      // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled Tiptap output
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
