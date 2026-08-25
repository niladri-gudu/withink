"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@withink/ui/icon-button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@withink/ui/sheet";
import { ThemeToggle } from "@withink/ui/theme-toggle";
import { cn } from "@withink/utils";
import {
  BarChart2,
  Ellipsis,
  History,
  Image as ImageIcon,
  LogOut,
  MessageSquare,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";

import { EDITOR_ROUTE_PATTERN, ROUTES } from "@/constants/routes";
import { formatDisplayDate, getLocalDateString } from "@/lib/utils/date";

import { useSignOut } from "../hooks/use-sign-out";
import { UserAvatar } from "./user-avatar";

const tabItems = [
  {
    label: "Today",
    href: ROUTES.APP.DASHBOARD,
    icon: Sun,
    isActive: (pathname: string) => pathname === ROUTES.APP.DASHBOARD,
  },
  {
    label: "Entries",
    href: ROUTES.APP.ENTRIES,
    icon: History,
    // The entry editor maps to Entries too when the bar is visible
    // (e.g. browser back into a dated page from a non-editor surface).
    isActive: (pathname: string) => pathname.startsWith(ROUTES.APP.ENTRIES),
  },
  {
    label: "Insights",
    href: ROUTES.APP.INSIGHTS,
    icon: BarChart2,
    isActive: (pathname: string) => pathname === ROUTES.APP.INSIGHTS,
  },
] as const;

/** Secondary destinations, numbered to match the desktop margin rail. */
const moreItems = [
  {
    label: "Flashbacks",
    folio: "03",
    href: ROUTES.APP.FLASHBACKS,
    icon: Sparkles,
    isActive: (pathname: string) => pathname === ROUTES.APP.FLASHBACKS,
  },
  {
    label: "Media",
    folio: "05",
    href: ROUTES.APP.MEDIA,
    icon: ImageIcon,
    isActive: (pathname: string) => pathname === ROUTES.APP.MEDIA,
  },
  {
    label: "Settings",
    folio: "06",
    href: ROUTES.APP.SETTINGS,
    icon: Settings,
    isActive: (pathname: string) => pathname === ROUTES.APP.SETTINGS,
  },
  {
    label: "Feedback",
    folio: "07",
    href: ROUTES.APP.FEEDBACK,
    icon: MessageSquare,
    isActive: (pathname: string) => pathname === ROUTES.APP.FEEDBACK,
  },
] as const;

interface TabBarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

/**
 * The pocket index: a phone-native bottom tab bar carrying the four primary
 * destinations (Today · Entries · Insights · More). Speaks the margin rail's
 * language — tracked uppercase micro-labels and a gold tick marking the open
 * folio — while keeping every control inside thumb reach.
 */
export function TabBar({ user }: TabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = moreItems.some((item) => item.isActive(pathname));

  if (EDITOR_ROUTE_PATTERN.test(pathname)) return null;

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        aria-label="Primary"
        className="border-border bg-card/90 fixed inset-x-0 bottom-0 z-[60] border-t backdrop-blur-md select-none md:hidden"
      >
        <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
          {tabItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring relative flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-1 pt-2 pb-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Gold tick marking the open folio */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="bg-accent absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full"
                  />
                )}
                <Icon
                  className={cn("h-5 w-5", active && "text-accent")}
                  strokeWidth={active ? 2.25 : 2}
                />
                <span className="text-running-head">{item.label}</span>
              </Link>
            );
          })}

          <SheetTrigger asChild>
            <button
              aria-expanded={moreOpen}
              className={cn(
                "text-muted-foreground hover:text-foreground focus-visible:ring-ring relative flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-1 pt-2 pb-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset",
                (moreActive || moreOpen) && "text-foreground",
              )}
            >
              {(moreActive || moreOpen) && (
                <span
                  aria-hidden="true"
                  className="bg-accent absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full"
                />
              )}
              <Ellipsis
                className={cn(
                  "h-5 w-5",
                  (moreActive || moreOpen) && "text-accent",
                )}
                strokeWidth={moreActive || moreOpen ? 2.25 : 2}
              />
              <span className="text-running-head">More</span>
            </button>
          </SheetTrigger>
        </div>
      </nav>

      <MoreSheet pathname={pathname} user={user} />
    </Sheet>
  );
}

interface MoreSheetProps {
  pathname: string;
  user: TabBarProps["user"];
}

/**
 * The overflow folio: Media, Flashbacks, Feedback, Settings plus the theme
 * toggle and the writer's account row — everything the rail's lower half
 * holds, restated as a bottom sheet (right-hand panel from md up).
 * Rendered inside the tab bar's Sheet root so the More trigger keeps its
 * Radix trigger relationship (focus restores to it on close).
 */
function MoreSheet({ pathname, user }: MoreSheetProps) {
  const signOut = useSignOut();
  const todayNote = formatDisplayDate(getLocalDateString(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SheetContent side="auto" aria-describedby={undefined}>
      <SheetHeader>
        <SheetTitle className="text-running-head text-muted-foreground/70">
          More
        </SheetTitle>
        <p className="text-hand text-muted-foreground leading-snug">
          {todayNote}
        </p>
      </SheetHeader>

      <nav aria-label="Secondary" className="mt-3">
        <ul className="space-y-0.5">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const active = item.isActive(pathname);
            return (
              <li key={item.label} className="list-none">
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-visible:ring-ring group relative flex h-11 items-center gap-3 rounded-lg px-3 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden="true"
                        className="bg-accent absolute top-2 bottom-2 left-0 w-0.5 rounded-full"
                      />
                    )}
                    <span
                      className={cn(
                        "w-5 shrink-0 text-right font-serif text-[11px] tracking-[0.1em] tabular-nums",
                        active ? "text-accent" : "text-muted-foreground/50",
                      )}
                    >
                      {item.folio}
                    </span>
                    <span
                      className={cn(
                        "truncate font-serif text-sm tracking-[0.08em] uppercase",
                        active ? "font-semibold" : "font-medium",
                      )}
                    >
                      {item.label}
                    </span>
                    <Icon
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        active ? "text-accent" : "text-muted-foreground/50",
                      )}
                    />
                  </Link>
                </SheetClose>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-border mt-4 flex items-center justify-between border-t pt-4">
        <span className="text-running-head text-muted-foreground/60">
          Theme
        </span>
        <ThemeToggle />
      </div>

      <div className="border-border mt-auto flex items-center gap-3 border-t pt-4">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-xs font-medium">
            {user?.name || "Writer"}
          </p>
          <p className="text-muted-foreground truncate text-[10px]">
            {user?.email || "diary@withink.me"}
          </p>
        </div>
        <IconButton
          variant="destructive"
          aria-label="Log Out"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
        </IconButton>
      </div>
    </SheetContent>
  );
}
