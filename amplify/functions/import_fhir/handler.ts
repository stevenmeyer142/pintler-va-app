import type { Handler } from 'aws-lambda';
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["importFHIR"]["functionHandler"] = async (event): Promise<string | null> => {
  const { s3_input, patient_icn } = event.arguments
  console.log("Calling importFHIR with arguments:", event.arguments);
  await client.models.HealthLakeDatastore

  const { data: healthLakeDatastoreResult, errors } = await client.models.HealthLakeDatastore.get({
    id: s3_input,
  });
  if (errors) {
    console.error("Error getting healhLake data", errors);
    return errors[0].message;
  }
  var healthLakeDatastore;
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
    healthLakeDatastore = healthLakeDatastoreResult;
  }
  for (let i = 1; i <= 10; i++) {
    healthLakeDatastore.status = `status ${i}`;
    const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
    if (errors) {
      console.error("Error updating data store", errors);
      return errors[0].message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return "Operation completed successfully";



}