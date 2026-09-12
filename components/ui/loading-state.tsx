"use client";

import { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * LOADING STATE — pixel-grid loader for long-running work
 *
 * Variants:
 *   Drive  — square cells, chevron wavefront driving right;
 *            the 650ms cycle is shorter than the sweep, so
 *            two fronts are always in flight
 *   Dots   — same wavefront, circular cells
 *   Orbit  — a comet lapping the grid perimeter
 *
 * Paired with a shimmering label and a live elapsed timer
 * in mono tabular figures. Reduced motion freezes the grid
 * to its dim state; the timer still ticks.
 * ───────────────────────────────────────────────────────── */

type LoadingVariant = "Drive" | "Dots" | "Orbit";

const chevron = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
  const k = ORBIT_ORDER.indexOf(i);
  return k === -1 ? null : k * 110;
});

const PATTERNS: Record<
  LoadingVariant,
  { delays: (number | null)[]; dur: number; round: boolean }
> = {
  Dots: { delays: chevron, dur: 650, round: true },
  Drive: { delays: chevron, dur: 650, round: false },
  Orbit: { delays: orbit, dur: 950, round: false },
};

function useElapsed() {
  const [ds, setDs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDs((d) => d + 1), 100);
    return () => clearInterval(t);
  }, []);
  const total = ds / 10;
  if (total < 60) {
    return `${total.toFixed(1)}s`;
  }
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export function LoadingState({
  label = "Working",
  variant = "Drive",
}: {
  label?: string;
  variant?: LoadingVariant;
}) {
  const elapsed = useElapsed();
  const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Drive;

  return (
    <output
      aria-live="polite"
      className="flex w-fit items-center gap-2.5"
      data-slot="loading-state"
    >
      <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {delays.map((d, i) => (
          <span
            className={`size-[4px] bg-foreground motion-reduce:animate-none! ${
              round ? "rounded-full" : "rounded-[1px]"
            }`}
            key={`${variant}-${i}`}
            style={{
              animation:
                d === null
                  ? "none"
                  : `pixel-on ${dur}ms ease-in-out ${d}ms infinite`,
              opacity: d === null ? 0.07 : 0.15,
            }}
          />
        ))}
      </span>
      <span
        className="bg-clip-text font-medium text-[13px] text-transparent motion-reduce:animate-none! motion-reduce:text-muted-foreground"
        style={{
          animation: "shimmer-text 1.4s linear infinite",
          backgroundImage:
            "linear-gradient(90deg, var(--color-muted-foreground) 35%, var(--color-foreground) 50%, var(--color-muted-foreground) 65%)",
          backgroundSize: "200% 100%",
        }}
      >
        {label}
      </span>
      <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
        {elapsed}
      </span>
    </output>
  );
}
