// The wire schema lives in `@withink/contracts` so the web actions, the HTTP
// sync routes, and native clients validate entries identically. Re-exported
// here to keep existing imports stable.
export {
  dateStringSchema,
  saveEntrySchema,
  type SaveEntryInput,
} from "@withink/contracts";
