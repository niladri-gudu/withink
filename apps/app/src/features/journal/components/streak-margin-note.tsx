import { Flame } from "lucide-react";

interface StreakMarginNoteProps {
  currentStreak: number;
}

/**
 * The day-streak margin note. Shared by the server hero (non-ZK) and the
 * local-first hero (ZK) so the two paths render identical markup.
 */
export function StreakMarginNote({ currentStreak }: StreakMarginNoteProps) {
  return (
    <div className="border-border flex flex-col justify-between rounded-xl border p-6">
      <p className="text-running-head text-muted-foreground/70">Margin note</p>
      <div className="my-6 flex items-end gap-3">
        <Flame className="text-accent h-6 w-6" />
        <span className="text-foreground font-serif text-5xl leading-none font-bold">
          {currentStreak}
        </span>
        <span className="text-muted-foreground/70 font-hand pb-1 text-lg leading-none">
          day{currentStreak === 1 ? "" : "s"} in a row
        </span>
      </div>
      <p className="text-muted-foreground border-border/60 border-t pt-3 font-serif text-xs leading-relaxed">
        Keep the page open and the ink flowing. Streaks are a quiet record,
        never a demand.
      </p>
    </div>
  );
}
