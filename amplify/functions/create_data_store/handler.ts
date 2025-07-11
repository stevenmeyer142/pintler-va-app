import type { Schema, HealthLakeDatastoreRecord, FunctionResponse } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import { createHealthLakeDataStore, waitDataStoreActive } from './create_datastore_aws_health_lake';

Amplify.configure(outputs);

const client = generateClient<Schema>();


async function updateHealthLakeDatastoreStatus(id: string | undefined, status: string, description: string) {
    // if (!id) {
    //     console.error("id is required to update healthLake datastore status");
    //     return { success: false, message: "Error id is required for updateHealthLakeDatastoreStatus" };
    // }
    // var updateFields: any = {
    //     id: id,
    //     status: status,
    //     status_description: description
    // }

    // console.log("Extra keys:", extraKeys);
    // console.log("Extra values:", extraValues);
    // for (let i = 0; i < extraKeys.length; i++) {
    //     if (extraKeys[i] && extraValues[i]) {
    //         updateFields[extraKeys[i]] = extraValues[i];
    //     } else {
    //         console.warn(`Skipping extra key ${i} with missing key or value`);
    //     }
    // }
  //  console.log("Updating healthLake datastore status with fields:", updateFields);

    // const { errors } = await client.models.HealthLakeDatastore.update(updateFields);
    // if (errors) {
    //     console.error("Error updating healthLake datastore status", errors);
    //     return { success: false, message: errors[0].message };
    // }
    console.log("Updating healthLake datastore status with id:", id, "status:", status, "description:", description);
}

export const handler: Schema["createDataStore"]["functionHandler"] = async (event): Promise<string> => {
  const { id, name, s3_input, patient_icn } = event.arguments
  console.log("Calling CreateDataStore with arguments:", event.arguments);

  if (!id || !name || !s3_input || !patient_icn) {
    console.error("id, name, s3_input and patient_icn are required");
    JSON.stringify({ success: false, message: "id, name, s3_input and patient_icn are required" });
  }

  const s3_output = `${s3_input}_output`;

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


  var dataStoreId;
  try {
    console.log("Creating healthLake data store with name:", name);
    // const response = await createHealthLakeDataStore(String(name ?? "not set"));
    // console.log("HealthLake data store created successfully:", response);
    // dataStoreId = response.DatastoreId;
    dataStoreId = "dummy-datastore-id"; // Replace with actual call to createHealthLakeDataStore
    if (!dataStoreId) {
      console.error("Data store ID is undefined");
      return JSON.stringify({ success: false, message: "Data store ID is undefined" });
    }

const { errors } = await client.models.HealthLakeDatastore.update({
      id: id,
      datastore_id: dataStoreId,
      status: "CREATING",
      status_description: `Creating HealthLake data store with name: ${name}`,
    }
);
    if (errors) {
      console.error("Error updating healthLake datastore status", errors);
      return JSON.stringify({ success: false, message: errors[0].message });    
    }
  }
  catch (error: any) {
    console.error("Error creating healthLake data store:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
  // try {
  //   console.log("Waiting for healthLake data store to become active");
  //   if (!dataStoreId) {
  //     return JSON.stringify({ success: false, message: "dataStoreId is undefined" });
  //   }

  //   const status = await waitDataStoreActive(dataStoreId, (status) => {
  //     updateHealthLakeDatastoreStatus(id ?? undefined, HEALTHLAKE_DATASTORE_STATUS.CREATING,
  //       `Waiting for HealthLake data store to become active: data store status: ${status}`);
  //   });

  //   console.log("HealthLake data store status:", status);
  //   updateHealthLakeDatastoreStatus(id ?? undefined, HEALTHLAKE_DATASTORE_STATUS.CREATE_COMPLETED,
  //     `Wait finished: data store status:  ${status}`);
  // }
  // catch (error: any) {
  //   console.error("Error waiting for healthLake data active:", error);
  //   return JSON.stringify({ success: false, message: error.toString() });
  // }

return JSON.stringify({ success: true, message: "", dataStoreId: dataStoreId });
}