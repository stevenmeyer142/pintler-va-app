import outputs from "../../amplify_outputs.json";
import { generateClient } from "aws-amplify/api"
import type { Schema } from "../../amplify/data/resource"
import { Amplify } from "aws-amplify";
import type { FunctionResponse } from "../../amplify/data/resource";

Amplify.configure(outputs);
const client = generateClient<Schema>()


export async function updateHealthLakeDatastoreStatus(id: string | undefined, status: string, description: string, extraKeys: string[] = [], extraValues: string[] = []): Promise<FunctionResponse> {
    if (!id) {
        console.error("id is required to update healthLake datastore status");
        return { success: false, message: "Error id is required for updateHealthLakeDatastoreStatus" };
    }
    var updateFields: any = {
        id: id,
        status: status,
        status_description: description
    }

    for (let i = 0; i < extraKeys.length; i++) {
        if (extraKeys[i] && extraValues[i]) {
            updateFields[extraKeys[i]] = extraValues[i];
        } else {
            console.warn(`Skipping extra key ${i} with missing key or value`);
        }
    }

    const { errors } = await client.models.HealthLakeDatastore.update(updateFields);
    if (errors) {
        console.error("Error updating healthLake datastore status", errors);
        return { success: false, message: errors[0].message };
    }
    return { success: true, message: "" };
}


export function parseFunctionResultJson(jsonString: any): any {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed.success === "boolean" && typeof parsed.message === "string") {
      return parsed;
    } else {
      console.error("JSON does not match FunctionResponse structure in'parseFunctionResultJson' with input ", jsonString,
        "with typeof",typeof jsonString, "and parsed", parsed);
      
      return { success: false, message: "JSON does not match FunctionResponse structure." };
    }
  } catch (error) {
    console.error("Failed to parse JSON in 'parseFunctionResultJson':", error, "Input JSON string:", jsonString);
    if (typeof jsonString === "object" && jsonString.errors && jsonString.errors.length > 0) {
      console.error("Errors found in JSON:", jsonString.errors);
      return { success: false, message: jsonString.errors[0] };
    }
    return { success: false, message: `Failed to parse JSON: ${(error as Error).message}` };
  }
}

