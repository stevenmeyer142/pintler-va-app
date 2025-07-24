import { useEffect, useState } from "react";
import type { Schema } from "../../amplify/data/resource"
import { parseFunctionResultJson} from "./UtilityFunctions";
import { useSearchParams } from "react-router-dom";
import { Amplify } from "aws-amplify";
import outputs from "../../amplify_outputs.json";

import { generateClient } from "aws-amplify/api"



Amplify.configure(outputs);

const client = generateClient<Schema>()

async function importToDataStore(healthRecordID: string): Promise<boolean> {
  console.log("Importing to DataStore using DynamoDB health record ID:", healthRecordID);

  try {
    const result = await client.queries.importFHIR({
      id: healthRecordID,
    });

    const jsonResult = parseFunctionResultJson(result.data ?? "{success: false, message: 'No data returned'}");
    if (!jsonResult.success) {
      console.error("Failed to parse JSON result for importToDataStore:", jsonResult.message, "function result:", result);
      return false;
    }

    console.log("importToDataStore result:", result);

    return true;
  } catch (error: any) {
    console.error("Error importing to HealthLake data store:", error);
    return false;
  }
}


function ReturnToPatientsPage() {
  console.log("Returning to Patients Page");
  window.location.href = "/";
}

export function ImportToDataStorePage() {
  const [CurrentDataStoreRecord, setCurrentDataStoreRecord] = useState<Schema["HealthLakeDatastore"]["type"] | undefined>(undefined);
  const [searchParams] = useSearchParams();

  var health_record_id = searchParams.get("healthRecordID") || "Not provided";
  
  var status = "Not provided";

  if (!health_record_id) {
    console.error("healthRecordID not provided in search parameters.");
    return <div>Error: healthRecordID not provided.</div>;
  }

    ``


  async function ImportToDataStore() {
   const result = await importToDataStore(health_record_id);
  if (!result) {
    console.error("Failed to import record to health lake.");
    return false;
  }
  console.log("Record successfully imported to HealthLake.");
  return true;
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
        <h1>Patient Details For Importing to HealthLake</h1>
        <p><strong>Status:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status ? CurrentDataStoreRecord.status : status}</p>
        <p><strong>Status Description:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.status_description ? CurrentDataStoreRecord.status_description : "undefined"}</p>        
        <p><strong>Patient ICN:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.patient_icn ? CurrentDataStoreRecord.patient_icn : "undefined"}</p>
        <p><strong>Patient S3 Object URL:</strong> {CurrentDataStoreRecord && CurrentDataStoreRecord.s3_input ? CurrentDataStoreRecord.s3_input : "undefined"}</p>
        <p><strong>HealthLake Data Store ID:</strong> {CurrentDataStoreRecord != undefined && CurrentDataStoreRecord.datastore_id != undefined ? CurrentDataStoreRecord.datastore_id : "undefined"}</p>
        <div style={{ margin: "10px 0" }}></div>

        <button
          onClick={() => ImportToDataStore()}
          style={{ marginRight: "10px" }}
          disabled={
            !CurrentDataStoreRecord || (
            CurrentDataStoreRecord.status !== "ACTIVE" &&
            CurrentDataStoreRecord.status !== "CREATING")  // This is a hack to handle Lambda timeout issues.
          }
        >
          Import Patient Record
        </button>
        <button
          onClick={ReturnToPatientsPage}
          style={{ marginRight: "10px" }}
        >
          Return to Patients Page
        </button>
      </div>
    </div>
  );
}

