import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/* Pixel-font constants                                                */
/* ------------------------------------------------------------------ */

type PixelFont = "square" | "grid" | "circle" | "triangle" | "line"

const PIXEL_FONT_MAP: Record<PixelFont, string> = {
  square: "font-pixel-square",
  grid: "font-pixel-grid",
  circle: "font-pixel-circle",
  triangle: "font-pixel-triangle",
  line: "font-pixel-line",
}

/* ------------------------------------------------------------------ */
/* Text-splitting helper                                               */
/* ------------------------------------------------------------------ */

type Segment = { type: "plain"; text: string } | { type: "pixel"; text: string }

/**
 * Splits `text` into alternating plain / pixel segments based on the
 * provided `pixelWords`.  Longer phrases are matched first so that
 * "shadcn/ui" wins over a hypothetical "ui" match.
 */
function splitTextByPixelWords(text: string, pixelWords: string[]): Segment[] {
  if (pixelWords.length === 0) return [{ type: "plain", text }]

  // Sort by length descending so longer matches take priority
  const sorted = [...pixelWords].sort((a, b) => b.length - a.length)

  // Escape regex-special characters in each word
  const escaped = sorted.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  const pattern = new RegExp(`(${escaped.join("|")})`, "g")

  const segments: Segment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index ?? 0
    if (matchStart > lastIndex) {
      segments.push({ type: "plain", text: text.slice(lastIndex, matchStart) })
    }
    segments.push({ type: "pixel", text: match[0] })
    lastIndex = matchStart + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ type: "plain", text: text.slice(lastIndex) })
  }

  return segments
}

/* ------------------------------------------------------------------ */
/* PixelParagraph                                                      */
/* ------------------------------------------------------------------ */

export interface PixelParagraphProps extends React.ComponentProps<"p"> {
  /** The paragraph text to render. */
  text: string
  /**
   * Words or phrases within `text` to render in a pixel font.
   * Matching is case-sensitive and longest-match-first.
   */
  pixelWords?: string[]
  /** The wrapper element to render. @default "p" */
  as?: "p" | "span" | "div"
  /** The pixel font for highlighted words. @default "square" */
  font?: PixelFont
  /** Extra className applied to each pixel-word span. */
  pixelWordClassName?: string
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
  const segments = splitTextByPixelWords(text, pixelWords)
  const fontClass = PIXEL_FONT_MAP[font]

  return (
    <Tag data-slot="pixel-paragraph" className={cn(className)} {...props}>
      {segments.map((segment, index) => {
        const key = `${segment.type}-${segment.text}-${index}`
        return segment.type === "pixel" ? (
          <span
            key={key}
            data-slot="pixel-word"
            className={cn(fontClass, pixelWordClassName)}
          >
            {segment.text}
          </span>
        ) : (
          <span key={key}>{segment.text}</span>
        )
      })}
    </Tag>
  )
}
