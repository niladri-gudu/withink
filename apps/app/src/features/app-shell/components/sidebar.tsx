"use client";

import * as React from "react";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
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
import { motion } from "motion/react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { signOut } from "@/lib/auth-client";
import { clearSwCaches } from "@/lib/sw-cache";
import { useFocusTrap } from "@/hooks/use-focus-trap";

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

  const handleLogout = async () => {
    try {
      const res = await signOut();
      if (res?.error) {
        toast.error(res.error.message || "Failed to sign out.");
        return;
      }
      await clearSwCaches();
      toast.success("Logged out of your sanctuary.");
      router.refresh();
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during logout.";
      toast.error(message);
    }
  };

  const navItems = [
    {
      label: "Today",
      href: ROUTES.APP.DASHBOARD,
      icon: Sun,
      active: pathname === ROUTES.APP.DASHBOARD,
    },
    {
      label: "Entries",
      href: ROUTES.APP.ENTRIES,
      icon: History,
      active: pathname.startsWith(ROUTES.APP.ENTRIES),
    },
    {
      label: "Flashbacks",
      href: ROUTES.APP.FLASHBACKS,
      icon: Sparkles,
      active: pathname === ROUTES.APP.FLASHBACKS,
    },
    {
      label: "Insights",
      href: ROUTES.APP.INSIGHTS,
      icon: BarChart2,
      active: pathname === ROUTES.APP.INSIGHTS,
    },
    {
      label: "Media",
      href: ROUTES.APP.MEDIA,
      icon: Image,
      active: pathname === ROUTES.APP.MEDIA,
    },
    {
      label: "Settings",
      href: ROUTES.APP.SETTINGS,
      icon: Settings,
      active: pathname === ROUTES.APP.SETTINGS,
    },
    {
      label: "Feedback",
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

  const sidebarContent = (
    <div className="bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r select-none">
      {/* Header / Brand Logo */}
      <div className="border-sidebar-border relative flex h-16 shrink-0 items-center justify-between border-b p-6">
        {!isCollapsed && (
          <span className="text-foreground animate-in fade-in font-serif text-xl font-bold tracking-tight duration-200">
            withink.
          </span>
        )}
        <div
          className={cn(
            "flex items-center gap-2",
            isCollapsed && "absolute top-4 left-[16px]",
          )}
        >
          {/* Collapse Button - only visible on desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hidden h-8 w-8 md:flex"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Area */}
      <TooltipProvider delayDuration={0}>
        <nav
          className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4"
          aria-label="Sidebar navigation"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <Link
                key={item.label}
                href={
                  item.href as unknown as React.ComponentPropsWithoutRef<
                    typeof Link
                  >["href"]
                }
                onClick={() => {
                  if (isMobileOpen) onCloseMobile();
                }}
                className={cn(
                  "focus-visible:ring-ring flex h-10 cursor-pointer items-center space-x-3 rounded-lg px-3 text-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border border font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform duration-200",
                    item.active
                      ? "text-primary scale-110"
                      : "text-muted-foreground",
                  )}
                />
                {!isCollapsed && (
                  <span className="animate-in fade-in truncate duration-200">
                    {item.label}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
        </nav>
      </TooltipProvider>

      {/* User profile dropdown area */}
      <div
        className="border-sidebar-border bg-sidebar-accent/20 relative shrink-0 border-t p-4"
        ref={userMenuRef}
      >
        {userMenuOpen && (
          <div
            className={cn(
              "bg-popover text-popover-foreground border-border animate-in slide-in-from-bottom-2 absolute right-4 bottom-16 left-4 z-50 rounded-lg border p-2 shadow-lg duration-150",
              isCollapsed && "bottom-16 left-2 w-48",
            )}
            role="menu"
          >
            <div className="border-border/50 border-b px-3 py-2">
              <p className="text-foreground truncate text-xs font-semibold">
                {user?.name || "Writer"}
              </p>
              <p className="text-muted-foreground truncate text-[10px]">
                {user?.email || "sanctuary@withink.me"}
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

          {!isCollapsed && (
            <div className="animate-in fade-in min-w-0 flex-1 duration-200">
              <p className="text-foreground truncate text-xs font-medium">
                {user?.name || "Writer"}
              </p>
              <p className="text-muted-foreground truncate text-[10px]">
                Free Account
              </p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md screens and up) */}
      <motion.aside
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="z-30 hidden h-screen shrink-0 flex-col overflow-hidden md:flex"
      >
        <div className="flex h-full w-64 shrink-0 flex-col">
          {sidebarContent}
        </div>
      </motion.aside>

      {/* Mobile Sidebar overlay / drawer (visible only on mobile) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
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
            className="bg-sidebar text-sidebar-foreground animate-in slide-in-from-left relative z-50 flex h-full w-64 max-w-xs flex-col duration-250"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
