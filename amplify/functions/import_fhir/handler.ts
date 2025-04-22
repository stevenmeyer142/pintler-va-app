import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import {createHealthLakeDataStore, waitDataStoreActive} from './aws_health_lake_frontend';

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["importFHIR"]["functionHandler"] = async (event): Promise<string | null> => {
  const { s3_input, patient_icn } = event.arguments
  console.log("Calling importFHIR with arguments:", event.arguments);

  if (!s3_input || !patient_icn) {
    console.error("s3_input and patient_icn are required");
    return "s3_input and patient_icn are required";
  }

  const { data: healthLakeDatastoreResult, errors } = await client.models.HealthLakeDatastore.get({
    id: s3_input,
  });
  if (errors) {
    console.error("Error getting healhLake data", errors);
    return errors[0].message;
  }
  interface HealthLakeDatastore {
    s3_input: string;
    id: string;
    patient_icn: string;
    name: string;
    status: string;
  }

  var healthLakeDatastore: HealthLakeDatastore;
  // var healthLakeDatastore  =
  // {
  //   s3_input: "undefinee",
  //   id: "undefinee",
  //   patient_icn: "undefinee",
  //   name: 'test',
  //   status: 'test',
  // };
  if (!healthLakeDatastoreResult) {
    console.log("Creating new healthLake data store");
    healthLakeDatastore =
    {
      s3_input: s3_input,
      id: s3_input,
      patient_icn: patient_icn,
      name: 'test',
      status: 'test',
    }
    {
      const { errors, data: newData } = await client.models.HealthLakeDatastore.create(healthLakeDatastore);
      if (errors) {
        console.error("Error creating data store", errors);
        return errors[0].message;
      }
    }
  }
  else {
    console.log("Updating existing healthLake data store");
    if (
      !healthLakeDatastoreResult.s3_input ||
      !healthLakeDatastoreResult.id ||
      !healthLakeDatastoreResult.patient_icn ||
      !healthLakeDatastoreResult.name ||
      !healthLakeDatastoreResult.status
    ) {
      throw new Error("HealthLakeDatastoreResult contains null values");
    }
    healthLakeDatastore = {
      s3_input: healthLakeDatastoreResult.s3_input,
      id: healthLakeDatastoreResult.id,
      patient_icn: healthLakeDatastoreResult.patient_icn,
      name: healthLakeDatastoreResult.name,
      status: healthLakeDatastoreResult.status,
    };
  }

  var dataStoreId;
  try {
    console.log("Creating healthLake data store");
    const response = await createHealthLakeDataStore("Test data store name");
    dataStoreId = response.DatastoreId;
    console.log("HealthLake data store created successfully:", response);
    healthLakeDatastore.status = `Start create of datastore with ID ${dataStoreId}`;
   const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
    if (errors) {
      console.error("Error updating data store", errors);
      return errors[0].message;
    } 
  }
  catch (error : any) {
    console.error("Error creating healthLake data store:", error);
    return error.toString();
  }
  try {
    console.log("Waiting for healthLake data store to become active");
    if (!dataStoreId) {
      throw new Error("dataStoreId is undefined");
    }
    
    const status = await waitDataStoreActive(dataStoreId, (status) => {
      healthLakeDatastore.status = `Status: ${status}`;
      client.models.HealthLakeDatastore.update(healthLakeDatastore);
    });
    console.log("HealthLake data store status:", status);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  catch (error : any) {
    console.error("Error waiting for healthLake data active:", error);
    return error.toString();
  }
  // for (let i = 1; i <= 10; i++) {
  //   healthLakeDatastore.status = `status ${i}`;
  //   const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
  //   if (errors) {
  //     console.error("Error updating data store", errors);
  //     return errors[0].message;
  //   }
  //   await new Promise((resolve) => setTimeout(resolve, 2000));
  // }
  return "Operation completed successfully";



}