import type { Schema, HealthLakeDatastoreRecord, FunctionResponse } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import { startFHIRImportJob, waitFHIRImportJobComplete } from './import_fhir_aws_health_lake';

Amplify.configure(outputs);

const client = generateClient<Schema>();

/**
 * AWS Lambda handler for importing FHIR data into an AWS HealthLake datastore.
 *
 * This function performs the following steps:
 * 1. Validates the input event and retrieves the HealthLake datastore record from DynamoDB.
 * 2. Starts a FHIR import job in AWS HealthLake using the provided datastore and S3 input/output locations.
 * 3. Updates the status of the HealthLake datastore record to reflect the import job's progress.
 * 4. Waits for the import job to complete, updating the status in DynamoDB on each iteration.
 * 5. Returns a JSON string indicating the success or failure of the import operation, including the job ID if successful.
 *
 * @param event - The Lambda event containing the arguments for the import operation, including the HealthLake datastore ID.
 * @returns A promise that resolves to a JSON string indicating the result of the import operation.
*/
async function updateHealthLakeDatastoreStatus(id: string | undefined, status: string, description: string): Promise<FunctionResponse> {
  if (!id) {
    console.error("id is required to update healthLake datastore status");
    return { success: false, message: "Error id is required for updateHealthLakeDatastoreStatus" };
  }
  const { data, errors } = await client.models.HealthLakeDatastore.update({
    id: id,
    status: status,
    status_description: description,
  });
  if (errors) {
    console.error("Error updating healthLake datastore status", errors);
    return { success: false, message: errors[0].message };
  }
  else {
    console.log("HealthLake datastore status updated successfully");
  }
  return { success: true, message: "" };
}

export const handler: Schema["importFHIR"]["functionHandler"] = async (event): Promise<string | null> => {
  const { id } = event.arguments
  console.log("Calling HealthLakeDatastore:", event.arguments);

  if (!id) {
    console.error("id is required");
    return JSON.stringify({ success: false, message: "id is required" });
  }

  const { data: healthLakeDatastoreResult, errors } = await client.models.HealthLakeDatastore.get({
    id: id,
  });
  if (errors) {
    console.error("Error getting healhLake data", errors);
    return JSON.stringify({ success: false, message: errors[0].message });
  }

  var healthLakeDatastore: HealthLakeDatastoreRecord;
  if (!healthLakeDatastoreResult) {
    console.error("Error missing DynamoHealthLakeDatastoreRecord with id", id);
    return JSON.stringify({ success: false, message: `Error missing HealthLakeDatastore with id ${id}` });
  }
  else {
    console.log("Found existing DynamoDB healthLake data store record", healthLakeDatastoreResult);
    if (
      !healthLakeDatastoreResult.s3_input ||
      !healthLakeDatastoreResult.id ||
      !healthLakeDatastoreResult.patient_icn ||
      !healthLakeDatastoreResult.name ||
      !healthLakeDatastoreResult.status ||
      !healthLakeDatastoreResult.datastore_id
    ) {
      console.error("HealthLakeDatastoreResult contains null values", healthLakeDatastoreResult);
      return JSON.stringify({ success: false, message: "HealthLakeDatastoreResult contains null values" });
    }
    healthLakeDatastore = healthLakeDatastoreResult;
  }

  var jobId;
  try {
    console.log("Starting HealthLake import job for datastore:", healthLakeDatastore.datastore_id);
    const response = await startFHIRImportJob(
      "My Import Job",
      healthLakeDatastore.datastore_id!!,
      healthLakeDatastore.s3_input!!,
      healthLakeDatastore.s3_output!!,
      outputs.custom.kmsKey,
      outputs.custom.dataAccessRoleArn);
    jobId = response.JobId;
    healthLakeDatastore.status = `Starting HealthLake import with job ID ${jobId}`;
    const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
    if (errors) {
      console.error("Error updating data store record", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    }
  }
  catch (error: any) {
    console.error("Error starting import job:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
  try {
    console.log("Waiting for healthLake import job to complete with jobId:", jobId);
    if (!jobId) {
      throw new Error("jobId is undefined");
    }

    const status = await waitFHIRImportJobComplete(healthLakeDatastore.datastore_id!, jobId, async (status, i) => {

      const importStatus = status === "FAILED" ? "IMPORT_FAILED" : status === "COMPLETED" ? "IMPORT_COMPLETED" : "IMPORT_IN_PROGRESS";
      console.log("Setting dynamodb record status ", importStatus);
      await updateHealthLakeDatastoreStatus(id ?? undefined, importStatus,
        `Waiting for HealthLake import job to complete: ${status} (iteration ${i})`);


    });
    console.log("HealthLake import completed with status:", status);
  }
  catch (error: any) {
    console.error("Error waiting for import job to complete:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }

  return JSON.stringify({ success: true, message: "Successfully completed FHIR import job", jobId });



}