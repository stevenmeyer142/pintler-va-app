import type { Schema, HealthLakeDatastoreRecord} from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import {createHealthLakeDataStore, waitDataStoreActive} from './create_datastore_aws_health_lake';

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["createDataStore"]["functionHandler"] = async (event): Promise<string> => {
  const { id, name, s3_input, patient_icn } = event.arguments
  console.log("Calling CreateDataStore with arguments:", event.arguments);

  if (!id || !name || !s3_input || !patient_icn) {
    console.error("id, name, s3_input and patient_icn are required");
    JSON.stringify({ success: false, message: "id, name, s3_input and patient_icn are required"});
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
    console.log("Creating new DynamoDB healthLake data store record");
    healthLakeDatastore =
    {
      s3_input: String(s3_input),
      s3_output: s3_output,
      id: String(id),
      patient_icn: String(patient_icn),
      name: 'test',
      datastore_id : "Not set",
      status: 'Not set',
       }
    {
      const { errors, data: newData } = await client.models.HealthLakeDatastore.create(healthLakeDatastore);
      if (errors) {
        console.error("Error creating DynamoDB data store record", errors);
        return JSON.stringify({ success: false, message: errors[0].message });
      }
    }
  }
  else {
    console.log("Updating existing DynamoDB healthLake data store");
    if (
      !healthLakeDatastoreResult.s3_input ||
      !healthLakeDatastoreResult.id ||
      !healthLakeDatastoreResult.patient_icn ||
      !healthLakeDatastoreResult.name ||
      !healthLakeDatastoreResult.status
    ) {
      console.error("HealthLakeDatastoreResult contains null values", healthLakeDatastoreResult);
      return JSON.stringify({ success: false, message: "HealthLakeDatastoreResult contains null values"});
    }
    healthLakeDatastore = healthLakeDatastoreResult;
  }

  var dataStoreId;
  try {
    console.log("Creating healthLake data store with name:", name);
    const response = await createHealthLakeDataStore(String(name ?? "not set"));
    dataStoreId = response.DatastoreId;
    console.log("HealthLake data store created successfully:", response);
    healthLakeDatastore.status = `Start create of datastore with ID ${dataStoreId}`;
    healthLakeDatastore.datastore_id = String(dataStoreId);
   const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
    if (errors) {
      console.error("Error updating data store", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    } 
  }
  catch (error : any) {
    console.error("Error creating healthLake data store:", error);
    return error.toString();
  }
  try {
    console.log("Waiting for healthLake data store to become active");
    if (!dataStoreId) {
      return JSON.stringify({ success: false, message:"dataStoreId is undefined"});
    }
    
    const status = await waitDataStoreActive(dataStoreId, (status) => {
      healthLakeDatastore.status = `Waiting for HealthLake data store to become active: data store status: ${status}`;
      client.models.HealthLakeDatastore.update(healthLakeDatastore);
    });
    healthLakeDatastore.status = `Wait finished: data store status:  ${status}`;
    client.models.HealthLakeDatastore.update(healthLakeDatastore); 
    console.log("HealthLake data store status:", status);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  catch (error : any) {
    console.error("Error waiting for healthLake data active:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
  
    return JSON.stringify({ success: true, message: "Successs", dataStoreId: dataStoreId });



}