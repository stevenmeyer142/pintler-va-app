/**
   * React component that displays and manages a patient's HealthLake data store records.
   * 
   * This component retrieves patient information from URL search parameters, manages HealthLake
   * data store records, and provides functionality to convert patient JSON files to NDJSON,
   * create new HealthLake data stores, import FHIR data, and delete patient records.
   * 
   * In debug mode, additional controls are rendered for manual operations and inspection.
   * 
   * @component
   */

import { useEffect, useState } from "react";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Route, Routes} from "react-router-dom";
import type { Schema} from "../../amplify/data/resource"
import {CreateDataStorePage} from "./CreateDataStore"
import { ImportToDataStorePage } from "./ImportToDataStore";
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
    const { signOut } = useAuthenticator();


  /**
   * Navigates to the patient display page with hardcoded patient information for debugging purposes.
   */
  function debugCreateDataStore() {

    const patientId = "5000335";
    const patientBucket = "va-patient-icn-5000335-6a0a3037-ea43-4f87-aff8-b944a79bcde8";
    const patientJSONObjectKey = "patient_record.json";


    window.location.href = `/create_datastore?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientJSONObjectKey}`;
  }



  /**
   * Displays patient details and provides actions for converting, importing, and managing HealthLake data stores.
   * 
   * @returns The React component for displaying patient details and HealthLake data store actions.
   */

  function DisplayPatient() {
    const [HealthLakeDatastoresArray, setHealthLakeDatastoresArray] = useState<Array<Schema["HealthLakeDatastore"]["type"]>>([]);
    const [CurrentDataStoreRecord, setCurrentDataStoreRecord] = useState<Schema["HealthLakeDatastore"]["type"] | undefined>(undefined);
    // const [InitialId, setInitialId] = useState<string | undefined>(undefined);
    // // const [searchParams] = useSearchParams();
  
     var patientId =  "Not provided";
    const patientBucket = "Delete me";
    // // const patientJSONObjectKey = searchParams.get("patientObjectKey") || undefined;
    // // const debugMode = searchParams.get("debugMode") === "true";

    var status = "Not provided";

    // // if (!patientBucket || !patientJSONObjectKey) {
    // //   console.error("Patient bucket or object key not provided in search parameters.");
    // //   return <div>Error: Patient bucket or object key not provided.</div>;
    // // }

    // // const patientNDJSONObjectKey = patientJSONObjectKey.replace(".json", ".ndjson");
  
    // // const [LastImportedDataStoreID, setLastImportedDataStoreID] = useState<string | undefined>(undefined);

    // // Start HealthDatastore creation when this page is initially loaded. Not when it is updated.
    // // This is to prevent the datastore from being created multiple times when the page is reloaded
    // // or when the component is re-rendered.

  //  if (InitialId === undefined) {
  //   useEffect(() => { 
  //        console.log("Creating new DynamoDB healthLake data store record");
  //   const s3_output = `${s3_input}_output`;
  //   setInitialId(s3_input);
  //   const healthLakeDatastore: HealthLakeDatastoreRecord =
  //   {
  //     s3_input: String(s3_input),
  //     s3_output: s3_output,
  //     id: String(s3_output),
  //     patient_icn: String(patientId),
  //     name: 'test',
  //     datastore_id : null,
  //     status: "",
  //     status_description: "Data store initialized, ready for creation",
  //          };
  //         client.models.HealthLakeDatastore.create(healthLakeDatastore).then(({ errors}) => {
  //           if (errors) {
  //             console.error("Error creating DynamoDB data store record", errors);
  //           }
  //           else {
  //             createDataStoreAndImport();
  //           }
  //         });

  //    }, []); 
  //      }
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
    
    }

    useEffect(() => {
      client.models.HealthLakeDatastore.observeQuery().subscribe({
        next: (data) => setHealthLakeDatastoresArray([...data.items]),
      })

    }, []);

    const debugMode = true; // For testing purposes, set to true to enable debug mode

      return (
        <div>
          <div>
            <h1>Patient Details</h1>
            <p><strong>Status:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status ? CurrentDataStoreRecord.status : status}</p>
             <p><strong>Status message:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status_description ? CurrentDataStoreRecord.status_description : ''}</p>
           <p><strong>Patient ICN:</strong> {patientId}</p>
            <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : "undefined"}</p>
          <p>{debugMode && (
            <button onClick={() => debugCreateDataStore()}>Debug Create Data Store</button>
          )}</p>
             <p><button onClick={() => goToVA}>Import VA Patient To Healthlake</button></p>
            <p><button onClick={() => deleteS3BucketAndContents(patientBucket)}>Delete Patient Record</button></p>
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
          <div style={{ margin: "10px 0" }}></div>
        <button onClick={signOut}>Sign out</button>      
        </div>
      );
      }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DisplayPatient />} />
        <Route path="/create_datastore" element={<CreateDataStorePage />} />
        <Route path="/import" element={<ImportToDataStorePage />} />
      </Routes>
    </Router>
  );
}

export default App;
