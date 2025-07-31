import { HealthLakeClient, CreateFHIRDatastoreCommand, DatastoreStatus, DescribeFHIRDatastoreCommand} from "@aws-sdk/client-healthlake";

/**
 * Singleton instance of the AWS HealthLake client.
 */
export const healthLakeClientInstance = new HealthLakeClient();

/**
 * Creates a new AWS HealthLake FHIR data store with the specified name.
 *
 * @param dataStoreName - The name to assign to the new data store.
 * @returns A promise that resolves to the response from the CreateFHIRDatastoreCommand.
 * @throws Throws an error if the data store creation fails.
 */
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

/**
 * Waits for the specified HealthLake data store to reach the ACTIVE status.
 *
 * Periodically checks the status of the data store and invokes the provided callback
 * with the current status and iteration count after each check.
 *
 * @param dataStoreId - The unique identifier of the data store to monitor.
 * @param callback - An async callback function invoked with the current status and iteration count.
 * @returns A promise that resolves to true if the data store becomes ACTIVE, or false otherwise.
 */
export const waitDataStoreActive = async (
    dataStoreId: string,
    callback: (status: DatastoreStatus, i: number) => Promise<void>
): Promise<boolean> => {
    try {
        let status: DatastoreStatus = DatastoreStatus.CREATING; // Initial status
        let i = 0; // Counter for iterations
        while (status === DatastoreStatus.CREATING) {
            const response = await healthLakeClientInstance.send(new DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = response.DatastoreProperties?.DatastoreStatus ?? DatastoreStatus.CREATE_FAILED; // Get the current status
            console.log("Data store status:", status, "Iteration:", i);

            // Invoke the callback with the current status if provided
            await callback(status, i);
            i++; // Increment the iteration counter
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again

            if (status !== DatastoreStatus.CREATING) {
                break;
            }
        }
        return status == DatastoreStatus.ACTIVE; 
    } catch (error) {
        console.error("Error waiting for data store to become active:", error);
        return false;
    }
}
