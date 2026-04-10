import { useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EntryData {
  date: string;
  title: string;
  contentHtml: string;
  contentText: string;
  contentJson: any;
}

export function useAutoSave(data: EntryData, debounceMs = 1500) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestData = useRef(data);

  useEffect(() => {
    latestData.current = data;
  }, [data]);

  useEffect(() => {
    // don't save if there's nothing yet
    if (!data.contentText && !data.title) return;

    setStatus("saving");

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/journal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(latestData.current),
        });

        if (!res.ok) throw new Error("Save failed");
        setStatus("saved");

        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data.title, data.contentText, data.contentJson]);

  return status;
}
