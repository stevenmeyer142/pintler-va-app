import { useEffect, useState } from "react";
import type { Schema, HealthLakeDatastoreRecord } from "../../amplify/data/resource"
import { parseFunctionResultJson } from "./UtilityFunctions";
import { useSearchParams } from "react-router-dom";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"



Amplify.configure(outputs);

const client = generateClient<Schema>()

/**
 * Converts a patient's JSON file in S3 to NDJSON format by invoking the backend query.
 * 
 * @param patientBucket - The name of the S3 bucket containing the patient's JSON file.
 * @param patientJSONObjectKey - The key of the JSON file in the S3 bucket.
 * @param patientNDJSONObjectKey - The key for the output NDJSON file in the S3 bucket.
 * @returns A promise that resolves when the conversion is complete.
 */
async function convertJsonToNdjson(
  patientBucket: string,
  patientJSONObjectKey: string,
  patientNDJSONObjectKey: string
): Promise<boolean> {
  try {
    console.log(`Converting JSON to NDJSON for bucket "${patientBucket}", JSON file "${patientJSONObjectKey}", and NDJSON file "${patientNDJSONObjectKey}"...`);
    const result = await client.queries.jsonToNdjson({
      bucket_name: patientBucket,
      json_file_key: patientJSONObjectKey,
      ndjson_file_key: patientNDJSONObjectKey,
    });

    const jsonResult = parseFunctionResultJson(result.data ?? "{success: false, message: 'No data returned'}");
    if (!jsonResult.success) {
      console.error("Failed to convert JSON to NDJSON:", jsonResult.message);
      return false;
    }

    // TODO: check result in result.success
    console.log("Conversion result:", result);
    return true;

  } catch (error: any) {
    console.error("Error converting JSON to NDJSON:", error);
    return false;
  }
}

/**
* Creates a new HealthLake data store for the specified patient and S3 input.
* 
* @param patientId - The patient ICN.
* @param s3_input - The S3 input URL for the patient's NDJSON file.
* @returns A promise that resolves when the data store is created.
*/
async function createDataStore(patientId: string, s3_input: string): Promise<boolean> {
  console.log("Creating HealthLake data store... s3_input:", s3_input);

  try {
    const result = await client.queries.createDataStore({
      id: s3_input,
      name: "test",
      s3_input: s3_input,
      patient_icn: patientId,
    });

    // This function often returns a "ExecutionTimeoutException" error, even though the lambda function is still running.
    // This may be an issue with REACT's handling of the async function, or it may be an Amplify issue.

    const jsonResult = parseFunctionResultJson(result.data ?? "{success: false, message: 'No data returned'}");
    if (!jsonResult.success) {
      console.error("Failed to parse JSON result for createDataStore:", jsonResult.message, "function result:", result);
      return false;
    }

    console.log("Create data store result:", result);

    return true;
  } catch (error: any) {
    console.error("Error creating HealthLake data store:", error);
    return false;
  }
}


function importPatentRecord(healthRecordID: string | null) {
  console.log("Importing patient with health record ID:", healthRecordID, "to HealthLake data store");
  if (!healthRecordID) {
    console.error("Health record ID is required to import patient record.");
    return;
  }
  window.location.href = `/import?healthRecordID=${healthRecordID}`;
}

/**
   * Creates a new HealthLake data store for the current patient, converts the patient's JSON file
   * to NDJSON format, and imports the NDJSON data into HealthLake.
   * 
   * This function orchestrates the full workflow of provisioning a data store and importing
   * patient data, intended to be called automatically when not in debug mode.
   * 
   * @async
   * @returns {Promise<void>} A promise that resolves when all operations are complete.
   */

/**
 * Orchestrates the creation of a HealthLake data store.
 * 
 * @param patientId - The patient ICN.
 * @param s3_input - The S3 input URL for the patient's NDJSON file.
 * @param patientBucket - The name of the S3 bucket containing the patient's JSON file.
 * @param patientJSONObjectKey - The key of the JSON file in the S3 bucket.
 * @param patientNDJSONObjectKey - The key for the output NDJSON file in the S3 bucket.
 */
async function createDataStoreAndConvertNdJSON(
  patientId: string,
  s3_input: string,
  patientBucket: string,
  patientJSONObjectKey: string,
  patientNDJSONObjectKey: string
): Promise<boolean> {
  console.log("Creating data store and importing to HealthLake...");
  if (!patientId || !s3_input || !patientBucket || !patientJSONObjectKey || !patientNDJSONObjectKey) {
    console.error("Patient ID, S3 input, or bucket information is missing.");
    return false;
  }
  var result = await convertJsonToNdjson(patientBucket, patientJSONObjectKey, patientNDJSONObjectKey);
  if (!result) {
    console.error("Failed to convert JSON to NDJSON.");
    return false;
  }
  result = await createDataStore(patientId, s3_input);
  if (!result) {
    console.error("Failed to create HealthLake data store.");
    return false;
  }
  console.log("Data store created and NDJSON imported successfully.");
  return true;
}

