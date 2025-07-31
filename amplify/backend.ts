import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

import { data } from './data/resource';
import { VAAccessConstruct } from './custom/va-access/resource';
import { importFHIR, ImportFHIRConstruct } from './functions/import_fhir/resource';
import { createDataStore } from './functions/create_data_store/resource';
import { deleteDatastore } from './functions/delete_datastore/resource';
import iam from 'aws-cdk-lib/aws-iam';
import { s3JsonToNdjson } from './functions/s3_json_to_ndjson/resource';

const backend = defineBackend({
  auth,
  data,
  createDataStore,
  importFHIR,
  deleteDatastore,
  s3JsonToNdjson,
});

const importFHIRLambda = backend.importFHIR.resources.lambda;
const createDataStoreLambda = backend.createDataStore.resources.lambda;
const healthLakeActionsPolicy = new iam.PolicyStatement({
  sid: "CreateDataStoreHealthLakeActions",
  actions: ["healthlake:*",
    "s3:*",
    "iam:*",
    "ram:*",
    "kms:*",
    "logs:*",
    "cloudwatch:*",
    "glue:*"],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
})

createDataStoreLambda.addToRolePolicy(healthLakeActionsPolicy);
importFHIRLambda.addToRolePolicy(healthLakeActionsPolicy);

const deleteDataStorePolicy = new iam.PolicyStatement({
  sid: "DeleteDataStorePolicy",
  actions: [
    "s3:DeleteObject",
    "s3:DeleteBucket",
    "s3:ListBucket",
    "kms:Decrypt",
    "cloudwatch:CreateLogGroup",
    "cloudwatch:CreateLogStream",
    "healthlake:DeleteFHIRDatastore",
    "healthlake:DescribeFHIRDatastore",
    "glue:*"
  ],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
})

const deleteDataStoreLambda = backend.deleteDatastore.resources.lambda;
deleteDataStoreLambda.addToRolePolicy(deleteDataStorePolicy);

const vaAccessConstruct = new VAAccessConstruct(
  backend.createStack('VAAccessConstruct'),
  'VAAccessConstruct',
);

const importFHIRConstruct = new ImportFHIRConstruct(
  backend.createStack('ImportFHIRConstruct'),
  'ImportFHIRConstruct',
);

const jsontoNDJsonLambda = backend.s3JsonToNdjson.resources.lambda;

const s3JsonToNdjsonPolicy = new iam.PolicyStatement({
  sid: "S3JsonToNDJsonPolicy",
  actions: [
    "s3:GetObject",
    "s3:PutObject",
    "s3:ListBucket",
    "kms:Decrypt",
    "kms:GenerateDataKey",
    "kms:Encrypt",
  ],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
});

jsontoNDJsonLambda.addToRolePolicy(s3JsonToNdjsonPolicy);

backend.addOutput({
  custom: {
    gatewayURL: vaAccessConstruct.gateway_url,
    kmsKey: vaAccessConstruct.kms_key.keyId,
    dataAccessRoleArn: importFHIRConstruct.data_access_role_arn,
  },
});