import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import { serialize } from "@/lib/utils/serialize";

import {
  BillingAccountModel,
  type IBillingAccount,
} from "./billing-account-model";

/**
 * Pure persistence for billing accounts. No caching here — the entitlements
 * service owns the Redis cache; callers that mutate rows through this
 * repository must invalidate it (see EntitlementsService.invalidateCache).
 */
export class BillingAccountRepository {
  static async getByUserId(
    userId: string,
  ): Promise<IBillingAccount | null> {
    await connectDB();
    const account = await (
      BillingAccountModel as Model<IBillingAccount>
    )
      .findOne({ userId })
      .lean();
    return serialize(account) as IBillingAccount | null;
  }

  static async getByDodoCustomerId(
    dodoCustomerId: string,
  ): Promise<IBillingAccount | null> {
    if (!dodoCustomerId) return null;
    await connectDB();
    const account = await (
      BillingAccountModel as Model<IBillingAccount>
    )
      .findOne({ dodoCustomerId })
      .lean();
    return serialize(account) as IBillingAccount | null;
  }

  /**
   * Creates or updates the user's billing record. Used exclusively by the
   * webhook handler; `userId` must come from verified event metadata.
   */
  static async upsertByUserId(
    userId: string,
    patch: Partial<Omit<IBillingAccount, "userId" | "createdAt">>,
  ): Promise<IBillingAccount> {
    await connectDB();

    const account = await (
      BillingAccountModel as Model<IBillingAccount>
    ).findOneAndUpdate(
      { userId },
      {
        $set: patch,
        $setOnInsert: { userId },
      },
      { upsert: true, new: true, lean: true },
    );

    return serialize(account) as unknown as IBillingAccount;
  }
}
