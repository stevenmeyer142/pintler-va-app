import { S3Client, DeleteObjectCommand, DeleteBucketCommand, ListObjectsCommand, waitUntilObjectNotExists } from "@aws-sdk/client-s3";

const client = new S3Client({});

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