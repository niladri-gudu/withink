import { z } from "zod";

/**
 * Native unlock handshake.
 *
 * The client proves possession of the master key by sending the HKDF-derived
 * unlock proof. The server returns a short-lived opaque token that native
 * media/export requests send in `X-Withink-Unlock`; the web keeps using its
 * HttpOnly unlock cookie.
 */

export const UNLOCK_HEADER_NAME = "x-withink-unlock";

export const unlockProofSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "Invalid unlock proof.");

export const unlockRequestSchema = z.object({
  proof: unlockProofSchema,
});

export type UnlockRequest = z.infer<typeof unlockRequestSchema>;

export interface UnlockResponse {
  /** Opaque AES-GCM token; send it in `X-Withink-Unlock`. */
  token: string;
  /** ISO timestamp; the client re-unlocks before this. */
  expiresAt: string;
}
