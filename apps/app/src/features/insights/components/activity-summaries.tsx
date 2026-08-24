"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@withink/ui/card";
import {
  CalendarDays,
  Coffee,
  Moon,
  Sparkles,
  Sun,
  Sunset,
} from "lucide-react";

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
    description:
      "You prefer reflecting as the day begins, capturing thoughts with a fresh mind.",
    icon: Sun,
    color: "text-accent",
    bgColor: "bg-accent/10 border-accent/20",
  },
  afternoon: {
    title: "Midday Pause",
    description:
      "You find time in the afternoon to check in and write down reflections.",
    icon: Coffee,
    color: "text-accent",
    bgColor: "bg-accent/10 border-accent/20",
  },
  evening: {
    title: "Twilight Reflection",
    description:
      "Writing during sunset or twilight helps you close your day and wind down.",
    icon: Sunset,
    color: "text-accent",
    bgColor: "bg-accent/10 border-accent/20",
  },
  night: {
    title: "Late Night Thoughts",
    description:
      "You are a night owl, letting thoughts flow freely onto the page late in the evening.",
    icon: Moon,
    color: "text-accent",
    bgColor: "bg-accent/10 border-accent/20",
  },
};

export function ActivitySummaries({
  mostActiveDayOfWeek,
  mostActiveTimeOfDay,
}: ActivitySummariesProps) {
  const timeDetails = mostActiveTimeOfDay
    ? timeConfig[mostActiveTimeOfDay.period]
    : null;

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* Day of Week Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground/60 font-serif text-[11px] uppercase tracking-[0.16em]">
            Active Writing Day
          </CardTitle>
          <CalendarDays className="text-muted-foreground/60 h-4 w-4" />
        </CardHeader>
        <CardContent className="space-y-2">
          {mostActiveDayOfWeek ? (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-accent/10 text-accent border-accent/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-foreground font-serif text-xl font-bold">
                    {mostActiveDayOfWeek.day}s
                  </h5>
                  <p className="text-muted-foreground/60 font-serif text-[11px] uppercase tracking-[0.16em]">
                    {mostActiveDayOfWeek.count} entries written
                  </p>
                </div>
              </div>
              <p className="text-body-small text-muted-foreground leading-relaxed">
                You write most frequently on {mostActiveDayOfWeek.day}s. This
                might be your weekly reflection day, where you sum up your
                experiences.
              </p>
            </>
          ) : (
            <p className="text-body-small text-muted-foreground py-4">
              Write entries on different days of the week to reveal your active
              days.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Time of Day Card */}
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground/60 font-serif text-[11px] uppercase tracking-[0.16em]">
            Typical Writing Time
          </CardTitle>
          {timeDetails ? (
            <timeDetails.icon className={`h-4 w-4 ${timeDetails.color}`} />
          ) : (
            <Sun className="text-muted-foreground/60 h-4 w-4" />
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {timeDetails && mostActiveTimeOfDay ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${timeDetails.bgColor} ${timeDetails.color}`}
                >
                  <timeDetails.icon className="h-5 w-5" />
                </div>
                <div>
                  <h5 className="text-foreground font-serif text-xl font-bold">
                    {timeDetails.title}
                  </h5>
                  <p className="text-muted-foreground/60 font-serif text-[11px] uppercase tracking-[0.16em]">
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
