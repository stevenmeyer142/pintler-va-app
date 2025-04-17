//import { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
// import type { Schema } from "../../amplify/data/resource"
 import { Amplify } from "aws-amplify"
// import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";
//import dotenv from 'dotenv';
//import fs from 'fs';
// import { secret } from '@aws-amplify/backend';
// const clientId = secret('VA_Health_Client_ID');
// const clientSecret = secret('VA_Health_Client_Secret');

// //const clientSecret = envConfig.CLIENT_SECRET || '';

Amplify.configure(outputs)
//const client = generateClient<Schema>();
// const clientId = "clent_id";
// const clientSecret = "client_secret";
import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import {deleteBucketAndObjects} from "./aws_frontend_s3";

 var patientId = "";
 var patientBucket = "";
 var patientObjectKey = "";

 async function deleteBucket() {
    try {
      console.log("Deleting bucket and objects...");
      await deleteBucketAndObjects(patientBucket);
      console.log("Bucket deleted successfully");
    }
    catch (error) {
      console.error("Error deleting bucket:", error);
 }  
}
async function importToHealthLake() {
}

function debugDisplayPatient() {
  patientId = "5000335";
  patientBucket = "va-patient-icn-5000335-2e44550c-979f-46fb-8556-19eea220a5aa";
  patientObjectKey = "patient_record";
  
  window.location.href = `/display_patient?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientObjectKey}`;
}

  function DisplayPatient() {
    const [searchParams] = useSearchParams();
    patientId = searchParams.get("patientId") || "Not provided";
    patientBucket = searchParams.get("patientBucket") || "Not provided";
    patientObjectKey = searchParams.get("patientObjectKey")|| "Not provided";
  
    return (
      <div>
        <h1>Patient Details</h1>
        <p><strong>Patient ICN:</strong> {patientId}</p>
        <p><strong>Patient Bucket:</strong> {patientBucket}</p>
        <p><strong>Patient Opject Key:</strong> {patientObjectKey }</p>
        <button onClick={deleteBucket}>Delete Bucket</button>
        </div>

      
    );
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
 // const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

 //const { signOut } = useAuthenticator();
function signOut() {
}

function DisplayMain() {
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


  // useEffect(() => {
  //   client.models.Todo.observeQuery().subscribe({
  //     next: (data) => setTodos([...data.items]),
  //   });
  // }, []);

    
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
