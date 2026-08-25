import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@withink/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * The ONE select pattern: a tokenized native <select>. Native pickers are the
 * mobile-native choice (platform wheel/sheet, no focus-trap surprises); this
 * wrapper only aligns its chrome with Input/Button and adds the chevron.
 */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span className={cn("relative inline-flex", className)}>
        <select
          ref={ref}
          className={cn(
            "border-border bg-card text-foreground ring-offset-background focus-visible:ring-ring h-10 w-full cursor-pointer appearance-none rounded-xl border py-2 pr-9 pl-3.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
        />
      </span>
    );
  },
);
Select.displayName = "Select";

export { Select };
