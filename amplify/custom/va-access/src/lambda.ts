import "source-map-support/register";
import serverlessExpress from "@codegenie/serverless-express";
console.log("Loading serverless express...");
import { app, environment, configurePassport } from "./app";
console.log("Starting serverless express app...");
//export const handler = serverlessExpress({ app });

let serverlessExpressInstance :any = null

async function setup (event:any, context: any) {
 await environment.updateClientSecrets();
 // await environment.listS3Buckets();
  configurePassport();
  serverlessExpressInstance = serverlessExpress({ app })
  return serverlessExpressInstance(event, context)
}

function handler (event:any, context:any) {
  if (serverlessExpressInstance) return serverlessExpressInstance(event, context)

  return setup(event, context)
}

exports.handler = handler