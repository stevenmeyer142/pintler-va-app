import { S3Client, CreateBucketCommand, waitUntilBucketExists, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
const client = new S3Client({});

export async function createBucketAndUploadFile(patientId: string, objectKey: string, fileContent: string): Promise<string> {
    const maxBucketNameLength = 63;
    const bucketNameBase = `va-patient-icn-${patientId.toLowerCase()}-${uuidv4()}`;
    const bucketName = bucketNameBase.substring(0, maxBucketNameLength);
    
    try {
        // Create a new S3 bucket
        const createBucketCommand = new CreateBucketCommand({
            Bucket: bucketName,
        });

        await client.send(createBucketCommand);
        await waitUntilBucketExists({ client: client, maxWaitTime: 6 }, { Bucket: bucketName });

        const putObjectCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: fileContent,
        });
        await client.send(putObjectCommand);
        return bucketName;
    }
    catch (error) {
        console.error("Error creating bucket:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}