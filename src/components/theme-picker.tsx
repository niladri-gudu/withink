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

const themes = [
  { id: "default", name: "System", color: "bg-zinc-500" },
  { id: "deep-indigo", name: "Deep Indigo", color: "bg-[#4F46E5]" },
  { id: "warm-minimal", name: "Warm Minimal", color: "bg-[#FAF7F2]" },
  { id: "forest", name: "Forest Green", color: "bg-[#22c55e]" },
  { id: "moonlight", name: "Moonlight", color: "bg-[#A78BFA]" },
  { id: "terminal", name: "Retro Terminal", color: "bg-[#FFB000]" },
  { id: "rose-quartz", name: "Rose Quartz", color: "bg-[#F472B6]" },
  { id: "nordic", name: "Nordic Snow", color: "bg-[#E0F2FE]" },
  { id: "solarized", name: "Solarized", color: "bg-[#2AA198]" },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted)
    return (
      <Button variant="ghost" size="icon">
        <Palette className="h-4 w-4" />
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100"
        >
          <Palette className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-zinc-950 border-zinc-800 [--accent:var(--color-zinc-800)] [--accent-foreground:var(--color-zinc-100)]"
      >
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setTheme(t.id)}
            className="flex items-center justify-between gap-3 text-zinc-300 cursor-pointer focus:bg-accent focus:text-accent-foreground"
          >
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${t.color} border border-white/10`}
              />
              <span>{t.name}</span>
            </div>
            {theme === t.id && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
