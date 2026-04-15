"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const themes = [
  {
    id: "light",
    name: "Zen",
    color: "bg-zinc-200",
  },
  {
    id: "warm-minimal",
    name: "Sand",
    color: "bg-[#D4C3A3]",
  },
  {
    id: "moonlight",
    name: "Moon",
    color: "bg-[#A78BFA]",
  },
  {
    id: "terminal",
    name: "Matrix",
    color: "bg-[#FFB000]",
  },
  // { id: "deep-indigo", name: "Deep Indigo", color: "bg-[#4F46E5]" },
  // { id: "forest", name: "Forest Green", color: "bg-[#22c55e]" },
  // { id: "nordic", name: "Nordic Snow", color: "bg-[#E0F2FE]" },
  // { id: "rose-quartz", name: "Rose Quartz", color: "bg-[#F472B6]" },
  // { id: "solarized", name: "Solarized", color: "bg-[#2AA198]" },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="border-zinc-800 min-w-40"
      >
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              "flex items-center justify-between gap-3 text-zinc-300 my-1 cursor-pointer focus:bg-accent focus:text-accent-foreground py-2",
              theme === t.id && "bg-accent/60 text-accent-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "h-3.5 w-3.5 rounded-full border border-white/20 shadow-sm",
                  t.color,
                )}
              />
              <span className="text-sm font-medium">{t.name}</span>
            </div>

            {theme === t.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
