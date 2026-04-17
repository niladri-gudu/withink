"use server";

import { connectDB } from "@/lib/mongoose";
import mongoose from "mongoose";

export async function checkIdentityExists(email: string) {
  await connectDB();
  const user = await mongoose.connection.db?.collection("user").findOne({ email });
  return !!user;
}