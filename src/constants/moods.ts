export type MoodValue = 1 | 2 | 3 | 4 | 5;

export interface MoodConfig {
  value: MoodValue;
  label: string;
  emoji: string;
  colorClass: string;
}

export const MOODS: Record<MoodValue, MoodConfig> = {
  1: {
    value: 1,
    label: "Awful",
    emoji: "😞",
    colorClass: "text-red-500 bg-red-100 dark:bg-red-950/30",
  },
  2: {
    value: 2,
    label: "Bad",
    emoji: "🙁",
    colorClass: "text-orange-500 bg-orange-100 dark:bg-orange-950/30",
  },
  3: {
    value: 3,
    label: "Meh",
    emoji: "😐",
    colorClass: "text-yellow-500 bg-yellow-100 dark:bg-yellow-950/30",
  },
  4: {
    value: 4,
    label: "Good",
    emoji: "🙂",
    colorClass: "text-green-500 bg-green-100 dark:bg-green-950/30",
  },
  5: {
    value: 5,
    label: "Rad",
    emoji: "😀",
    colorClass: "text-emerald-500 bg-emerald-100 dark:bg-emerald-950/30",
  },
} as const;

export const MOOD_LIST = Object.values(MOODS) as MoodConfig[];
