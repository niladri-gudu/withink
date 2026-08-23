"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@withink/utils";

/* Navigation chrome tier of the z-index contract (see apps/app globals.css). */
const OVERLAY_Z = "z-[60]";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
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
DialogOverlay.displayName = "DialogOverlay";

const dialogContentVariants = cva(
  "bg-card text-card-foreground border-border data-[slot=overlay-panel] fixed top-1/2 left-1/2 flex w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-xl border p-6 shadow-xl [--withink-overlay-from:translate3d(-50%,-46%,0)_scale(0.97)] [--withink-overlay-rest:translate3d(-50%,-50%,0)] [--withink-overlay-to:translate3d(-46%,-46%,0)_scale(0.97)]",
  {
    variants: {
      size: {
        sm: "sm:max-w-sm",
        md: "sm:max-w-md",
        lg: "sm:max-w-lg",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      data-slot="overlay-panel"
      className={cn(dialogContentVariants({ size }), OVERLAY_Z, className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="ring-offset-background focus-visible:ring-ring hover:bg-muted absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl opacity-70 transition-all duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

function DialogHeader({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-foreground font-serif text-lg font-semibold leading-snug",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-body-small text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
