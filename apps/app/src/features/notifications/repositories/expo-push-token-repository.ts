import type { Model } from "mongoose";

import { connectDB } from "@/lib/db/mongoose";

import {
  ExpoPushTokenModel,
  type IExpoPushToken,
} from "./expo-push-token-model";

const expoPushTokenModel = ExpoPushTokenModel as Model<IExpoPushToken>;

export interface ExpoPushTokenRecord {
  id: string;
  userId: string;
  token: string;
  platform: "ios" | "android";
  deviceLabel: string;
}

export class ExpoPushTokenRepository {
  /** Re-registering the same install refreshes ownership instead of duplicating. */
  static async upsert(
    userId: string,
    device: {
      token: string;
      platform: "ios" | "android";
      deviceLabel?: string;
    },
  ): Promise<void> {
    await connectDB();
    await expoPushTokenModel.findOneAndUpdate(
      { token: device.token },
      {
        $set: {
          userId,
          platform: device.platform,
          deviceLabel: device.deviceLabel ?? "",
          lastUsedAt: new Date(),
        },
        $setOnInsert: { token: device.token },
      },
      { upsert: true },
    );
  }

  static async listByUser(userId: string): Promise<ExpoPushTokenRecord[]> {
    await connectDB();
    const docs = (await expoPushTokenModel
      .find({ userId })
      .select("userId token platform deviceLabel")
      .lean()) as unknown as (IExpoPushToken & { _id: unknown })[];
    return docs.map((doc) => ({
      id: String(doc._id),
      userId: doc.userId,
      token: doc.token,
      platform: doc.platform,
      deviceLabel: doc.deviceLabel ?? "",
    }));
  }

  static async countByUser(userId: string): Promise<number> {
    await connectDB();
    return await expoPushTokenModel.countDocuments({ userId });
  }

  static async deleteById(id: string): Promise<void> {
    await connectDB();
    await expoPushTokenModel.deleteOne({ _id: id });
  }

  static async deleteByToken(userId: string, token: string): Promise<void> {
    await connectDB();
    await expoPushTokenModel.deleteOne({ userId, token });
  }
}
