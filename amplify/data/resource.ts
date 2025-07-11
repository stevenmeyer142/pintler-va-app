import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { importFHIR } from "../functions/import_fhir/resource"
import { deleteBucket } from "../functions/delete_datastore/resource"
import { createDataStore } from "../functions/create_data_store/resource";
import {s3JsonToNdjson} from "../functions/s3_json_to_ndjson/resource";



const schema = a
  .schema({

    jsonToNdjson: a
    .query()
    .arguments({
      bucket_name: a.string(),
      json_file_key: a.string(),
      ndjson_file_key: a.string(),
    })
    .returns(a.string())
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(s3JsonToNdjson)),
    createDataStore: a
    .query()
    .arguments({
      id: a.string(),
      name: a.string(),
      s3_input: a.string(),
      patient_icn: a.string(),
    })
    .returns(a.string())
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(createDataStore)),

    importFHIR: a
    .query()
    .arguments({
      id: a.string(),
    })
    .returns(a.string())
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(importFHIR)),

    
    deleteBucket: a
    .query()
    .arguments({
      bucket_name: a.string(),
    })
    .returns(a.string())
    .authorization(allow => [allow.publicApiKey()])
    .handler(a.handler.function(deleteBucket)),



    HealthLakeDatastore: a.model({
      id: a.string(),
      name: a.string(),
      status: a.string(),
      patient_icn: a.string(),
      s3_input: a.string(),
      s3_output: a.string(),
      datastore_id: a.string(),
      status_description: a.string(),
    })
    .authorization(allow => [allow.publicApiKey()]),
      
   }
)
.authorization(allow => [allow.resource(importFHIR)]);


// Interface that matches the HealthLakeDatastore model.
 type Nullable<T> = T | null;
export interface HealthLakeDatastoreRecord {
  id: Nullable<string>;
  name: Nullable<string>;
  status: Nullable<string>;
  status_description: Nullable<string>;
  patient_icn: Nullable<string>;
  s3_input: Nullable<string>;
  s3_output: Nullable<string>;
  datastore_id: Nullable<string>;
} 

export interface FunctionResponse {
  success: boolean;
  message: string;
} 

  
export type Schema = ClientSchema<typeof schema>;

export const data = defineData({ 
  schema,
  authorizationModes: {
        defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 }
  },
});
