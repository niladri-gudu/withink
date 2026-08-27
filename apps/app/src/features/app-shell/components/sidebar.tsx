"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconButton } from "@withink/ui/icon-button";
import { ThemeToggle } from "@withink/ui/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@withink/ui/tooltip";
import { cn } from "@withink/utils";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  History,
  Image,
  LogOut,
  MessageSquare,
  Notebook,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { formatDisplayDate, getLocalDateString } from "@/lib/utils/date";

import { useSignOut } from "../hooks/use-sign-out";
import { UserAvatar } from "./user-avatar";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

export function Sidebar({ isCollapsed, onToggleCollapse, user }: SidebarProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const signOut = useSignOut();

  // The codex index: each section is a folio in the margin, numbered like a
  // printed table of contents. The hand note dates the open page.
  const navItems = [
    {
      label: "Today",
      folio: "01",
      href: ROUTES.APP.DASHBOARD,
      icon: Sun,
      active: pathname === ROUTES.APP.DASHBOARD,
    },
    {
      label: "Entries",
      folio: "02",
      href: ROUTES.APP.ENTRIES,
      icon: History,
      active: pathname.startsWith(ROUTES.APP.ENTRIES),
    },
    {
      label: "Notebooks",
      folio: "03",
      href: ROUTES.APP.NOTEBOOKS,
      icon: Notebook,
      active: pathname.startsWith(ROUTES.APP.NOTEBOOKS),
    },
    {
      label: "Flashbacks",
      folio: "04",
      href: ROUTES.APP.FLASHBACKS,
      icon: Sparkles,
      active: pathname === ROUTES.APP.FLASHBACKS,
    },
    {
      label: "Insights",
      folio: "05",
      href: ROUTES.APP.INSIGHTS,
      icon: BarChart2,
      active: pathname === ROUTES.APP.INSIGHTS,
    },
    {
      label: "Media",
      folio: "06",
      href: ROUTES.APP.MEDIA,
      icon: Image,
      active: pathname === ROUTES.APP.MEDIA,
    },
    {
      label: "Settings",
      folio: "07",
      href: ROUTES.APP.SETTINGS,
      icon: Settings,
      active: pathname === ROUTES.APP.SETTINGS,
    },
    {
      label: "Feedback",
      folio: "08",
      href: ROUTES.APP.FEEDBACK,
      icon: MessageSquare,
      active: pathname === ROUTES.APP.FEEDBACK,
    },
  ];

  // Computed after mount: the local date depends on the viewer's timezone, so
  // computing it during render would mismatch the server-rendered HTML (and go
  // stale across midnight).
  const [todayNote, setTodayNote] = React.useState("");
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayNote(
      formatDisplayDate(getLocalDateString(), {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);

  const renderSidebarContent = (collapsed: boolean) => {
    return (
      <div className="bg-sidebar text-sidebar-foreground border-sidebar-border relative flex h-full flex-col border-r select-none">
        <div className="border-sidebar-border relative flex shrink-0 flex-col border-b px-5 pt-6 pb-5">
          <div
            className={cn(
              "flex items-center justify-between gap-2",
              collapsed && "justify-center",
            )}
          >
            {!collapsed && (
              <span className="text-foreground animate-in fade-in font-serif text-xl font-bold tracking-tight duration-200">
                withink<span className="text-accent">.</span>
              </span>
            )}
            <IconButton
              variant="ghost"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hidden shrink-0 md:flex"
              aria-label={collapsed ? "Expand margin" : "Collapse margin"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </IconButton>
          </div>

          {!collapsed && (
            <p className="text-muted-foreground animate-in fade-in font-hand text-lg leading-snug duration-300">
              {todayNote}
            </p>
          )}
        </div>

        {/* The folio index */}
        <TooltipProvider delayDuration={0}>
          <nav
            className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-3 py-5"
            aria-label="Sidebar navigation"
          >
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const content = (
                  <li key={item.label} className="list-none">
                    <Link
                      href={
                        item.href as unknown as React.ComponentPropsWithoutRef<
                          typeof Link
                        >["href"]
                      }
                      className={cn(
                        "focus-visible:ring-ring group relative flex h-10 items-center gap-3 rounded-lg px-3 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        collapsed && "justify-center px-0",
                        item.active
                          ? "text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      {/* Gold margin tick for the open folio */}
                      {item.active && (
                        <span className="bg-accent absolute top-2 bottom-2 left-0 w-0.5 rounded-full" />
                      )}

                      {collapsed ? (
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            item.active
                              ? "text-accent"
                              : "text-muted-foreground",
                          )}
                        />
                      ) : (
                        <>
                          <span
                            className={cn(
                              "w-5 shrink-0 text-right font-serif text-[11px] tracking-[0.1em] tabular-nums",
                              item.active
                                ? "text-accent"
                                : "text-muted-foreground/50",
                            )}
                          >
                            {item.folio}
                          </span>
                          <span
                            className={cn(
                              "animate-in fade-in truncate font-serif text-sm tracking-[0.08em] uppercase duration-200",
                              item.active ? "font-semibold" : "font-medium",
                            )}
                          >
                            {item.label}
                          </span>
                        </>
                      )}
                    </Link>
                  </li>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return content;
              })}
            </ul>
          </nav>
        </TooltipProvider>

        {/* Colophon: theme + user */}
        <div
          className="border-sidebar-border bg-sidebar-accent/20 relative shrink-0 border-t px-3 py-4"
          ref={userMenuRef}
        >
          {userMenuOpen && (
            <div
              className={cn(
                "bg-popover text-popover-foreground border-border animate-in slide-in-from-bottom-2 absolute right-4 bottom-16 left-4 z-10 rounded-xl border p-2 shadow-lg duration-150",
                collapsed && "bottom-16 left-2 w-48",
              )}
              role="menu"
            >
              <div className="border-border/50 border-b px-3 py-2">
                <p className="text-foreground truncate text-xs font-semibold">
                  {user?.name || "Writer"}
                </p>
                <p className="text-muted-foreground truncate text-[10px]">
                  {user?.email || "diary@withink.me"}
                </p>
              </div>
              <div className="pt-1.5">
                <button
                  onClick={() => void signOut()}
                  role="menuitem"
                  className="text-destructive hover:bg-destructive/10 focus-visible:ring-destructive flex w-full cursor-pointer items-center space-x-2 rounded-md px-3 py-2 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}

          {collapsed ? (
            <div className="flex flex-col items-center gap-3">
              <ThemeToggle />
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hover:bg-sidebar-accent focus-visible:ring-ring flex w-full cursor-pointer items-center justify-center rounded-lg p-1 transition-all focus-visible:ring-2 focus-visible:outline-none"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label="User menu"
              >
                <UserAvatar user={user} className="h-8 w-8" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-running-head text-muted-foreground/60">
                  Colophon
                </span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hover:bg-sidebar-accent focus-visible:ring-ring flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label="User menu"
              >
                <UserAvatar user={user} className="h-8 w-8" />

                <div className="animate-in fade-in min-w-0 flex-1 duration-200">
                  <p className="text-foreground truncate text-xs font-medium">
                    {user?.name || "Writer"}
                  </p>
                  <p className="text-muted-foreground truncate text-[10px]">
                    Free Account
                  </p>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // Desktop margin rail only — on phones the bottom tab bar owns navigation
  // (see tab-bar.tsx). Width animates via a native CSS transition instead of
  // a JS spring: width is a layout property, so per-frame JS writes (motion)
  // cause layout thrash across the whole main column and the floating editor
  // toolbar.
  return (
    <aside
      style={{ width: isCollapsed ? 76 : 264 }}
      className="z-30 hidden h-screen shrink-0 flex-col overflow-hidden transition-[width] duration-300 ease-in-out md:flex"
    >
      <div
        className="flex h-full shrink-0 flex-col"
        style={{ width: isCollapsed ? 76 : 264 }}
      >
        {renderSidebarContent(isCollapsed)}
      </div>
    </aside>
  );
}
