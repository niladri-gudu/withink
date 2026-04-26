"use server";

import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const isProd = process.env.NODE_ENV === "production";

/**
 * Fetches storage statistics for the Media Library
 */
export async function getStorageStats(userId: string) {
  try {
    const prefix = isProd ? `uploads/${userId}/` : `dev-uploads/${userId}/`;

    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3.send(command);
    const totalSizeBytes = response.Contents?.reduce((acc, obj) => acc + (obj.Size || 0), 0) || 0;
    const fileCount = response.Contents?.length || 0;
    const totalSizeMB = Number((totalSizeBytes / (1024 * 1024)).toFixed(2));

    return {
      usedMB: totalSizeMB,
      fileCount,
      limitMB: 50,
      files: response.Contents?.slice(0, 4).map(file => ({
        key: file.Key,
        url: `https://assets.withink.me/${file.Key}`
      })) || []
    };
  } catch (error) {
    console.error("R2 Stats Fetch Error:", error);
    return { usedMB: 0, fileCount: 0, limitMB: 50, files: [] };
  }
}

/**
 * 🚀 NEW: Generates a signed URL for secure Avatar uploads
 */
export async function getAvatarPresignedUrl(userId: string, contentType: string) {
  try {
    // Environment-aware folder selection
    const folder = isProd ? "avatars" : "dev-avatars";
    
    // Create a unique key using userId and timestamp to avoid cache issues
    const key = `${folder}/${userId}-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 60 seconds for maximum security
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
    
    return { 
      uploadUrl, 
      publicUrl: `https://assets.withink.me/${key}` 
    };
  } catch (error) {
    console.error("R2 Presigned URL Error:", error);
    throw new Error("Failed to generate upload authority.");
  }
}