import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Content to be displayed in the marquee
   */
  children: React.ReactNode;
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string;
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * Number of times to repeat the content
   * @default 4
   */
  repeat?: number;
  /**
   * Whether to reverse the animation direction
   * @default false
   */
  reverse?: boolean;
  /**
   * Whether to animate vertically instead of horizontally
   * @default false
   */
  vertical?: boolean;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        "group flex gap-(--gap) overflow-hidden p-2 [--duration:40s] [--gap:1rem]",
        {
          "flex-col": vertical,
          "flex-row": !vertical,
        },
        className
      )}
    >
      {new Array(repeat).fill(0).map((_, i) => (
        <div
          className={cn("flex shrink-0 justify-around gap-(--gap)", {
            "[animation-direction:reverse]": reverse,
            "animate-marquee flex-row": !vertical,
            "animate-marquee-vertical flex-col": vertical,
            "group-hover:[animation-play-state:paused]": pauseOnHover,
          })}
          key={i}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
