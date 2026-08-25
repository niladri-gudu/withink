import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@withink/utils";

const iconButtonVariants = cva(
  "ring-offset-background inline-flex shrink-0 cursor-pointer items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        ghost: "hover:bg-muted hover:text-foreground",
        outline:
          "border border-border bg-transparent hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent/10",
        destructive: "text-destructive hover:bg-destructive/10",
      },
      size: {
        /* Touch-first default: a 44px hit target on phones, desktop density
           from md up. */
        default: "h-11 w-11 md:h-9 md:w-9",
        /* Fixed desktop-density square (dense toolbars only). */
        sm: "h-9 w-9",
        /* Fixed touch-size square (stays 44px on desktop too). */
        lg: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  asChild?: boolean;
  /**
   * Required. An icon-only control is invisible to assistive technology
   * without a text label; this component refuses to render without one.
   */
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(iconButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
