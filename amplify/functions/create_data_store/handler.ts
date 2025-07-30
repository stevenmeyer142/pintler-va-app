import type { Schema, HealthLakeDatastoreRecord } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import { createHealthLakeDataStore, waitDataStoreActive } from './create_datastore_aws_health_lake';
import { DatastoreStatus,} from "@aws-sdk/client-healthlake";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["createDataStore"]["functionHandler"] = async (event): Promise<string> => {
  const { id, name, s3_input, patient_icn } = event.arguments
  console.log("Calling CreateDataStore with arguments:", event.arguments);

  if (!id || !name || !s3_input || !patient_icn) {
    console.error("id, name, s3_input and patient_icn are required");
    JSON.stringify({ success: false, message: "id, name, s3_input and patient_icn are required" });
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
    console.error("Missing healthLakeDatastoreResult");
    return JSON.stringify({ success: false, message: "Missing healthLakeDatastoreResult" });
  }

  console.log("Updating existing DynamoDB healthLake data store");
  if (
    !healthLakeDatastoreResult.s3_input ||
    !healthLakeDatastoreResult.id ||
    !healthLakeDatastoreResult.patient_icn ||
    !healthLakeDatastoreResult.name
  ) {
    console.error("HealthLakeDatastoreResult contains null values", healthLakeDatastoreResult);
    return JSON.stringify({ success: false, message: "HealthLakeDatastoreResult contains null values" });
  }
  healthLakeDatastore = healthLakeDatastoreResult;

  var dataStoreId: string;

  try {
    console.log("Creating healthLake data store with name:", name);
    if (!name) {
      console.error("Name is required to create healthLake data store");
      return JSON.stringify({ success: false, message: "Name is required to create healthLake data store" });
    }

    const response = await createHealthLakeDataStore(String(name));
    console.log("HealthLake data store created successfully:", response);
    if (!response.DatastoreId) {
      console.error("Data store ID is undefined");
      return JSON.stringify({ success: false, message: "Data store ID is undefined" });
    }

    dataStoreId = response.DatastoreId;

    const { errors } = await client.models.HealthLakeDatastore.update({
      id: id,
      datastore_id: dataStoreId,
      status: "CREATING",
      status_description: `Creating HealthLake data store with name: ${name}`,
    });

    if (errors) {
      console.error("Error updating healthLake datastore status", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    }
  }
  catch (error: any) {
    console.error("Error creating healthLake data store:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
  try {
    console.log("Waiting for healthLake data store to become active");
    if (!dataStoreId) {
      return JSON.stringify({ success: false, message: "dataStoreId is undefined" });
    }

    const success = await waitDataStoreActive(dataStoreId, async (status, i) => {
      const newStatus = status === DatastoreStatus.CREATING ? "CREATING" : status === DatastoreStatus.ACTIVE ? "ACTIVE" : "CREATE_FAILED";
      console.log("Updating healthLake datastore status in DynamoDB to", newStatus);
      await client.models.HealthLakeDatastore.update({
      id: id,
      status: newStatus,
      status_description: `Waiting HealthLake data store creating with status ${status} with iteration ${i}`,
      }).then((result) => {
      if (result.errors) {
        console.error("Error updating healthLake datastore status", result.errors);
      }
      else {
        console.log("HealthLake datastore status updated successfully");
      }
      });
    });

    if (!success) {
      console.error("HealthLake data store did not become active");
      return JSON.stringify({ success: false, message: "HealthLake data store did not become active" });
    }
    console.log("HealthLake data store is active");
  }
  catch (error: any) {
    console.error("Error waiting for healthLake data active:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }

  return JSON.stringify({ success: true, message: "", dataStoreId: dataStoreId });
}