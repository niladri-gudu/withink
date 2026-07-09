"use client";

import React from "react";
import { CalendarDays, Sun, Sunset, Moon, Coffee, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivitySummariesProps {
  mostActiveDayOfWeek: { day: string; count: number } | null;
  mostActiveTimeOfDay: { period: string; count: number } | null;
}

const timeConfig: Record<
  string,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  morning: {
    title: "Morning Clarity",
    description: "You prefer reflecting as the day begins, capturing thoughts with a fresh mind.",
    icon: Sun,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  afternoon: {
    title: "Midday Pause",
    description: "You find time in the afternoon to check in and write down reflections.",
    icon: Coffee,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  evening: {
    title: "Twilight Reflection",
    description: "Writing during sunset or twilight helps you close your day and wind down.",
    icon: Sunset,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
  },
  night: {
    title: "Late Night Thoughts",
    description: "You are a night owl, letting thoughts flow freely onto the page late in the evening.",
    icon: Moon,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
};

export function ActivitySummaries({ mostActiveDayOfWeek, mostActiveTimeOfDay }: ActivitySummariesProps) {
  const timeDetails = mostActiveTimeOfDay ? timeConfig[mostActiveTimeOfDay.period] : null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Day of Week Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">
            Active Writing Day
          </CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground/60" />
        </CardHeader>
        <CardContent className="space-y-2">
          {mostActiveDayOfWeek ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-serif font-bold text-xl text-foreground">
                    {mostActiveDayOfWeek.day}s
                  </h5>
                  <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                    {mostActiveDayOfWeek.count} entries written
                  </p>
                </div>
              </div>
              <p className="text-body-small text-muted-foreground leading-relaxed">
                You write most frequently on {mostActiveDayOfWeek.day}s. This might be your weekly reflection day, where you sum up your experiences.
              </p>
            </>
          ) : (
            <p className="text-body-small text-muted-foreground py-4">
              Write entries on different days of the week to reveal your active days.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Time of Day Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60">
            Typical Writing Time
          </CardTitle>
          {timeDetails ? (
            <timeDetails.icon className={`h-4 w-4 ${timeDetails.color}`} />
          ) : (
            <Sun className="h-4 w-4 text-muted-foreground/60" />
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {timeDetails && mostActiveTimeOfDay ? (
            <>
              <div className="flex items-center gap-2">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${timeDetails.bgColor} ${timeDetails.color}`}>
                  <timeDetails.icon className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="font-serif font-bold text-xl text-foreground">
                    {timeDetails.title}
                  </h5>
                  <p className="text-[10px] font-mono text-muted-foreground/60 uppercase">
                    {mostActiveTimeOfDay.count} entries written
                  </p>
                </div>
              </div>
              <p className="text-body-small text-muted-foreground leading-relaxed">
                {timeDetails.description}
              </p>
            </>
          ) : (
            <p className="text-body-small text-muted-foreground py-4">
              Keep writing to observe your daily reflection rhythm.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
