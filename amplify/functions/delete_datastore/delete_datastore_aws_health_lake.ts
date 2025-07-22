import { HealthLakeClient, CreateFHIRDatastoreCommand, DatastoreStatus, DescribeFHIRDatastoreCommand} from "@aws-sdk/client-healthlake";


export const healthLakeClientInstance = new HealthLakeClient();

export const deleteHealthLakeDataStore = async (dataStoreId: string) => {
    try {
        console.log("Deleting HealthLake data store with ID:", dataStoreId);
        const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
            DatastoreId: dataStoreId
        }));
        console.log("Delete data store response:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error deleting data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

export const waitDataStoreDeleted = async (dataStoreId: string, callback: (status: DatastoreStatus) => void) : Promise<boolean> => {
    try {
        let status: DatastoreStatus = DatastoreStatus.DELETING; // Initial status
        while (status === DatastoreStatus.DELETING) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = response.DatastoreProperties?.DatastoreStatus ?? DatastoreStatus.DELETING; // Get the current status
            console.log("Data store status:", status);      
            // Invoke the callback with the current status if provided
            callback(status);   
            if (status !== DatastoreStatus.DELETING) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status == DatastoreStatus.DELETED;
    } catch (error) {
        console.error("Error waiting for data store to be deleted:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}
