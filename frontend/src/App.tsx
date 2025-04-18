import { useEffect, useState } from "react";
////import { useAuthenticator } from '@aws-amplify/ui-react';
 import { BrowserRouter as Router, Route, Routes, useSearchParams } from "react-router-dom";
import {deleteBucketAndObjects} from "./aws_frontend_s3";
import type { Schema } from "../../amplify/data/resource"
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";
Amplify.configure(outputs);
import { generateClient } from "aws-amplify/api"

const client = generateClient<Schema>()


 var patientId = "";
 var patientBucket = "";
 var patientObjectKey = "";
 var s3_input = "";

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
  console.log("Importing to HealthLake...");
  const result = await client.queries.importFHIR({
    s3_input: s3_input,
    patient_icn: patientId,
  })

  console.log("Import result:", result);
}

function debugDisplayPatient() {
  patientId = "5000335";
  patientBucket = "va-patient-icn-5000335-2e44550c-979f-46fb-8556-19eea220a5aa";
  patientObjectKey = "patient_record";
  s3_input = `s3://${patientBucket}/${patientObjectKey}`;
  
  window.location.href = `/display_patient?patientId=${patientId}&patientBucket=${patientBucket}&patientObjectKey=${patientObjectKey}`;
}

  function DisplayPatient() {
    const [HealthLakeDatastore, setHealthLakeDatastore] = useState<Array<Schema["HealthLakeDatastore"]["type"]>>([]);

    useEffect(() => {
      client.models.HealthLakeDatastore.observeQuery({
        filter: {
          id: { eq: s3_input },
        },
      }).subscribe({
        next: (data) => setHealthLakeDatastore([...data.items]),
      })});

    const [searchParams] = useSearchParams();
    patientId = searchParams.get("patientId") || "Not provided";
    patientBucket = searchParams.get("patientBucket") || "Not provided";
    patientObjectKey = searchParams.get("patientObjectKey")|| "Not provided";
  
    return (
      <div>
        <h1>Patient Details</h1>
        <p><strong>Status:</strong> {HealthLakeDatastore.length > 0 ? HealthLakeDatastore[0].status : "Not found"}</p>
        <p><strong>Patient ICN:</strong> {patientId}</p>
        <p><strong>Patient Bucket:</strong> {patientBucket}</p>
        <p><strong>Patient Opject Key:</strong> {patientObjectKey }</p>
        <p><button onClick={deleteBucket}>Delete Bucket</button></p>
        <p><button onClick={importToHealthLake}>Import To Healthlake</button></p>
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
