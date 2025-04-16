"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthLakeClientInstance = void 0;
const client_healthlake_1 = require("@aws-sdk/client-healthlake");
exports.healthLakeClientInstance = new client_healthlake_1.HealthLakeClient();
const createHealthLakeDataStore = (dataStoreName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield exports.healthLakeClientInstance.send(new client_healthlake_1.CreateFHIRDatastoreCommand({
            DatastoreName: dataStoreName,
            DatastoreTypeVersion: "R4"
        }));
        console.log("Data store created successfully:", response);
        return response; // Return the response as a dictionary
    }
    catch (error) {
        console.error("Error creating data store:", error);
        throw error; // Re-throw the error for the caller to handle
    }
});
const waitDataStoreActive = (dataStoreId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let status = client_healthlake_1.DatastoreStatus.CREATING; // Initial status
        while (status === client_healthlake_1.DatastoreStatus.CREATING) {
            const response = yield exports.healthLakeClientInstance.send(new client_healthlake_1.DescribeFHIRDatastoreCommand({
                DatastoreId: dataStoreId
            }));
            status = (_b = (_a = response.DatastoreProperties) === null || _a === void 0 ? void 0 : _a.DatastoreStatus) !== null && _b !== void 0 ? _b : client_healthlake_1.DatastoreStatus.CREATE_FAILED; // Get the current status
            console.log("Data store status:", status);
            if (status !== client_healthlake_1.DatastoreStatus.CREATING) {
                break;
            }
            yield new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
        }
        return status; // Return the final status
    }
    catch (error) {
        console.error("Error waiting for data store to become active:", error);
        throw error; // Re-throw the error for the caller to handle
    }
});
