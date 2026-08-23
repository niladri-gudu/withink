"use client";

import * as React from "react";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
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
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { clearSessionCookies, signOut } from "@/lib/auth-client";
import { clearSwCaches } from "@/lib/sw-cache";
import { formatDisplayDate, getLocalDateString } from "@/lib/utils/date";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  user: {
    name: string;
    email: string;
    image?: string | null;
  } | null;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  user,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const mobileSidebarRef = useFocusTrap(isMobileOpen);

  // Close mobile sidebar on Escape
  React.useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

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

  const { lock } = useEncryption();

  const handleLogout = async () => {
    try {
      const res = await signOut();
      if (res?.error) {
        toast.error(res.error.message || "Failed to sign out.");
        return;
      }
      // Best-effort cookie purge + drop the in-memory master key / decrypted
      // timeline cache before navigating. No router.refresh() here: after
      // signOut the current route's session is gone and refresh would fire a
      // server re-render that can race with the navigation.
      clearSessionCookies();
      lock();
      await clearSwCaches();
      toast.success("Logged out of your diary.");
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during logout.";
      toast.error(message);
    }
  };

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
      label: "Flashbacks",
      folio: "03",
      href: ROUTES.APP.FLASHBACKS,
      icon: Sparkles,
      active: pathname === ROUTES.APP.FLASHBACKS,
    },
    {
      label: "Insights",
      folio: "04",
      href: ROUTES.APP.INSIGHTS,
      icon: BarChart2,
      active: pathname === ROUTES.APP.INSIGHTS,
    },
    {
      label: "Media",
      folio: "05",
      href: ROUTES.APP.MEDIA,
      icon: Image,
      active: pathname === ROUTES.APP.MEDIA,
    },
    {
      label: "Settings",
      folio: "06",
      href: ROUTES.APP.SETTINGS,
      icon: Settings,
      active: pathname === ROUTES.APP.SETTINGS,
    },
    {
      label: "Feedback",
      folio: "07",
      href: ROUTES.APP.FEEDBACK,
      icon: MessageSquare,
      active: pathname === ROUTES.APP.FEEDBACK,
    },
  ];

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "W";

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
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hidden h-8 w-8 shrink-0 md:flex"
              aria-label={collapsed ? "Expand margin" : "Collapse margin"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
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
                      onClick={() => {
                        if (isMobileOpen) onCloseMobile();
                      }}
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
                "bg-popover text-popover-foreground border-border animate-in slide-in-from-bottom-2 absolute right-4 bottom-16 left-4 z-50 rounded-xl border p-2 shadow-lg duration-150",
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
                  onClick={handleLogout}
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
                {user?.image ? (
                  <NextImage
                    src={user.image}
                    alt={user.name || "User Avatar"}
                    width={32}
                    height={32}
                    className="border-sidebar-border h-8 w-8 rounded-full border object-cover"
                  />
                ) : (
                  <div className="bg-accent text-accent-foreground border-sidebar-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm">
                    {userInitials}
                  </div>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-muted-foreground/60 font-serif text-[11px] tracking-[0.16em] uppercase">
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
                {user?.image ? (
                  <NextImage
                    src={user.image}
                    alt={user.name || "User Avatar"}
                    width={32}
                    height={32}
                    className="border-sidebar-border h-8 w-8 rounded-full border object-cover"
                  />
                ) : (
                  <div className="bg-accent text-accent-foreground border-sidebar-border flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm">
                    {userInitials}
                  </div>
                )}

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
  return (
    <>
      {/* Desktop margin rail (visible on md screens and up). Animates width via
          a native CSS transition instead of a JS spring — width is a layout
          property, so per-frame JS writes (motion) cause layout thrash across
          the whole main column and the floating editor toolbar. */}
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

      {/* Mobile Sidebar overlay / drawer (visible only on mobile). z-[60]
          keeps it above the editor toolbar/save-indicator chrome, which also
          sits at z-40/z-50 — later DOM order was letting them paint on top
          of the open drawer. */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-[60] flex md:hidden">
          {/* Backdrop overlay */}
          <div
            className="bg-background/80 fixed inset-0 backdrop-blur-sm transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          {/* Sliding menu panel */}
          <aside
            ref={mobileSidebarRef as React.RefObject<HTMLDivElement>}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="bg-sidebar text-sidebar-foreground animate-in slide-in-from-left relative z-50 flex h-full w-72 max-w-xs flex-col duration-250"
          >
            {renderSidebarContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}
