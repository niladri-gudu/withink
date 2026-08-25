"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

import { cn } from "@withink/utils";

/* Navigation chrome tier of the z-index contract (see apps/app globals.css).
   Radix portals to <body>, so the explicit tier keeps it above editor
   overlays and level with the tab bar / drawer. */
const OVERLAY_Z = "z-[60]";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="overlay-veil"
      className={cn(
        "bg-background/80 fixed inset-0 backdrop-blur-sm",
        OVERLAY_Z,
        className,
      )}
      {...props}
    />
  );
}
SheetOverlay.displayName = "SheetOverlay";

const sheetContentVariants = cva(
  "bg-card text-card-foreground border-border data-[slot=overlay-panel] fixed flex flex-col gap-2 shadow-lg",
  {
    variants: {
      side: {
        /* Bottom sheet on phones; right-hand folio panel on md+ screens.
           The enter/exit transforms swap direction at the breakpoint. */
        auto: `inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [--withink-overlay-from:translate3d(0,100%,0)] [--withink-overlay-rest:translate3d(0,0,0)] [--withink-overlay-to:translate3d(0,100%,0)] md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-full md:w-[19rem] md:max-w-full md:rounded-t-none md:rounded-l-2xl md:border-t-0 md:border-l md:px-5 md:py-6 md:[--withink-overlay-from:translate3d(100%,0,0)] md:[--withink-overlay-to:translate3d(100%,0,0)]`,
        bottom:
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [--withink-overlay-from:translate3d(0,100%,0)] [--withink-overlay-rest:translate3d(0,0,0)] [--withink-overlay-to:translate3d(0,100%,0)]",
        top: "inset-x-0 top-0 max-h-[88dvh] rounded-b-2xl border-b px-5 pt-4 pb-5 [--withink-overlay-from:translate3d(0,-100%,0)] [--withink-overlay-rest:translate3d(0,0,0)] [--withink-overlay-to:translate3d(0,-100%,0)]",
        left: "inset-y-0 left-0 h-full w-[19rem] max-w-full rounded-r-2xl border-r px-5 py-6 [--withink-overlay-from:translate3d(-100%,0,0)] [--withink-overlay-rest:translate3d(0,0,0)] [--withink-overlay-to:translate3d(-100%,0,0)]",
        right:
          "inset-y-0 right-0 h-full w-[19rem] max-w-full rounded-l-2xl border-l px-5 py-6 [--withink-overlay-from:translate3d(100%,0,0)] [--withink-overlay-rest:translate3d(0,0,0)] [--withink-overlay-to:translate3d(100%,0,0)]",
      },
    },
    defaultVariants: {
      side: "auto",
    },
  },
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetContentVariants> {}

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ className, children, side, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      data-slot="overlay-panel"
      className={cn(sheetContentVariants({ side }), OVERLAY_Z, className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        className="ring-offset-background focus-visible:ring-ring hover:bg-muted absolute top-3 right-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl opacity-70 transition-all duration-200 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

function SheetHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 pr-10", className)}
      {...props}
    />
  );
}

function SheetFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn(
        "text-foreground font-serif text-base font-semibold tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-caption text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
