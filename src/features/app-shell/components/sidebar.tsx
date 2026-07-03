"use client";

import * as React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  Sun, 
  History, 
  Sparkles, 
  BarChart2, 
  Image, 
  Settings, 
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";

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

  // Close user menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
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
      toast.success("Logged out of your sanctuary.");
      router.refresh();
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during logout.";
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
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none">
      {/* Header / Brand Logo */}
      <div className={cn(
        "flex items-center justify-between p-6 border-b border-sidebar-border h-16 shrink-0",
        isCollapsed && "justify-center px-4"
      )}>
        {!isCollapsed && (
          <span className="font-serif text-xl font-bold tracking-tight text-foreground animate-in fade-in duration-200">
            withink.
          </span>
        )}
        <div className="flex items-center gap-2">
          {!isCollapsed && <ThemeToggle />}
          {/* Collapse Button - only visible on desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden md:flex h-8 w-8 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Area */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <Link
                key={item.label}
                href={item.href as unknown as React.ComponentPropsWithoutRef<typeof Link>["href"]}
                onClick={() => {
                  if (isMobileOpen) onCloseMobile();
                }}
                className={cn(
                  "flex items-center space-x-3 px-3 h-10 rounded-lg text-sm transition-all duration-200 cursor-pointer",
                  item.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm border border-sidebar-border"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0 transition-transform duration-200",
                  item.active ? "text-primary scale-110" : "text-muted-foreground"
                )} />
                {!isCollapsed && (
                  <span className="truncate animate-in fade-in duration-200">{item.label}</span>
                )}
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
        </nav>
      </TooltipProvider>

      {/* User profile dropdown area */}
      <div className="p-4 border-t border-sidebar-border shrink-0 bg-sidebar-accent/20 relative" ref={userMenuRef}>
        {userMenuOpen && (
          <div className={cn(
            "absolute bottom-16 left-4 right-4 bg-popover text-popover-foreground rounded-lg border border-border shadow-lg p-2 z-50 animate-in slide-in-from-bottom-2 duration-150",
            isCollapsed && "left-2 w-48 bottom-16"
          )}>
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name || "Writer"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || "sanctuary@withink.me"}</p>
            </div>
            <div className="pt-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-all text-left cursor-pointer",
            isCollapsed && "justify-center p-1"
          )}
          aria-haspopup="true"
          aria-expanded={userMenuOpen}
        >
          {user?.image ? (
            <NextImage
              src={user.image}
              alt={user.name || "User Avatar"}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover border border-sidebar-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center font-bold text-xs text-accent-foreground border border-sidebar-border shadow-sm shrink-0">
              {userInitials}
            </div>
          )}
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-200">
              <p className="text-xs font-medium text-foreground truncate">{user?.name || "Writer"}</p>
              <p className="text-[10px] text-muted-foreground truncate">Free Account</p>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md screens and up) */}
      <aside className={cn(
        "hidden md:flex flex-col h-screen shrink-0 transition-all duration-300 ease-in-out z-30",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar overlay / drawer (visible only on mobile) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={onCloseMobile}
          />
          {/* Sliding menu panel */}
          <aside className="relative flex flex-col w-64 max-w-xs h-full bg-sidebar text-sidebar-foreground animate-in slide-in-from-left duration-250 z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
