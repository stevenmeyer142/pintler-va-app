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
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import type { Schema } from "../../amplify/data/resource"
import { CreateDataStorePage } from "./CreateDataStore"
import { ImportToDataStorePage } from "./ImportToDataStore";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"

Amplify.configure(outputs);

const client = generateClient<Schema>()

/**
 * Deletes a HealthLake data store and its associated resourcs by its ID. 
 * 
 * @param id - The ID of the S3 bucket to delete.
 * @returns A promise that resolves when the bucket and its contents are deleted.
 */
async function deleteDataStore(id: string) {
  try {
    console.log(`Deleting data store with DyanamoDB recorde id "${id}"`);
    const result = await client.queries.deleteDatastore({
      health_record_id: id,
    });
    console.log("Delete data store result", result);
  }
  catch (error) {
    console.error("Error deleting data store:", error);
  }
}


/**
 * Initiates the VA login flow by setting session values and redirecting to the VA authentication endpoint.
 */
function goToVA() {
  console.log("Redirecting to VA authentication...");
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

    var patientId = "Not provided";
    const patientBucket = "Delete me";

    var status = "Not provided";

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

      } else {
        console.log("Index out of bounds for HealthLakeDatastoresArray");
        setCurrentDataStoreRecord(undefined);
        patientId = "Not provided";
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
          <p><strong>Patient ICN:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.patient_icn ? CurrentDataStoreRecord.patient_icn : ''}</p>
          <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : ""}</p>
          <p>{debugMode && (
            <button onClick={() => debugCreateDataStore()}>Debug Create Data Store</button>
          )}</p>
          <p><button onClick={() => goToVA()}>Import VA Patient To Healthlake</button></p>
          <p><button onClick={() => deleteDataStore(patientBucket)}>Delete Patient Record</button></p>
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
