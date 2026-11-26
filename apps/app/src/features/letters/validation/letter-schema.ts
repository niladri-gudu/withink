// The letter wire schemas live in `@withink/contracts` so the Server Actions
// and the HTTP routes validate identically. Re-exported here to keep existing
// action imports stable.
export {
  getLetterSchema,
  letterIdSchema,
  saveLetterSchema,
  type SaveLetterParsed,
} from "@withink/contracts";
