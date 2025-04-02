import * as url from 'node:url';
import { Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import apigateway from 'aws-cdk-lib/aws-apigateway';
import apigwv2, { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { SelfManagedKafkaEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Duration } from 'aws-cdk-lib/core';

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

    // Create Lambda to publish messages to SNS topic
    const vetAccessLambda = new lambda.NodejsFunction(this, 'VetAccess', {
      handler: 'lambda.handler',
      code: Code.fromAsset('amplify/custom/va-access/tsc_out'),
      memorySize: 1024,

      runtime: Runtime.NODEJS_LATEST
    });

    const vetAccessHttpLambda = new HttpLambdaIntegration('VetAccessIntegration', vetAccessLambda);

    const httpApi = new apigwv2.HttpApi(this, 'VetAccessIntegration', 
      {
      corsPreflight: {
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: [
           apigwv2.CorsHttpMethod.POST,
           apigwv2.CorsHttpMethod.GET,
        ],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      },});

    httpApi.addRoutes({
      path: '/',
      integration: vetAccessHttpLambda,
      methods: [HttpMethod.POST, HttpMethod.GET],
    });

    this.gateway_url = httpApi.url?.toString() ?? '';
  }
}