"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { MetalFx, type MetalFxProps, type MetalFxVariant } from "metal-fx";
/**
 * `metal-fx` around `Button` — liquid metal ring for controls.
 * `className` styles the button; `metalFxClassName` styles the MetalFx wrapper.
 *
 * With `normalizeHostStyles` (default), variant fills live on the MetalFx wrapper
 * and the button stays transparent so the shader ring stays visible. Pass
 * `normalizeHostStyles={false}` to keep all shadcn chrome on the button (filled
 * variants will cover most of the metal).
 */
import type { ComponentProps, CSSProperties, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const metalSurfaceVariants = cva("transition-colors", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "bg-primary! text-primary-foreground! hover:bg-primary/80!",
      destructive:
        "bg-destructive/10! text-destructive! hover:bg-destructive/20! dark:bg-destructive/20! dark:hover:bg-destructive/30!",
      ghost:
        "bg-transparent! text-foreground! hover:bg-muted/50! dark:hover:bg-muted/50!",
      link: "bg-transparent! text-primary!",
      outline:
        "bg-background! text-foreground! hover:bg-input/50! dark:bg-input/30!",
      secondary:
        "bg-secondary! text-secondary-foreground! hover:bg-secondary/80!",
    },
  },
});

/** Strip outer chrome on the host; MetalFx punches the ring around the interior. */
const metalHostChromeReset =
  "border-0! bg-transparent! shadow-none! hover:bg-transparent! aria-expanded:bg-transparent!";

/** Keep a stable edge above the animated shader so bright frames cannot erase it. */
const metalStableEdge =
  "relative isolate before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:ring-1 before:ring-border/70 before:ring-inset dark:before:ring-border/80";

type MetalSurfaceVariant = NonNullable<
  VariantProps<typeof metalSurfaceVariants>["variant"]
>;

type MetalShellProps = Pick<
  MetalFxProps,
  | "preset"
  | "theme"
  | "strength"
  | "paused"
  | "borderRadius"
  | "disableGlow"
  | "reflectionTargets"
  | "shaderScale"
  | "ringCssPx"
  | "scale"
  | "normalizeHostStyles"
> & {
  metalVariant?: MetalFxVariant;
  metalFxClassName?: string;
  metalFxStyle?: CSSProperties;
};

export type MetalButtonProps = ComponentProps<typeof Button> & MetalShellProps;

export type MetalIconButtonProps = MetalButtonProps;

export const MetalButton = function MetalButton({
  metalVariant = "button",
  metalFxClassName,
  metalFxStyle,
  preset = "chromatic",
  theme = "auto",
  strength = 0.9,
  paused,
  borderRadius,
  disableGlow,
  reflectionTargets,
  shaderScale,
  ringCssPx,
  scale,
  normalizeHostStyles = true,
  variant = "default",
  className,
  ref,
  ...buttonProps
}: MetalButtonProps & { ref?: RefObject<HTMLDivElement | null> }) {
  const surfaceVariant = variant as MetalSurfaceVariant;

  return (
    <MetalFx
      borderRadius={borderRadius}
      className={cn(
        "overflow-visible! inline-flex w-fit min-w-0 flex-col items-stretch leading-none",
        metalStableEdge,
        normalizeHostStyles &&
          metalSurfaceVariants({ variant: surfaceVariant }),
        metalFxClassName
      )}
      disableGlow={disableGlow}
      normalizeHostStyles={normalizeHostStyles}
      paused={paused}
      preset={preset}
      ref={ref}
      reflectionTargets={reflectionTargets}
      ringCssPx={ringCssPx}
      scale={scale}
      shaderScale={shaderScale}
      strength={strength}
      style={metalFxStyle}
      theme={theme}
      variant={metalVariant}
    >
      <Button
        className={cn(normalizeHostStyles && metalHostChromeReset, className)}
        variant={variant}
        {...buttonProps}
      />
    </MetalFx>
  );
};

MetalButton.displayName = "MetalButton";

export const MetalIconButton = function MetalIconButton({
  size = "icon-sm",
  metalVariant = "circle",
  className,
  metalFxClassName,
  borderRadius,
  ref,
  ...props
}: MetalIconButtonProps & { ref?: RefObject<HTMLDivElement | null> }) {
  const isCircle = metalVariant === "circle";

  return (
    <MetalButton
      borderRadius={borderRadius ?? (isCircle ? 9999 : undefined)}
      className={cn(
        "leading-none! [&_svg]:block [&_svg]:shrink-0",
        isCircle && "rounded-full!",
        className
      )}
      metalFxClassName={cn(
        // MetalFx defaults to w-fit/flex-col and can stretch taller than wide,
        // which turns "circle" into a rounded rectangle — lock a true disc.
        isCircle && "overflow-hidden! aspect-square! shrink-0 rounded-full!",
        metalFxClassName
      )}
      metalVariant={metalVariant}
      ref={ref}
      size={size}
      {...props}
    />
  );
};

MetalIconButton.displayName = "MetalIconButton";
