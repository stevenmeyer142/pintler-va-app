import * as url from 'node:url';
import { Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import apigateway from 'aws-cdk-lib/aws-apigateway';
import apigwv2, { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { SelfManagedKafkaEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Duration } from 'aws-cdk-lib/core';
import { secret } from '@aws-amplify/backend';


export type Message = {
  subject: string;
  body: string;
  recipient: string;
};

export class CustomNotifications extends Construct {
  public readonly topic: string;
  public readonly gateway_url: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.topic = "arn:aws:sns:us-east-1:123456789012:MyTopic";

    // Create Lambda to publish messages to SNS topic.
    const vetAccessLambda = new lambda.NodejsFunction(this, 'VetAccess', {
      handler: 'lambda.handler',
      code: Code.fromAsset('amplify/custom/va-access/tsc_out'),
      memorySize:2048,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_LATEST
    });
    vetAccessLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue', 'secretsmanager:listSecrets'],
      resources: ['*'],
    }));

    // Add permissions to list s3 buckets
    vetAccessLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['s3:ListAllMyBuckets'],
      resources: ['*'],
    }));
 
    const vetAccessHttpLambda = new HttpLambdaIntegration('VetAccessIntegration', vetAccessLambda);

    const httpApi = new apigwv2.HttpApi(this, 'VetAccessIntegration', 
      {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [
           apigwv2.CorsHttpMethod.PUT,
           apigwv2.CorsHttpMethod.GET,
           apigwv2.CorsHttpMethod.POST,
        ],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      },
    });

    httpApi.addRoutes({
      path: '/',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.POST, HttpMethod.GET],
    });

    httpApi.addRoutes({
      path: '/auth',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.GET],
    });
    httpApi.addRoutes({
      path: '/auth/cb',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.GET],
    });
    httpApi.addRoutes({
      path: '/home',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.GET],
    });
    httpApi.addRoutes({
      path: '/patient',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.POST],
    });

    httpApi.addRoutes({
      path: '/set_session_values',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.PUT],
    });

    httpApi.addRoutes({
      path: '/return_toapp',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.GET],
    });



    vetAccessLambda.addEnvironment('GATEWAY_URL', httpApi.url?.toString() ?? '');
    vetAccessLambda.addEnvironment('DEBUG', "express:*");
     this.gateway_url = httpApi.url?.toString() ?? '';
  }
}