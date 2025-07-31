import { HealthLakeClient, 
    StartFHIRImportJobCommand, DescribeFHIRImportJobCommand, DeleteFHIRDatastoreCommand,
    JobStatus} from "@aws-sdk/client-healthlake";

export const healthLakeClientInstance = new HealthLakeClient();

/**
 * Starts a FHIR import job in AWS HealthLake.
 *
 * @param job_name - The name of the import job.
 * @param datastore_id - The ID of the HealthLake datastore.
 * @param input_s3_uri - The S3 URI where the input FHIR data is located.
 * @param job_output_s3_uri - The S3 URI where the output of the import job will be stored.
 * @param kms_key_id - The KMS Key ID used to encrypt the output data.
 * @param data_access_role_arn - The ARN of the IAM role that grants HealthLake access to the S3 bucket.
 * @returns The response from the StartFHIRImportJobCommand.
 * @throws Will throw an error if the import job fails to start.
 */
export async function startFHIRImportJob(job_name: string,
    datastore_id: string,
    input_s3_uri: string,
    job_output_s3_uri: string,
    kms_key_id: string,
    data_access_role_arn: string) {
    try {        
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
 
/**
 * Waits for a FHIR import job to complete by polling its status.
 *
 * @param dataStoreId - The ID of the HealthLake datastore.
 * @param importJobID - The ID of the import job to monitor.
 * @param callback - Optional async callback invoked with the current job status and iteration count.
 * @returns The final status of the import job.
 * @throws Will throw an error if polling fails or the job encounters an error.
 */
export async function waitFHIRImportJobComplete(dataStoreId: string,  importJobID :string, callback?: (status: JobStatus, i: number) => void) {
    try {
        let status = JobStatus.SUBMITTED as JobStatus; // Initial status
        var i = 0; // Counter for iterations
        while (status === JobStatus.SUBMITTED || status === JobStatus.QUEUED || status === JobStatus.IN_PROGRESS) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRImportJobCommand({
                DatastoreId: dataStoreId,
                JobId: importJobID
            }));
            console.log("FHIR import job response:", response);
            status = response.ImportJobProperties?.JobStatus ?? JobStatus.FAILED; // Get the current status
            console.log("Current FHIR import job status:", status, "Iteration:", i);

            // Invoke the callback with the current status if provided
            if (callback) {
                callback(status, i);
            }
            i++; // Increment the iteration counter

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
