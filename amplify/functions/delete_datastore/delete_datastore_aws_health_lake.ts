import { HealthLakeClient, DeleteFHIRDatastoreCommand, DatastoreStatus, DescribeFHIRDatastoreCommand} from "@aws-sdk/client-healthlake";

export const healthLakeClientInstance = new HealthLakeClient();

/**
 * Deletes a HealthLake FHIR data store with the specified ID.
 *
 * @param dataStoreId - The unique identifier of the HealthLake data store to delete.
 * @returns A promise that resolves to the response from the DeleteFHIRDatastoreCommand.
 * @throws Will throw an error if the deletion fails.
 */
export const deleteHealthLakeDataStore = async (dataStoreId: string) => {
    try {
        console.log("Deleting HealthLake data store with ID:", dataStoreId);
        const response = await healthLakeClientInstance.send(new DeleteFHIRDatastoreCommand({
            DatastoreId: dataStoreId
        }));
        console.log("Delete data store response:", response);
        return response; // Return the response as a dictionary
    } catch (error) {
        console.error("Error deleting data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
}

/**
 * Waits for a HealthLake FHIR data store to be deleted by polling its status.
 *
 * @param dataStoreId - The unique identifier of the HealthLake data store to monitor.
 * @param callback - An asynchronous callback function invoked with the current status after each poll.
 * @returns A promise that resolves to `true` if the data store is deleted, or `false` if an error occurs (other than a ReferenceError).
 */
export const waitDataStoreDeleted = async (dataStoreId: string, callback: (status: DatastoreStatus) => Promise<void>) : Promise<boolean> => {
    try {
        let status: DatastoreStatus = DatastoreStatus.DELETING; // Initial status
        while (status === DatastoreStatus.DELETING) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = response.DatastoreProperties?.DatastoreStatus ?? DatastoreStatus.DELETED; // Get the current status
            console.log("Data store status:", status);      
            // Invoke the async callback with the current status if provided
            await callback(status);   
            if (status !== DatastoreStatus.DELETING) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status == DatastoreStatus.DELETED;
    } catch (error: any) {
        console.error("Error waiting for data store to be deleted:", error);
        return error.name == "ReferenceError"; // return false if the error is not related to the datastore not being found
    }
}
