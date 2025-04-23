"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBucketAndUploadFile = createBucketAndUploadFile;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const client = new client_s3_1.S3Client({});
function createBucketAndUploadFile(patientId, objectKey, fileContent, kms_key) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxBucketNameLength = 63;
        const bucketNameBase = `va-patient-icn-${patientId.toLowerCase()}-${(0, uuid_1.v4)()}`;
        const bucketName = bucketNameBase.substring(0, maxBucketNameLength);
        try {
            // Create a new S3 bucket
            const createBucketCommand = new client_s3_1.CreateBucketCommand({
                Bucket: bucketName,
            });
            yield client.send(createBucketCommand);
            yield (0, client_s3_1.waitUntilBucketExists)({ client: client, maxWaitTime: 6 }, { Bucket: bucketName });
            const putBucketEncryptionCommand = new client_s3_1.PutBucketEncryptionCommand({
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
            yield client.send(putBucketEncryptionCommand);
            const putObjectCommand = new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                Body: fileContent,
            });
            yield client.send(putObjectCommand);
            return bucketName;
        }
        catch (error) {
            console.error("Error creating bucket:", error);
            throw error; // Re-throw the error for the caller to handle
        }
    });
}
