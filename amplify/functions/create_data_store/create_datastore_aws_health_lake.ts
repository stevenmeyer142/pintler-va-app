import { HealthLakeClient, CreateFHIRDatastoreCommand, DatastoreStatus, DescribeFHIRDatastoreCommand} from "@aws-sdk/client-healthlake";


export const healthLakeClientInstance = new HealthLakeClient();

export const createHealthLakeDataStore = async (dataStoreName: string) => {
    try {
        console.log("Creating HealthLake data store with name:", dataStoreName);
        const response = await healthLakeClientInstance.send(new CreateFHIRDatastoreCommand({
            DatastoreName: dataStoreName,
            DatastoreTypeVersion: "R4"
        }));
        console.log("Data store created successfully:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error creating data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export const waitDataStoreActive = async (dataStoreId: string, callback: (status: DatastoreStatus) => void) : Promise<boolean> => {
    try {
        let status: DatastoreStatus = DatastoreStatus.CREATING; // Initial status
        while (status === DatastoreStatus.CREATING) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = response.DatastoreProperties?.DatastoreStatus ?? DatastoreStatus.CREATE_FAILED; // Get the current status
            console.log("Data store status:", status);

            // Invoke the callback with the current status if provided
            callback(status);


            if (status !== DatastoreStatus.CREATING) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status == DatastoreStatus.ACTIVE; 
    } catch (error) {
        console.error("Error waiting for data store to become active:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}
