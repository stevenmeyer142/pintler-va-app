import type { Schema, HealthLakeDatastoreRecord } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import { startFHIRImportJob, waitFHIRImportJobComplete } from './import_fhir_aws_health_lake';

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["importFHIR"]["functionHandler"] = async (event): Promise<string | null> => {
  const { id  } = event.arguments
  console.log("Calling HealthLakeDatastore:", event.arguments);

  if (!id ) {
    console.error("id is required");
    return "id is required";
  }

  const { data: healthLakeDatastoreResult, errors } = await client.models.HealthLakeDatastore.get({
    id: id,
  });
  if (errors) {
    console.error("Error getting healhLake data", errors);
    return errors[0].message;
  }
 
  var healthLakeDatastore: HealthLakeDatastoreRecord;
  if (!healthLakeDatastoreResult) {
    console.error("Error missing DynamoHealthLakeDatastoreRecord with id", id);
    return JSON.stringify({ success: false, message: `Error missing HealthLakeDatastore with id ${id}`});
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
    console.log("Creating healthLake data store");
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
      console.error("Error updating data store", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    }
  }
  catch (error: any) {
    console.error("Error starting import job:", error);
    return JSON.stringify({ success: false, message: error.toString()});
  }
  try {
    console.log("Waiting for healthLake data store to become active");
    if (!jobId) {
      throw new Error("jobId is undefined");
    }

    const status = await waitFHIRImportJobComplete(healthLakeDatastore.datastore_id!, jobId, (status) => {
      healthLakeDatastore.status = `Waiting for HealthLake data store to become active: data store status: ${status}`;
      client.models.HealthLakeDatastore.update(healthLakeDatastore);
    });
    healthLakeDatastore.status = `Wait finished: data store status:  ${status}`;
    client.models.HealthLakeDatastore.update(healthLakeDatastore);
    console.log("HealthLake data store status:", status);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  catch (error: any) {
    console.error("Error waiting for healthLake data active:", error);
    return error.toString();
  }
  
  return "Operation completed successfully";



}