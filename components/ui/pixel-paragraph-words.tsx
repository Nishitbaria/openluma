import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Pixel-font constants                                                */
/* ------------------------------------------------------------------ */

type PixelFont = "square" | "grid" | "circle" | "triangle" | "line";

const PIXEL_FONT_MAP: Record<PixelFont, string> = {
  circle: "font-pixel-circle",
  grid: "font-pixel-grid",
  line: "font-pixel-line",
  square: "font-pixel-square",
  triangle: "font-pixel-triangle",
};

/* ------------------------------------------------------------------ */
/* Text-splitting helper                                               */
/* ------------------------------------------------------------------ */

type Segment =
  | { type: "plain"; text: string }
  | { type: "pixel"; text: string };

/**
 * Splits `text` into alternating plain / pixel segments based on the
 * provided `pixelWords`.  Longer phrases are matched first so that
 * "shadcn/ui" wins over a hypothetical "ui" match.
 */
function splitTextByPixelWords(text: string, pixelWords: string[]): Segment[] {
  if (pixelWords.length === 0) {
    return [{ text, type: "plain" }];
  }

  // Sort by length descending so longer matches take priority
  const sorted = [...pixelWords].sort((a, b) => b.length - a.length);

  // Escape regex-special characters in each word
  const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  const pattern = new RegExp(`(${escaped.join("|")})`, "g");

  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index ?? 0;
    if (matchStart > lastIndex) {
      segments.push({ text: text.slice(lastIndex, matchStart), type: "plain" });
    }
    segments.push({ text: match[0], type: "pixel" });
    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), type: "plain" });
  }

  return segments;
}

/* ------------------------------------------------------------------ */
/* PixelParagraph                                                      */
/* ------------------------------------------------------------------ */

export interface PixelParagraphProps extends React.ComponentProps<"p"> {
  /** The wrapper element to render. @default "p" */
  as?: "p" | "span" | "div";
  /** The pixel font for highlighted words. @default "square" */
  font?: PixelFont;
  /** Extra className applied to each pixel-word span. */
  pixelWordClassName?: string;
  /**
   * Words or phrases within `text` to render in a pixel font.
   * Matching is case-sensitive and longest-match-first.
   */
  pixelWords?: string[];
  /** The paragraph text to render. */
  text: string;
}

/**
 * Paragraph that renders specific words / phrases in a pixel font
 * while the rest stays in the normal typeface.
 *
 * @example
 * <PixelParagraph
 *   text="54+ animated components and effects. Free, open source, and built to drop into any shadcn/ui project."
 *   pixelWords={["animated", "shadcn/ui"]}
 *   font="square"
 *   className="text-lg text-muted-foreground"
 * />
 */
export function PixelParagraph({
  text,
  pixelWords = [],
  as: Tag = "p",
  className,
  font = "square",
  pixelWordClassName,
  ...props
}: PixelParagraphProps) {
  const segments = splitTextByPixelWords(text, pixelWords);
  const fontClass = PIXEL_FONT_MAP[font];

  return (
    <Tag className={cn(className)} data-slot="pixel-paragraph" {...props}>
      {segments.map((segment, index) => {
        const key = `${segment.type}-${segment.text}-${index}`;
        return segment.type === "pixel" ? (
          <span
            className={cn(fontClass, pixelWordClassName)}
            data-slot="pixel-word"
            key={key}
          >
            {segment.text}
          </span>
        ) : (
          <span key={key}>{segment.text}</span>
        );
      })}
    </Tag>
  );
}
