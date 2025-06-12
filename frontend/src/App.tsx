import { useEffect, useState } from "react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import type { Schema } from "../../amplify/data/resource"
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"

Amplify.configure(outputs);

const client = generateClient<Schema>()

/**
 * Deletes an S3 bucket and all its contents by invoking the `deleteBucket` query on the backend.
 * 
 * @param bucketName - The name of the S3 bucket to delete.
 * @returns A promise that resolves when the bucket and its contents are deleted.
 */
async function deleteS3BucketAndContents(bucketName: string) {
  try {
    console.log(`Deleting bucket "${bucketName}" and objects...`);
    const result = await client.queries.deleteBucket({
      bucket_name: bucketName,
    });
    console.log("Bucket with result:", result);
  }
  catch (error) {
    console.error("Error deleting bucket:", error);
  }
}


/**
 * Initiates the VA login flow by setting session values and redirecting to the VA authentication endpoint.
 */
function goToVA() {
  const requestBody = {
    main_location: window.location.href,
    kms_key: outputs.custom.kmsKey,
  };

  fetch(`${outputs.custom.gatewayURL}set_session_values`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })
    .then((response) => {
      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
      }
      else {
        window.location.href = `${outputs.custom.gatewayURL}auth`;
      }
    })
    .catch((error) => {
      console.error("Error during fetch:", error);
    });


}


/**
 * The main application component. Handles routing and authentication.
 * 
 * @returns The root React component for the application.
 */
