import { S3Client, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";


export const s3ClientInstance = new S3Client();

export async function getS3Object(bucketName: string, key: string): Promise<string | undefined> {
    try {
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const response = await s3ClientInstance.send(command);
        const bodyContents = await response.Body?.transformToString();
        return bodyContents;
    } catch (error) {
        console.error("Error getting S3 object:", error);
        throw error;
    }
}

export async function putS3Object(bucketName: string, key: string, body: string): Promise<void> {
    try {
        const command = new PutObjectCommand({ Bucket: bucketName, Key: key, Body: body });
        await s3ClientInstance.send(command);
    } catch (error) {
        console.error("Error putting S3 object:", error);
        throw error;
    }
}