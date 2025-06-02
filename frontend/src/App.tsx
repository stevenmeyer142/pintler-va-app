import { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import type { Schema } from "../../amplify/data/resource"
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"


Amplify.configure(outputs);

const client = generateClient<Schema>()




 async function deleteBucket(bucketName: string) {
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

 
 
function App() {
  console.log("App component rendered");
 
 //const { signOut } = useAuthenticator();
function signOut() {
}
 async function setToCurrentDatastoreRecord(id: string) {
  // client.models.Todo.delete({ id })
  console.log("Deleting health lake import with id:", id);
 }


function debugDisplayPatient() {
  
  const patientId = "5000335";
  const patientBucket = "va-patient-icn-5000335-38ed5ac2-96c7-4061-9171-da7ddf2d82cd";
  const patientObjectKey = "patient_record";

  
  window.location.href = `/display_patient?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientObjectKey}`;
}

  function DisplayPatient() {
    const [HealthLakeDatastoresArray, setHealthLakeDatastoresArray] = useState<Array<Schema["HealthLakeDatastore"]["type"]>>([]);
    const [CurrentDataStoreRecord, setCurrentDataStoreRecord] = useState<Schema["HealthLakeDatastore"]["type"] | undefined>(undefined);
    const [searchParams] = useSearchParams();
    var patientId = searchParams.get("patientId") || "Not provided";
    const patientBucket = searchParams.get("patientBucket") || "Not provided";
    const patientObjectKey = searchParams.get("patientObjectKey")|| "Not provided";
    var s3_input = `s3://${patientBucket}/${patientObjectKey}`;
    useEffect(() => {
      client.models.HealthLakeDatastore.observeQuery().subscribe({
        next: (data) => setHealthLakeDatastoresArray([...data.items]),
      })});

      async function createDataStore(patientId : string, s3_input : string) {
        console.log("Importing to HealthLake... s3_input:", s3_input);
       
        const result = await client.queries.createDataStore({
          id: s3_input,
          name: "test",
          s3_input: s3_input,
          patient_icn: patientId,
        });
      
        console.log("Create data store result:", result);
      }  

      // function to set the current datastore record index with an int 
      
      async function setToCurrentDatastoreRecord(index: number) {
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
      
      async function importToHealthLake(s3_input : string) {
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
        <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : "undefined" }</p>
        <p><strong>HealthLake Data Store ID:</strong> {CurrentDataStoreRecord != undefined && CurrentDataStoreRecord.datastore_id != undefined ? CurrentDataStoreRecord.datastore_id : "undefined"}</p>
        <p><button onClick={() => createDataStore(patientId,s3_input)}>Create Datastore</button></p>
        <p><button onClick={() => importToHealthLake(s3_input)}>Import To Healthlake</button></p>
        <p><button onClick={() => deleteBucket(patientBucket)}>Delete Bucket</button></p>
      </div>
      <div>    
      <ul>
        {HealthLakeDatastoresArray.map((HealthLakeDatastore, index) => (
          
          <li 
          onClick={() => HealthLakeDatastore.id && setToCurrentDatastoreRecord(index)}
          key={HealthLakeDatastore.id}>{HealthLakeDatastore.s3_input} {HealthLakeDatastore.status}</li>
        ))}
      </ul>
      </div>
      </div>

      
    );
  }


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


  
    
  // function deleteTodo(id: string) {
  // //  client.models.Todo.delete({ id })
  // }

 


  return (
    <Router>
      <Routes>
        <Route path="/" element={<DisplayMain />}/>
        <Route path="/display_patient" element={<DisplayPatient />} />
      </Routes>
    </Router>
  );
}

export default App;
