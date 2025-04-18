import type { Handler } from 'aws-lambda';
import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
// import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
// import { env } from '$amplify/env/ImportFHIR'; // replace with your function name

// const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);

// Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: Schema["importFHIR"]["functionHandler"] = async (event): Promise<string | null> => {
  const { s3_input, patient_icn } = event.arguments

  var healthLakeDatastore =
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
      console.error(errors);
      return errors[0].message;
    }
  }
  for (let i = 1; i <= 10; i++) {
    healthLakeDatastore.status = `status ${i}`;
    const { errors } = await client.models.HealthLakeDatastore.update(healthLakeDatastore);
    if (errors) {
      console.error(errors);
      return errors[0].message;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return "Operation completed successfully";



}