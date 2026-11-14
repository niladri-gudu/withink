"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { cn } from "@withink/utils";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";

import {
  getNotificationSettingsAction,
  saveNotificationSettingsAction,
  sendTestNotificationAction,
  subscribePushAction,
  unsubscribePushAction,
  type NotificationSettingsView,
} from "../actions/notification-actions";

const FALLBACK_SETTINGS: NotificationSettingsView = {
  dailyReminderEnabled: false,
  reminderTime: "20:00",
  letterAlertsEnabled: false,
  timezoneOffsetMinutes: 0,
};

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
        checked ? "bg-accent border-accent" : "bg-muted border-border",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "bg-background absolute top-1 h-4 w-4 rounded-full transition-all",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

/**
 * Reminder preferences. Push permission is requested only from a toggle
 * gesture (required on iOS); the subscription is registered with the server
 * before the preference is saved, so a failed permission never shows as "on".
 */
export function NotificationSettings() {
  const [loading, setLoading] = React.useState(true);
  const [configured, setConfigured] = React.useState(false);
  const [publicKey, setPublicKey] = React.useState<string | null>(null);
  const [settings, setSettings] =
    React.useState<NotificationSettingsView>(FALLBACK_SETTINGS);
  const [supported, setSupported] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [standalone, setStandalone] = React.useState(false);
  const [deviceCount, setDeviceCount] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    // Detect browser capabilities after the first paint; keeping this out of
    // the synchronous effect body avoids cascading-render warnings.
    const detectCapabilities = window.setTimeout(() => {
      if (cancelled) return;
      setSupported(isPushSupported());
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    }, 0);

    void (async () => {
      const result = await getNotificationSettingsAction();
      if (cancelled) return;
      if (!result.success) {
        toast.error(result.error ?? "Could not load reminder settings.");
      }
      setConfigured(result.configured);
      setPublicKey(result.publicKey);
      setSettings(result.settings);
      setDeviceCount(result.deviceCount);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(detectCapabilities);
    };
  }, []);

  const update = async (next: Partial<NotificationSettingsView>) => {
    const previous = settings;
    const merged = { ...settings, ...next };
    setSettings(merged);
    setSaving(true);

    try {
      const wantsPush =
        merged.dailyReminderEnabled || merged.letterAlertsEnabled;

      if (wantsPush) {
        if (!supported) {
          toast.error("This browser can't show notifications.");
          setSettings(previous);
          return;
        }
        if (!configured || !publicKey) {
          toast.error("Reminders aren't configured on this deployment yet.");
          setSettings(previous);
          return;
        }

        const permission =
          Notification.permission === "default"
            ? await Notification.requestPermission()
            : Notification.permission;
        if (permission !== "granted") {
          toast.error(
            "Notifications are blocked. Allow them in your browser settings.",
          );
          setSettings(previous);
          return;
        }

        const subscription = await subscribeToPush(publicKey);
        if (!subscription) {
          toast.error("Could not register this device for notifications.");
          setSettings(previous);
          return;
        }

        const subscribed = await subscribePushAction(subscription);
        if (!subscribed.success) {
          toast.error(
            subscribed.error ?? "Could not register this device.",
          );
          setSettings(previous);
          return;
        }
        setDeviceCount((count) => Math.max(count, 1));
      } else {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) {
          await unsubscribePushAction(endpoint);
        }
        setDeviceCount(0);
      }

      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      const saved = await saveNotificationSettingsAction({
        dailyReminderEnabled: merged.dailyReminderEnabled,
        reminderTime: merged.reminderTime,
        letterAlertsEnabled: merged.letterAlertsEnabled,
        timezoneOffsetMinutes,
      });

      if (!saved.success) {
        toast.error(saved.error ?? "Could not save reminders.");
        setSettings(previous);
        return;
      }

      setSettings({ ...merged, timezoneOffsetMinutes });
    } catch {
      toast.error("Could not update reminders.");
      setSettings(previous);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await sendTestNotificationAction();
      if (!result.success) {
        toast.error(result.error ?? "Could not send a test notification.");
      } else {
        toast.success("Test notification sent.");
      }
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-1 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading reminders…
      </div>
    );
  }

  const disabled = !configured || !supported || saving;
  const iosNeedsInstall = isIOS && !standalone;

  return (
    <div className="border-border bg-secondary/30 space-y-5 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-body-small text-foreground font-medium">
            Daily writing reminder
          </p>
          <p className="text-body-small text-muted-foreground">
            One quiet nudge, only on days you haven&apos;t written yet.
          </p>
        </div>
        <Toggle
          label="Daily writing reminder"
          checked={settings.dailyReminderEnabled}
          disabled={disabled}
          onChange={(checked) =>
            void update({ dailyReminderEnabled: checked })
          }
        />
      </div>

      {settings.dailyReminderEnabled && (
        <div className="space-y-2">
          <label
            htmlFor="reminder-time"
            className="text-body-small text-foreground font-medium"
          >
            Reminder time (your local time)
          </label>
          <Input
            id="reminder-time"
            type="time"
            value={settings.reminderTime}
            disabled={disabled}
            onChange={(event) =>
              void update({ reminderTime: event.target.value })
            }
            className="max-w-[160px]"
          />
        </div>
      )}

      <div className="border-border/60 flex items-start justify-between gap-4 border-t pt-5">
        <div className="space-y-1">
          <p className="text-body-small text-foreground font-medium">
            Letters arriving
          </p>
          <p className="text-body-small text-muted-foreground">
            Tell me when a letter to my future self has arrived.
          </p>
        </div>
        <Toggle
          label="Letters arriving"
          checked={settings.letterAlertsEnabled}
          disabled={disabled}
          onChange={(checked) => void update({ letterAlertsEnabled: checked })}
        />
      </div>

      <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <p className="text-caption text-muted-foreground">
          {deviceCount > 0
            ? `Active on ${deviceCount} device${deviceCount === 1 ? "" : "s"}.`
            : "This device isn't subscribed yet."}
        </p>
        {deviceCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={sendTest}
            disabled={testing}
          >
            {testing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            Send test
          </Button>
        )}
      </div>

      {!configured && (
        <p className="text-caption text-destructive">
          Reminders aren&apos;t configured on this deployment yet (missing VAPID
          keys).
        </p>
      )}

      {!supported && configured && (
        <p className="text-caption text-muted-foreground">
          This browser doesn&apos;t support notifications.
        </p>
      )}

      {iosNeedsInstall && (
        <p className="text-caption text-muted-foreground">
          On iPhone or iPad, notifications require Withink to be added to the
          Home Screen (iOS 16.4+).
        </p>
      )}
    </div>
  );
}
