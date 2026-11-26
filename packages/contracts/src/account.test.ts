import { describe, expect, it } from "vitest";

import {
  deleteAccountSchema,
  encryptionMutationRequestSchema,
  expoPushTokenSchema,
  notificationSettingsSchema,
  registerPushDeviceSchema,
  saveLetterSchema,
  updateLockSettingsSchema,
} from "./account";

const PROOF = "a".repeat(64);
const SALT = "b".repeat(32);

describe("account contracts", () => {
  describe("updateLockSettingsSchema", () => {
    it("accepts a minimal lock change", () => {
      expect(
        updateLockSettingsSchema.safeParse({
          isLockEnabled: true,
          autoLockTimeout: 300,
          lockOnTabHide: false,
        }).success,
      ).toBe(true);
    });

    it("rejects passcodes outside 4-6 digits", () => {
      expect(
        updateLockSettingsSchema.safeParse({
          isLockEnabled: true,
          passcode: "123",
          autoLockTimeout: 300,
          lockOnTabHide: false,
        }).success,
      ).toBe(false);
      expect(
        updateLockSettingsSchema.safeParse({
          isLockEnabled: true,
          passcode: "1234567",
          autoLockTimeout: 300,
          lockOnTabHide: false,
        }).success,
      ).toBe(false);
    });

    it("rejects an out-of-range auto-lock timeout", () => {
      expect(
        updateLockSettingsSchema.safeParse({
          isLockEnabled: true,
          autoLockTimeout: 86_401,
          lockOnTabHide: false,
        }).success,
      ).toBe(false);
    });
  });

  describe("saveLetterSchema", () => {
    it("applies empty content defaults", () => {
      const parsed = saveLetterSchema.parse({
        unlockDate: "2030-01-01",
      });
      expect(parsed).toMatchObject({
        unlockDate: "2030-01-01",
        sealed: false,
        title: "",
        contentHtml: "",
        contentText: "",
      });
    });

    it("rejects a malformed unlock date or letter id", () => {
      expect(
        saveLetterSchema.safeParse({ unlockDate: "2030-1-1" }).success,
      ).toBe(false);
      expect(
        saveLetterSchema.safeParse({
          unlockDate: "2030-01-01",
          letterId: "not-an-id",
        }).success,
      ).toBe(false);
    });

    it("accepts ciphertext content untouched", () => {
      const parsed = saveLetterSchema.parse({
        unlockDate: "2030-01-01",
        title: "aa:bb",
        contentHtml: "cc:dd",
        contentText: "ee:ff",
        contentJson: { iv: "aa", data: "bb" },
      });
      expect(parsed.contentJson).toEqual({ iv: "aa", data: "bb" });
    });
  });

  describe("encryptionMutationRequestSchema", () => {
    it("accepts a password rotation", () => {
      expect(
        encryptionMutationRequestSchema.safeParse({
          action: "change-password",
          verificationCiphertext: "aa:bb",
          unlockProof: PROOF,
        }).success,
      ).toBe(true);
    });

    it("requires a 16-byte hex salt to enable", () => {
      expect(
        encryptionMutationRequestSchema.safeParse({
          action: "enable",
          salt: "short",
          verificationCiphertext: "aa:bb",
          entries: [],
        }).success,
      ).toBe(false);

      expect(
        encryptionMutationRequestSchema.safeParse({
          action: "enable",
          salt: SALT,
          verificationCiphertext: "aa:bb",
          entries: [
            {
              id: "entry-1",
              title: "aa:bb",
              contentHtml: "cc:dd",
              contentText: "ee:ff",
              contentJson: "aa:bb",
              wordCount: 3,
            },
          ],
        }).success,
      ).toBe(true);
    });
  });

  describe("notificationSettingsSchema", () => {
    it("accepts a valid reminder window and timezone", () => {
      expect(
        notificationSettingsSchema.safeParse({
          dailyReminderEnabled: true,
          reminderTime: "23:59",
          letterAlertsEnabled: false,
          timezoneOffsetMinutes: 840,
        }).success,
      ).toBe(true);
    });

    it("rejects an impossible time or timezone", () => {
      expect(
        notificationSettingsSchema.safeParse({
          dailyReminderEnabled: true,
          reminderTime: "24:00",
          letterAlertsEnabled: false,
          timezoneOffsetMinutes: 0,
        }).success,
      ).toBe(false);
      expect(
        notificationSettingsSchema.safeParse({
          dailyReminderEnabled: true,
          reminderTime: "09:00",
          letterAlertsEnabled: false,
          timezoneOffsetMinutes: 900,
        }).success,
      ).toBe(false);
    });
  });

  describe("push device tokens", () => {
    it("accepts both Expo token spellings", () => {
      expect(expoPushTokenSchema.safeParse("ExpoPushToken[abc123]").success).toBe(
        true,
      );
      expect(
        expoPushTokenSchema.safeParse("ExponentPushToken[abc123]").success,
      ).toBe(true);
    });

    it("rejects raw URLs and empty tokens", () => {
      expect(expoPushTokenSchema.safeParse("https://example.com").success).toBe(
        false,
      );
      expect(expoPushTokenSchema.safeParse("ExpoPushToken[]").success).toBe(
        false,
      );
    });

    it("requires a platform on registration", () => {
      expect(
        registerPushDeviceSchema.safeParse({
          token: "ExpoPushToken[abc]",
          platform: "android",
        }).success,
      ).toBe(true);
      expect(
        registerPushDeviceSchema.safeParse({
          token: "ExpoPushToken[abc]",
          platform: "web",
        }).success,
      ).toBe(false);
    });
  });

  describe("deleteAccountSchema", () => {
    it("allows an empty body for social accounts", () => {
      expect(deleteAccountSchema.safeParse({}).success).toBe(true);
    });

    it("bounds the re-authentication password", () => {
      expect(
        deleteAccountSchema.safeParse({ password: "x".repeat(201) }).success,
      ).toBe(false);
    });
  });
});
