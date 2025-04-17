import { HealthLakeClient, CreateFHIRDatastoreCommand, DatastoreStatus, DescribeFHIRDatastoreCommand,
    StartFHIRImportJobCommand, DescribeFHIRImportJobCommand,
    JobStatus} from "@aws-sdk/client-healthlake";
 } from "@aws-sdk/client-healthlake";

export const healthLakeClientInstance = new HealthLakeClient();

const createHealthLakeDataStore = async (dataStoreName: string) => {
    try {
        
        const response = await healthLakeClientInstance.send(new CreateFHIRDatastoreCommand({
            DatastoreName: dataStoreName,
            DatastoreTypeVersion: "R4"
        }));
        console.log("Data store created successfully:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error creating data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

const waitDataStoreActive = async (dataStoreId: string, callback?: (status: DatastoreStatus) => void) => {
    try {
        let status: DatastoreStatus = DatastoreStatus.CREATING; // Initial status
        while (status === DatastoreStatus.CREATING) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = response.DatastoreProperties?.DatastoreStatus ?? DatastoreStatus.CREATE_FAILED; // Get the current status
            console.log("Data store status:", status);

            // Invoke the callback with the current status if provided
            if (callback) {
                callback(status);
            }

            if (status !== DatastoreStatus.CREATING) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status; // Return the final status
    } catch (error) {
        console.error("Error waiting for data store to become active:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

async function startFHIRImportJob(job_name: str,
    datastore_id: string,
    input_s3_uri: string,
    job_output_s3_uri: string,
    kms_key_id: string,
    data_access_role_arn: string) {
    try {
        const response = await healthLakeClientInstance.send(new StartFHIRImportJobCommand({
            DatastoreId: dataStoreId,
            InputS3Uri: `s3://${s3Bucket}/${s3ObjectKey}`
        }));
        console.log("FHIR import job started successfully:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error starting FHIR import job:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

async function waitFHIRImportJobComplete(dataStoreId: string,  importJobID :string, callback?: (status: JobStatus) => void) {
    try {
        let status: JobStatus = JobStatus.SUBMITTED; // Initial status
        while (status === JobStatus.IN_PROGRESS) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRImportJobCommand({
                DatastoreId: dataStoreId,
                JobId: importJobID
            }));
            status = response.ImportJobProperties?.JobStatus ?? JobStatus.FAILED; // Get the current status
            console.log("FHIR import job status:", status);

            // Invoke the callback with the current status if provided
            if (callback) {
                callback(status);
            }

            if (status !== JobStatus.IN_PROGRESS) {
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
