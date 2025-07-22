import type { Schema, HealthLakeDatastoreRecord } from "../../data/resource"
import { deleteBucketAndObjects } from './delete_bucket_aws_s3';
import { deleteHealthLakeDataStore, waitDataStoreDeleted } from './delete_datastore_aws_health_lake';

import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from "../../../amplify_outputs.json"

Amplify.configure(outputs);

const client = generateClient<Schema>();



export const handler: Schema["deleteDatastore"]["functionHandler"] = async (event: any) => {

  const { health_record_id } = event.arguments

  try {
    console.log("Calling deleteDatastore with arguments:", event.arguments);
    if (!health_record_id) {
      console.error("health_record_id is required");
      return JSON.stringify({ success: false, message: "health_record_id is required" });
    }

    const { data: healthLakeDatastoreResult, errors } = await client.models.HealthLakeDatastore.get({
      id: health_record_id,
    });
    if (errors) {
      console.error("Error getting healhLake data", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    }

    var healthLakeDatastore: HealthLakeDatastoreRecord;
    if (!healthLakeDatastoreResult) {
      console.error("Error missing DynamoHealthLakeDatastoreRecord with id", health_record_id);
      return JSON.stringify({ success: false, message: `Error missing HealthLakeDatastore with id ${health_record_id}` });
    }
    else {
      console.log("Found existing DynamoDB healthLake data store record", healthLakeDatastoreResult);
      healthLakeDatastore = healthLakeDatastoreResult;
    }

    const s3InputUrl = healthLakeDatastore.s3_input;
    if (!s3InputUrl) {
      console.error("s3_input URL is null or undefined");
      return JSON.stringify({ success: false, message: "s3_input URL is null or undefined" });
    }
    const bucketNameMatch = s3InputUrl.match(/s3:\/\/([^/]+)/);
    if (!bucketNameMatch || !bucketNameMatch[1]) {
      console.error("Could not extract bucket name from s3_input URL:", s3InputUrl);
      return JSON.stringify({ success: false, message: "Could not extract bucket name from s3_input URL" });
    }
    const bucket_name = bucketNameMatch[1];
    console.log("Extracted bucket name:", bucket_name);
    await deleteBucketAndObjects(bucket_name);
  }
  catch (error: any) {
    console.error("Error deleting bucket:", error);
    return JSON.stringify({ success: false, message: `Error deleting bucket: ${error.message}` });
  }

  try {
    const dataStoreId = healthLakeDatastore.datastore_id;
    if (!dataStoreId) {
      console.error("datastore_id is null or undefined");
      return JSON.stringify({ success: false, message: "datastore_id is null or undefined" });
    }

    const result = await deleteHealthLakeDataStore(dataStoreId);
    console.log("HealthLake data store deletion initiated:", result);
    const isDeleted = await waitDataStoreDeleted(dataStoreId, (status) => {
      console.log("Updating healthLake datastore status in DynamoDB to CREATING");
      client.models.HealthLakeDatastore.update({
        id: health_record_id,
        status: "DELETING",
        status_description: `Waiting HealthLake data store with name: ${name} to become delete`,
      }).then((result) => {
        if (result.errors) {
          console.error("Error updating healthLake datastore status", result.errors);
        }
      });
    });
    if (!isDeleted) {
      console.error("HealthLake data store deletion failed or timed out");
      return JSON.stringify({ success: false, message: "HealthLake data store deletion failed or timed out" });
    }
    const { errors } = await client.models.HealthLakeDatastore.delete({
      id: health_record_id,
    });
    if (errors) {
      console.error("Error deleting DynamoDB record", errors);
      return JSON.stringify({ success: false, message: errors[0].message });
    }

    return JSON.stringify({ success: true, message: `Data store successfully deleted` });
  } catch (error: any) {
    console.error("Error deleting HealthLake data store:", error);
    return JSON.stringify({ success: false, message: `Error deleting HealthLake data store: ${error.message}` });
  }
}