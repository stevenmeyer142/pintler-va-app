/**
 * Creates a new S3 bucket with a unique name based on the provided patient ID, applies KMS encryption,
 * uploads a file to the bucket, and returns the bucket name.
 *
 * @param patientId - The patient identifier used to generate the bucket name.
 * @param objectKey - The key (filename) for the object to upload to the bucket.
 * @param fileContent - The content of the file to upload.
 * @param kms_key - The AWS KMS key ID or ARN to use for server-side encryption.
 * @returns A promise that resolves to the name of the created S3 bucket.
 * @throws Will throw an error if bucket creation, encryption configuration, or file upload fails.
 */
import { S3Client, CreateBucketCommand, waitUntilBucketExists, PutObjectCommand, PutBucketEncryptionCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
const client = new S3Client({});

export async function createBucketAndUploadFile(patientId: string, objectKey: string, fileContent: string, kms_key: string): Promise<string> {
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

        const putBucketEncryptionCommand = new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
                Rules: [
                    {
                        ApplyServerSideEncryptionByDefault: {
                            SSEAlgorithm: "aws:kms",
                            KMSMasterKeyID: kms_key,
                        },
                    },
                ],
            },
        });
        await client.send(putBucketEncryptionCommand);

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