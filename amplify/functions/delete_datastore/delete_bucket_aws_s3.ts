import { S3Client, DeleteObjectCommand, DeleteBucketCommand, ListObjectsCommand, waitUntilObjectNotExists } from "@aws-sdk/client-s3";

const client = new S3Client({});

/**
 * Deletes all objects within the specified S3 bucket and then deletes the bucket itself.
 *
 * This function performs the following steps:
 * 1. Lists all objects in the given S3 bucket.
 * 2. Deletes each object found in the bucket, waiting for each deletion to complete.
 * 3. Deletes the bucket after all objects have been removed.
 *
 * @param bucketName - The name of the S3 bucket to delete along with its contents.
 * @throws Will throw an error if any operation (listing, deleting objects, or deleting the bucket) fails.
 */
export async function deleteBucketAndObjects(bucketName: string): Promise<void> {
    try {
        // List all objects in the bucket
        const listCommand = new ListObjectsCommand({ Bucket: bucketName });
        const data = await client.send(listCommand);

        if (data.Contents) {
            for (const object of data.Contents) {
                if (object.Key) {
                    // Delete each object in the bucket
                    const deleteCommand = new DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: object.Key,
                    });
                    await client.send(deleteCommand);
                    await waitUntilObjectNotExists({ client: client, maxWaitTime: 6 }, { Bucket: bucketName, Key: object.Key });
                }
            }
        }

        // Delete the bucket itself
        const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucketName });
        await client.send(deleteBucketCommand);
    } catch (error) {
        console.error("Error deleting bucket or objects:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}