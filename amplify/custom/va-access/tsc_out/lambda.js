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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const serverless_express_1 = __importDefault(require("@codegenie/serverless-express"));
console.log("Loading serverless express...");
const app_1 = require("./app");
console.log("Starting serverless express app...");
//export const handler = serverlessExpress({ app });
let serverlessExpressInstance = null;
function setup(event, context) {
    return __awaiter(this, void 0, void 0, function* () {
        yield app_1.environment.updateClientSecrets();
        // await environment.listS3Buckets();
        (0, app_1.configurePassport)();
        serverlessExpressInstance = (0, serverless_express_1.default)({ app: app_1.app });
        return serverlessExpressInstance(event, context);
    });
}
function handler(event, context) {
    if (serverlessExpressInstance)
        return serverlessExpressInstance(event, context);
    return setup(event, context);
}
exports.handler = handler;
