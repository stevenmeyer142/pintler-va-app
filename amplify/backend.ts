import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

import { data } from './data/resource';
import { VAAccessConstruct } from './custom/va-access/resource';
import { importFHIR } from './functions/import_fhir/resource';
import iam from 'aws-cdk-lib/aws-iam';

const backend = defineBackend({
  auth,
  data,
  importFHIR,
});

const importFHIRLambda = backend.importFHIR.resources.lambda


const statement1 = new iam.PolicyStatement({
  sid: "AllowImportFHIR",
  actions: ["healthlake:*",
          "s3:ListAllMyBuckets",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "iam:ListRoles",
          "ram:*"],
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


importFHIRLambda.addToRolePolicy(statement1)
importFHIRLambda.addToRolePolicy(statement2)

const vaAccessConstruct = new VAAccessConstruct(
  backend.createStack('VAAccessConstruct'),
  'VAAccessConstruct',
);

backend.addOutput({
  custom: {
    gatewayURL: vaAccessConstruct.gateway_url,
    kmsKey: vaAccessConstruct.kms_key.keyId,
  },
});