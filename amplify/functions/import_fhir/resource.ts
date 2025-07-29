import { defineFunction } from '@aws-amplify/backend';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export const importFHIR = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'ImportFHIR',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts',
  timeoutSeconds: 15 * 60, // 15 minutes
});

export class ImportFHIRConstruct extends Construct {
  public readonly data_access_role_arn: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const dataAccessPolicy = new iam.PolicyStatement({
      sid: "ImportFHIRDataAccess",
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
    

    const role = new iam.Role(this, 'VAHealthLakeImportDataAccessRole', {
      assumedBy: new iam.ServicePrincipal('healthlake.amazonaws.com'),
      description: 'Role for healthlake importing data from S3',
    });
    role.addToPolicy(dataAccessPolicy);

    this.data_access_role_arn = role.roleArn;
  }
}