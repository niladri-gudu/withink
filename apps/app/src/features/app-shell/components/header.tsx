"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@withink/ui/button";
import { ThemeToggle } from "@withink/ui/theme-toggle";
import { ChevronRight, Menu } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { isDateString } from "@/lib/utils/date";

interface HeaderProps {
  onOpenMobile: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const pathname = usePathname();

  // Parse path segments to generate dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    const breadcrumbs: Array<{ label: string; href: string }> = [
      { label: "Sanctuary", href: ROUTES.APP.DASHBOARD },
    ];

    paths.forEach((segment, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");

      if (segment === "dashboard") {
        breadcrumbs.push({ label: "Today", href: ROUTES.APP.DASHBOARD });
      } else if (segment === "entries") {
        breadcrumbs.push({ label: "Entries", href: ROUTES.APP.ENTRIES });
      } else if (segment === "flashbacks") {
        breadcrumbs.push({ label: "Flashbacks", href: ROUTES.APP.FLASHBACKS });
      } else if (segment === "insights") {
        breadcrumbs.push({ label: "Insights", href: ROUTES.APP.INSIGHTS });
      } else if (segment === "media") {
        breadcrumbs.push({ label: "Media", href: ROUTES.APP.MEDIA });
      } else if (segment === "settings") {
        breadcrumbs.push({ label: "Settings", href: ROUTES.APP.SETTINGS });
      } else if (segment === "feedback") {
        breadcrumbs.push({ label: "Feedback", href: ROUTES.APP.FEEDBACK });
      } else if (isDateString(segment)) {
        // Safe split-parse to prevent timezone shift issues
        const parts = segment.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0]!, 10);
          const month = parseInt(parts[1]!, 10) - 1;
          const day = parseInt(parts[2]!, 10);
          const dateObj = new Date(year, month, day);
          const formattedDate = dateObj.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          breadcrumbs.push({ label: formattedDate, href });
        } else {
          breadcrumbs.push({ label: segment, href });
        }
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-6 backdrop-blur-md select-none">
      {/* Left side: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:bg-muted focus-visible:ring-ring h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:hidden"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center space-x-1.5 text-xs font-medium sm:text-sm"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.href + idx}>
                {idx > 0 && (
                  <ChevronRight className="text-muted-foreground/45 h-3 w-3 shrink-0" />
                )}
                {isLast ? (
                  <span className="text-foreground max-w-[150px] truncate font-semibold sm:max-w-[300px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={
                      crumb.href as unknown as React.ComponentPropsWithoutRef<
                        typeof Link
                      >["href"]
                    }
                    className="text-muted-foreground hover:text-foreground max-w-[100px] truncate transition-colors sm:max-w-[200px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right side: Theme Toggle */}
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  );
}
