import React, { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
 import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import {deleteBucketAndObjects} from "./aws_frontend_s3";
import type { Schema } from "../../amplify/data/resource"
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"


Amplify.configure(outputs);

const client = generateClient<Schema>()




 async function deleteBucket(bucketName: string) {
    try {
      console.log("Deleting bucket and objects...");
      await deleteBucketAndObjects(bucketName);
      console.log("Bucket deleted successfully");
    }
    catch (error) {
      console.error("Error deleting bucket:", error);
 }  
}


  
  function goToVA() {
    
      const requestBody = {
        main_location: window.location.href,
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
async function importToHealthLake(patientId : string, s3_input : string) {
  console.log("Importing to HealthLake... s3_input:", s3_input);
 
  const result = await client.queries.importFHIR({
    s3_input: s3_input,
    patient_icn: patientId,
  })

  console.log("Import result:", result);
}

function debugDisplayPatient() {
  
  const patientId = "5000335";
  const patientBucket = "va-patient-icn-5000335-2e44550c-979f-46fb-8556-19eea220a5aa";
  const patientObjectKey = "patient_record";

  
  window.location.href = `/display_patient?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientObjectKey}`;
}

  function DisplayPatient() {
    const [HealthLakeDatastore, setHealthLakeDatastore] = useState<Array<Schema["HealthLakeDatastore"]["type"]>>([]);
    const [searchParams] = useSearchParams();
    const patientId = searchParams.get("patientId") || "Not provided";
    const patientBucket = searchParams.get("patientBucket") || "Not provided";
    const patientObjectKey = searchParams.get("patientObjectKey")|| "Not provided";
    const s3_input = `s3://${patientBucket}/${patientObjectKey}`;
    useEffect(() => {
      client.models.HealthLakeDatastore.observeQuery({
        filter: {
          id: { eq: s3_input },
        },
      }).subscribe({
        next: (data) => setHealthLakeDatastore([...data.items]),
      })});

   
    return (
      <div>
        <h1>Patient Details</h1>
        <p><strong>Status:</strong> {HealthLakeDatastore.length > 0 ? HealthLakeDatastore[0].status : "Not found"}</p>
        <p><strong>Patient ICN:</strong> {patientId}</p>
        <p><strong>Patient Bucket:</strong> {patientBucket}</p>
        <p><strong>Patient Opject Key:</strong> {patientObjectKey }</p>
        <p><button onClick={() => deleteBucket(patientBucket)}>Delete Bucket</button></p>
        <p><button onClick={() => importToHealthLake(patientId,s3_input)}>Import To Healthlake</button></p>
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
