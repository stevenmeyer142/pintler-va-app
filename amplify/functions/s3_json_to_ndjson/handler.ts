import type { Schema, HealthLakeDatastoreRecord} from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"
import {getS3Object, putS3Object} from './aws_s3_json_to_ndjson';

Amplify.configure(outputs);

const client = generateClient<Schema>();

export const handler: Schema["jsonToNdjson"]["functionHandler"] = async (event): Promise<string> => {
  const { bucket_name, json_file_key, ndjson_file_key } = event.arguments
  console.log("Calling jsonToNdjson with arguments:", event.arguments);

  if (!bucket_name || !json_file_key || !ndjson_file_key) {
    console.error("bucket_name, json_file_key, and ndjson_file_key are required");
    return JSON.stringify({ success: false, message: "bucket_name, json_file_key, and ndjson_file_key are required" });
  }

  try {
    console.log("Getting JSON object from S3");
    const jsonData = await getS3Object(bucket_name, json_file_key);
    if (!jsonData) {
      console.error("No data found in S3 for the provided key");
      return JSON.stringify({ success: false, message: "No data found in S3 for the provided key" });
    }

    // Get the items array from the JSON data
    const jsonObject = JSON.parse(jsonData);
    if (!jsonObject.entry || jsonObject.entry.length === 0) {
      console.error("No entry found in the JSON data");
      return JSON.stringify({ success: false, message: "No items found in the JSON data" });
    }
    if (!jsonObject.entry[0].resource) {
      console.error("No resource found in the first entry of the JSON data");
      return JSON.stringify({ success: false, message: "No resource found in the first entry of the JSON data" });
    }
    const patientRecord = jsonObject.entry[0].resource;
   const patientRecordString = JSON.stringify(patientRecord).replace('/n/g', ' ') + '\n';
    console.log("Putting NDJSON object back to S3");
    await putS3Object(bucket_name, ndjson_file_key, patientRecordString);

    return JSON.stringify({ success: true, message: "Successfully converted JSON to NDJSON", ndjson_file_key });
  } catch (error: any) {
    console.error("Error processing S3 objects:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}