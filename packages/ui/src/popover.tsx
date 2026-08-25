"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

import { cn } from "@withink/utils";

/* Navigation chrome tier of the z-index contract (see apps/app globals.css). */
const OVERLAY_Z = "z-[60]";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

/**
 * Non-modal anchored detail card (insights day details, chart-node values).
 * Shares the Phase-1 overlay motion system via data-slot="overlay-panel";
 * the default --withink-overlay-from fallback gives it a quiet rise-in.
 * Closes on outside tap / Escape — reachable by both pointer and touch.
 */
const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      data-slot="overlay-panel"
      align={align}
      sideOffset={sideOffset}
      collisionPadding={12}
      className={cn(
        "bg-card text-card-foreground border-border data-[slot=overlay-panel] fixed w-56 rounded-xl border p-4 shadow-lg outline-none",
        OVERLAY_Z,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent };
