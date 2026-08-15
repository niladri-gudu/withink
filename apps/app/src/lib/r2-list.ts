import "server-only";

import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { r2 } from "./r2";

export interface ListedObject {
  key: string;
  size: number;
  lastModified: Date | undefined;
}

/**
 * Lists every object under a prefix, following R2's 1,000-object pagination
 * limit (`IsTruncated`/`ContinuationToken`). Without this, users with more than
 * 1,000 uploaded files get a silently truncated gallery and wrong storage stats.
 */
export async function listAllObjects(
  bucket: string,
  prefix: string,
): Promise<ListedObject[]> {
  const objects: ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of response.Contents || []) {
      objects.push({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified,
      });
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}
