import { HealthLakeClient, 
    StartFHIRImportJobCommand, DescribeFHIRImportJobCommand, DeleteFHIRDatastoreCommand,
    JobStatus} from "@aws-sdk/client-healthlake";

export const healthLakeClientInstance = new HealthLakeClient();

export async function startFHIRImportJob(job_name: string,
    datastore_id: string,
    input_s3_uri: string,
    job_output_s3_uri: string,
    kms_key_id: string,
    data_access_role_arn: string) {
    try {
        /*
         * You cannot create an IAM role directly from within this function using the AWS SDK for HealthLake.
         * The DataAccessRoleArn must be created in advance with the necessary permissions.
         * 
         * Example IAM policy for the data access role:
         * 
         * {
         *   "Version": "2012-10-17",
         *   "Statement": [
         *     {
         *       "Effect": "Allow",
         *       "Action": [
         *         "s3:GetObject",
         *         "s3:ListBucket"
         *       ],
         *       "Resource": [
         *         "arn:aws:s3:::your-input-bucket",
         *         "arn:aws:s3:::your-input-bucket/*"
         *       ]
         *     },
         *     {
         *       "Effect": "Allow",
         *       "Action": [
         *         "s3:PutObject"
         *       ],
         *       "Resource": [
         *         "arn:aws:s3:::your-output-bucket/*"
         *       ]
         *     },
         *     {
         *       "Effect": "Allow",
         *       "Action": [
         *         "kms:Decrypt",
         *         "kms:Encrypt",
         *         "kms:GenerateDataKey"
         *       ],
         *       "Resource": "arn:aws:kms:your-region:your-account-id:key/your-kms-key-id"
         *     }
         *   ]
         * }
         * 
         * The role must also have a trust relationship allowing HealthLake to assume it:
         * 
         * {
         *   "Version": "2012-10-17",
         *   "Statement": [
         *     {
         *       "Effect": "Allow",
         *       "Principal": {
         *         "Service": "healthlake.amazonaws.com"
         *       },
         *       "Action": "sts:AssumeRole"
         *     }
         *   ]
         * }
         * 
         * Pass the ARN of this role as the data_access_role_arn parameter.
         */
        
        const response = await healthLakeClientInstance.send(new StartFHIRImportJobCommand({
            JobName: job_name,
            InputDataConfig: {
                S3Uri: input_s3_uri
            },
            JobOutputDataConfig: {
                S3Configuration: {
                    S3Uri: job_output_s3_uri,
                    KmsKeyId: kms_key_id,
                },
            },
            DatastoreId : datastore_id,
            DataAccessRoleArn : data_access_role_arn,

        }));
        console.log("FHIR import job started successfully:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error starting FHIR import job:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}
 
export async function waitFHIRImportJobComplete(dataStoreId: string,  importJobID :string, callback?: (status: JobStatus) => void) {
    try {
        let status = JobStatus.SUBMITTED as JobStatus; // Initial status
        while (status === JobStatus.SUBMITTED || status === JobStatus.QUEUED || status === JobStatus.IN_PROGRESS) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRImportJobCommand({
                DatastoreId: dataStoreId,
                JobId: importJobID
            }));
            console.log("FHIR import job response:", response);
            status = response.ImportJobProperties?.JobStatus ?? JobStatus.FAILED; // Get the current status
            console.log("Current FHIR import job status:", status);

            // Invoke the callback with the current status if provided
            if (callback) {
                callback(status);
            }

            if (status !== JobStatus.SUBMITTED && status !== JobStatus.QUEUED && status !== JobStatus.IN_PROGRESS) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status; // Return the final status
    } catch (error) {
        console.error("Error waiting for FHIR import job to complete:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

const deleteHealthLakeDataStore = async (dataStoreId: string) => {
    try {
        const response = await healthLakeClientInstance.send(new DeleteFHIRDatastoreCommand({
            DatastoreId: dataStoreId
        }));
        console.log("Data store deleted successfully:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error deleting data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}
