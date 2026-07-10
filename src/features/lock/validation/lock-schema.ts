import { z } from "zod";

// Validates that the passcode is exactly 4 to 6 numeric digits
export const passcodeSchema = z
  .string()
  .min(4, "Passcode must be at least 4 digits")
  .max(6, "Passcode cannot exceed 6 digits")
  .regex(/^\d+$/, "Passcode must contain only numbers");

// Schema for updating lock configurations
export const updateLockSettingsSchema = z.object({
  isLockEnabled: z.boolean(),
  passcode: z.string().optional(),
  autoLockTimeout: z.number().nonnegative(),
  lockOnTabHide: z.boolean(),
});
