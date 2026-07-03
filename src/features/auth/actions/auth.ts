"use server";

import { connectDB } from "@/lib/db/mongoose";
import mongoose from "mongoose";

export async function checkIdentityExists(email: string): Promise<boolean> {
  await connectDB();
  const user = await mongoose.connection.db?.collection("user").findOne({ email: email.toLowerCase() });
  return !!user;
}