function ReturnToPatientsPage() {
  console.log("Returning to Patients Page");
  window.location.href = "/";
}

export function CreateDataStorePage() {
  const [CurrentDataStoreRecord, setCurrentDataStoreRecord] = useState<Schema["HealthLakeDatastore"]["type"] | undefined>(undefined);
  const [searchParams] = useSearchParams();

  var patientId = searchParams.get("patientId") || "Not provided";
  const patientBucket = searchParams.get("patientBucket") || undefined;
  const patientJSONObjectKey = searchParams.get("patientObjectKey") || undefined;

  var status = "Not provided";

  if (!patientBucket || !patientJSONObjectKey) {
    console.error("Patient bucket or object key not provided in search parameters.");
    return <div>Error: Patient bucket or object key not provided.</div>;
  }

  const patientNDJSONObjectKey = patientJSONObjectKey.replace(".json", ".ndjson");
  const s3_input = `s3://${patientBucket}/${patientNDJSONObjectKey}`;
  const health_record_id = s3_input;
  ``


  async function CreateTheDataStore() {
    console.log("Creating new DynamoDB healthLake data store record with s3_input:", s3_input, "and patientId:", patientId);
    const s3_output = `${s3_input}_output`;

    const healthLakeDatastore: HealthLakeDatastoreRecord =
    {
      s3_input: String(s3_input),
      s3_output: s3_output,
      id: health_record_id,
      patient_icn: String(patientId),
      name: 'test',
      datastore_id: null,
      status: "Initialized",
      status_description: "Data store initialized, ready for creation",
    };
    try {
      client.models.HealthLakeDatastore.create(healthLakeDatastore).then(async ({ errors }) => {
        if (errors) {
          console.error("Error creating DynamoDB data store record", errors);
        }
        else {
          console.log("DynamoDB data store record created successfully:", healthLakeDatastore);
          if (
            typeof patientId === "string" &&
            typeof s3_input === "string" &&
            typeof patientBucket === "string" &&
            typeof patientJSONObjectKey === "string" &&
            typeof patientNDJSONObjectKey === "string"
          ) {
            const success = await createDataStoreAndConvertNdJSON(patientId, s3_input, patientBucket, patientJSONObjectKey, patientNDJSONObjectKey);
            const newStatus = success ? "ACTIVE" : "CREATE_FAILED";

            console.log("Data store creation finished with status:", newStatus, "updating status in DynamoDB...");
            await client.models.HealthLakeDatastore.update({
              id: health_record_id,
              status: newStatus,
              status_description: `Data store create finished with status: ${newStatus}`,
            }).then((result) => {
              if (result.errors) {
                console.error("Error updating healthLake datastore status", result.errors);
              }
            });

          } else {
            console.error("Required parameters for createDataStoreAndConvertNdJSON are missing or invalid.");
          }
        }
      });
    }
    catch (error) {
      console.error("Error creating HealthLakeDatastore record:", error);
    }
  }


  useEffect(() => {
    client.models.HealthLakeDatastore.observeQuery({
      filter: {
        id: { eq: health_record_id }
      }
    }).subscribe({

      next: (data) => {
        if (data.items.length > 0) {
          setCurrentDataStoreRecord(data.items[0]);
        }
        else {
          console.warn("No HealthLake Datastore record found for the provided health_record_id.");
          setCurrentDataStoreRecord(undefined)
        }
      },
    });

  }, []);

  return (
    <div>
      <div>
        <h1>Patient Details</h1>
        <p><strong>Status:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status ? CurrentDataStoreRecord.status : status}</p>
        <p><strong>Status Description:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status_description ? CurrentDataStoreRecord.status_description : "undefined"}</p>
        <p><strong>Patient ICN:</strong> {patientId}</p>
        <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : "undefined"}</p>
        <p><strong>HealthLake Data Store ID:</strong> {CurrentDataStoreRecord != undefined && CurrentDataStoreRecord.datastore_id != undefined ? CurrentDataStoreRecord.datastore_id : "undefined"}</p>
        <div style={{ margin: "10px 0" }}></div>
        {!CurrentDataStoreRecord && (
          <div>
            <button
              onClick={() => CreateTheDataStore()}
              style={{ marginBottom: "10px", display: "block" }}
            >
              Create Data Store
            </button>
          </div>
        )}

        <div>
          <button
            onClick={() => importPatentRecord(CurrentDataStoreRecord?.id ?? null)}
            style={{ marginBottom: "10px", display: "block" }}
            disabled={
              !CurrentDataStoreRecord || (
              CurrentDataStoreRecord.status !== "ACTIVE" &&
              CurrentDataStoreRecord.status !== "CREATING") // CREATING isa hack to work around a lambda timeout issue.
            }
          >
            Import Patient Record
          </button>
        </div>

        <div>
          <button
            onClick={ReturnToPatientsPage}
            style={{ marginBottom: "10px", display: "block" }}
          >
            Return to Patients Page
          </button>
        </div>
      </div>
    </div>
  );
}

