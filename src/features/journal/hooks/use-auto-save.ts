import { useEffect, useRef, useState } from "react";
import { saveEntryAction } from "../actions/entry-actions";
import { getLocalDateString } from "@/lib/utils/date";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface AutoSaveData {
  date: string;
  title: string;
  mood: number | null;
  contentHtml: string;
  contentText: string;
  contentJson: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function useAutoSave(
  data: AutoSaveData,
  debounceMs = 1500,
  enabled = true,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDateRef = useRef(data.date);

  const isDirty = useRef(false);
  const hasInitialized = useRef(false);

  // Tracks latest data for async autosave invocation
  const latestData = useRef(data);
  useEffect(() => {
    latestData.current = data;
  }, [data]);

  // Track the initial values to determine "dirty" state
  const initialContent = useRef({
    title: data.title,
    html: data.contentHtml,
    text: data.contentText,
    json: data.contentJson,
    mood: data.mood,
  });

  // Initialize once we are enabled and have received initial values
  useEffect(() => {
    if (!enabled) return;

    // Reset baseline when the date changes
    if (data.date !== lastDateRef.current) {
      hasInitialized.current = false;
      isDirty.current = false;
      lastDateRef.current = data.date;
      setStatus("idle");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    if (!hasInitialized.current) {
      initialContent.current = {
        title: data.title,
        html: data.contentHtml,
        text: data.contentText,
        json: data.contentJson,
        mood: data.mood,
      };
      hasInitialized.current = true;
      return;
    }

    // Check if anything has actually changed since initial load
    if (
      data.title !== initialContent.current.title ||
      data.contentHtml !== initialContent.current.html ||
      data.contentText !== initialContent.current.text ||
      JSON.stringify(data.contentJson) !== JSON.stringify(initialContent.current.json) ||
      data.mood !== initialContent.current.mood
    ) {
      isDirty.current = true;
    }
  }, [data, enabled]);

  // Debounced Autosave Trigger
  useEffect(() => {
    if (!enabled) return;
    if (!isDirty.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      
      const userLocalToday = getLocalDateString();
      const currentPayload = latestData.current;

      const result = await saveEntryAction(
        {
          date: currentPayload.date,
          title: currentPayload.title,
          mood: currentPayload.mood,
          contentHtml: currentPayload.contentHtml,
          contentText: currentPayload.contentText,
          contentJson: currentPayload.contentJson,
        },
        userLocalToday,
      );

      if (result.success && result.data) {
        // Reset baseline to the values we just saved
        initialContent.current = {
          title: currentPayload.title,
          html: currentPayload.contentHtml,
          text: currentPayload.contentText,
          json: currentPayload.contentJson,
          mood: currentPayload.mood,
        };
        isDirty.current = false;
        setStatus("saved");

        // Return to idle status after 2 seconds
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        console.error("[useAutoSave] failed:", result.error);
        setStatus("error");
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    data.date,
    data.title,
    data.contentHtml,
    data.contentText,
    data.contentJson,
    data.mood,
    debounceMs,
    enabled,
  ]);

  return status;
}
