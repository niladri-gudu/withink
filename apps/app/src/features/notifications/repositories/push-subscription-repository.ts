import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";

import {
  PushSubscriptionModel,
  type IPushSubscription,
} from "./push-subscription-model";

const pushSubscriptionModel =
  PushSubscriptionModel as Model<IPushSubscription>;

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class PushSubscriptionRepository {
  static async upsert(
    userId: string,
    subscription: {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string;
    },
  ): Promise<void> {
    await connectDB();
    await pushSubscriptionModel.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          userId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          userAgent: subscription.userAgent ?? "",
        },
        $setOnInsert: { endpoint: subscription.endpoint },
      },
      { upsert: true },
    );
  }

  static async listByUser(userId: string): Promise<PushSubscriptionRecord[]> {
    await connectDB();
    const docs = (await pushSubscriptionModel.find({ userId })
      .select("userId endpoint p256dh auth")
      .lean()) as unknown as (IPushSubscription & { _id: unknown })[];
    return docs.map((doc) => ({
      id: String(doc._id),
      userId: doc.userId,
      endpoint: doc.endpoint,
      p256dh: doc.p256dh,
      auth: doc.auth,
    }));
  }

  static async countByUser(userId: string): Promise<number> {
    await connectDB();
    return await pushSubscriptionModel.countDocuments({ userId });
  }

  static async deleteById(id: string): Promise<void> {
    await connectDB();
    await pushSubscriptionModel.deleteOne({ _id: id });
  }

  static async deleteByEndpoint(
    userId: string,
    endpoint: string,
  ): Promise<void> {
    await connectDB();
    await pushSubscriptionModel.deleteOne({ userId, endpoint });
  }
}
