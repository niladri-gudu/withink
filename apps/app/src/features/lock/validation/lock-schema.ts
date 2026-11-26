// The lock wire schema lives in `@withink/contracts` so the Server Actions and
// the HTTP routes validate identically. Re-exported here to keep existing
// action imports stable.
export {
  passcodeSchema,
  updateLockSettingsSchema,
  type UpdateLockSettingsRequest,
} from "@withink/contracts";