function App() {
  console.log("App component rendered");

  const { signOut } = useAuthenticator();


  /**
   * Navigates to the patient display page with hardcoded patient information for debugging purposes.
   */
  function debugDisplayPatient() {

    const patientId = "5000335";
    const patientBucket = "va-patient-icn-5000335-38ed5ac2-96c7-4061-9171-da7ddf2d82cd";
    const patientJSONObjectKey = "patient_record.json";


    window.location.href = `/display_patient?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientJSONObjectKey}`;
  }

  /**
   * Displays patient details and provides actions for converting, importing, and managing HealthLake data stores.
   * 
   * @returns The React component for displaying patient details and HealthLake data store actions.
   */
  function DisplayPatient() {
    const [HealthLakeDatastoresArray, setHealthLakeDatastoresArray] = useState<Array<Schema["HealthLakeDatastore"]["type"]>>([]);
    const [CurrentDataStoreRecord, setCurrentDataStoreRecord] = useState<Schema["HealthLakeDatastore"]["type"] | undefined>(undefined);
    const [searchParams] = useSearchParams();
    var patientId = searchParams.get("patientId") || "Not provided";
    const patientBucket = searchParams.get("patientBucket") || "Not provided";
    const patientJSONObjectKey = searchParams.get("patientObjectKey") || "Not_provided.json";
    const patientNDJSONObjectKey = patientJSONObjectKey.replace(".json", ".ndjson");
    var s3_input = `s3://${patientBucket}/${patientNDJSONObjectKey}`;
    useEffect(() => {
      client.models.HealthLakeDatastore.observeQuery().subscribe({
        next: (data) => setHealthLakeDatastoresArray([...data.items]),
      })
      if (HealthLakeDatastoresArray.length > 0) {
        if (CurrentDataStoreRecord === undefined) {
          setCurrentDatastoreRecordIndex(0);
        }
        else {
          var recordIndex = HealthLakeDatastoresArray.findIndex(record => record.id === CurrentDataStoreRecord?.id);
          if (recordIndex === -1) {
            setCurrentDatastoreRecordIndex(0);
          }
          else {
            setCurrentDatastoreRecordIndex(recordIndex);
          }
        }
      }
      else {
        setCurrentDataStoreRecord(undefined);
      }

    });

    /**
   * Creates a new HealthLake data store for the specified patient and S3 input.
   * 
   * @param patientId - The patient ICN.
   * @param s3_input - The S3 input URL for the patient's NDJSON file.
   * @returns A promise that resolves when the data store is created.
   */
    async function createDataStore(patientId: string, s3_input: string) {
      console.log("Importing to HealthLake... s3_input:", s3_input);

      const result = await client.queries.createDataStore({
        id: s3_input,
        name: "test",
        s3_input: s3_input,
        patient_icn: patientId,
      });

      console.log("Create data store result:", result);
    }

    /**
     * Sets the current HealthLake data store record by index.
     * 
     * @param index - The index of the data store record to set as current.
     * @returns A promise that resolves when the current record is set.
     */
    async function setCurrentDatastoreRecordIndex(index: number) {
      console.log("Setting current datastore record index to:", index);
      if (index >= 0 && index < HealthLakeDatastoresArray.length) {
        const currentRecord = HealthLakeDatastoresArray[index];
        console.log("Current datastore record:", currentRecord);
        setCurrentDataStoreRecord(currentRecord);
        patientId = currentRecord.patient_icn || "Not provided";
        s3_input = currentRecord.s3_input || "Not provided";

      } else {
        console.log("Index out of bounds for HealthLakeDatastoresArray");
        setCurrentDataStoreRecord(undefined);
        patientId = "Not provided";
        s3_input = "Not provided";
      }
    }

    /**
     * Converts a patient's JSON file in S3 to NDJSON format by invoking the backend query.
     * 
     * @returns A promise that resolves when the conversion is complete.
     */
    async function convertJsonToNdjson() {
      try {
        console.log(`Converting JSON to NDJSON for bucket "${patientBucket}", JSON file "${patientJSONObjectKey}", and NDJSON file "${patientNDJSONObjectKey}"...`);
        const result = await client.queries.jsonToNdjson({
          bucket_name: patientBucket,
          json_file_key: patientJSONObjectKey,
          ndjson_file_key: patientNDJSONObjectKey,
        });

        // TODO: check result in result.success
        console.log("Conversion result:", result);

      } catch (error) {
        console.error("Error converting JSON to NDJSON:", error);
      }
    }

    /**
     * Imports FHIR data from the specified S3 input into HealthLake.
     * 
     * @param s3_input - The S3 input URL for the NDJSON file.
     * @returns A promise that resolves when the import is complete.
     */
    async function importToHealthLake(s3_input: string) {
      console.log("Importing to HealthLake... s3_input:", s3_input);

      const result = await client.queries.importFHIR({
        id: s3_input,
      });

      console.log("Import FHIR result:", result);
    }
    return (
      <div>
        <div>
          <h1>Patient Details</h1>
          <p><strong>Status:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status ? CurrentDataStoreRecord.status : "undefined"}</p>
          <p><strong>Patient ICN:</strong> {patientId}</p>
          <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : "undefined"}</p>
          <p><strong>HealthLake Data Store ID:</strong> {CurrentDataStoreRecord != undefined && CurrentDataStoreRecord.datastore_id != undefined ? CurrentDataStoreRecord.datastore_id : "undefined"}</p>
          <p><button onClick={() => convertJsonToNdjson()}>Convert To NDJSON</button></p>
          <p><button onClick={() => createDataStore(patientId, s3_input)}>Create Datastore</button></p>
          <p><button onClick={() => importToHealthLake(s3_input)}>Import To Healthlake</button></p>
          <p><button onClick={() => deleteS3BucketAndContents(patientBucket)}>Delete Bucket</button></p>
        </div>
        <div>
          <ul>
            {HealthLakeDatastoresArray.map((HealthLakeDatastore, index) => (

              <li
                onClick={() => HealthLakeDatastore.id && setCurrentDatastoreRecordIndex(index)}
                key={HealthLakeDatastore.id}>{HealthLakeDatastore.s3_input} {HealthLakeDatastore.status}</li>
            ))}
          </ul>
        </div>
      </div>


    );
  }

  /**
   * Displays the main application page with login, debug, and sign out options.
   * 
   * @returns The React component for the main page.
   */

  function DisplayMain() {
    console.log("DisplayMain");
    return (
      <main>
        <button onClick={goToVA}>Login to VA</button>
        <div style={{ margin: "10px 0" }}></div>
        <button onClick={debugDisplayPatient}>Debug HealthLakeImport</button>
        <div style={{ margin: "10px 0" }}></div>
        <button onClick={signOut}>Sign out</button>
      </main>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DisplayMain />} />
        <Route path="/display_patient" element={<DisplayPatient />} />
      </Routes>
    </Router>
  );
}

export default App;
