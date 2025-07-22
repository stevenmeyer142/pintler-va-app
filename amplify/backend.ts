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
  sid: "AllowImportFHIR",
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

const statement2 = new iam.PolicyStatement({
  sid: "AllowImportFHIRkAssumeRole",
  actions: ["iam:PassRole"],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
  conditions: {
    StringEquals: {
      "iam:PassedToService": "healthlake.amazonaws.com"
    }
  }
})

const adminAccess = new iam.PolicyStatement({
  sid: "AdminAccess",
  actions: ["*"],
  resources: ["*"],
  effect: iam.Effect.ALLOW
})


createDataStoreLambda.addToRolePolicy(healthLakeActionsPolicy);
// importFHIRLambda.addToRolePolicy(statement2)
//importFHIRLambda.addToRolePolicy(adminAccess)

const deleteBucketPolicy = new iam.PolicyStatement({
  sid: "DeleteBucket",
  actions: ["s3:*"],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
})
const deleteBucketLambda = backend.deleteDatastore.resources.lambda;
deleteBucketLambda.addToRolePolicy(deleteBucketPolicy);


const vaAccessConstruct = new VAAccessConstruct(
  backend.createStack('VAAccessConstruct'),
  'VAAccessConstruct',
);

const importFHIRConstruct = new ImportFHIRConstruct(
  backend.createStack('ImportFHIRConstruct'),
  'ImportFHIRConstruct',
);

const importFHIRPolicy = new iam.PolicyStatement({
  sid: "ImportFHIRPolicy",
  actions: [
    "healthlake:*",
    "healthlake:StartFHIRImportJob",
  ],
  resources: ["*"],
  effect: iam.Effect.ALLOW,
});
importFHIRLambda.addToRolePolicy(adminAccess);  // TODO : Review this policy
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