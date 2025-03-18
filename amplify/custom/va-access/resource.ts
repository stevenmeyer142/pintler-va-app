import * as url from 'node:url';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import apigateway  from 'aws-cdk-lib/aws-apigateway';
import apigwv2, { HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { Construct } from 'constructs';
import { SelfManagedKafkaEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export type Message = {
    subject: string;
    body: string;
    recipient: string;
  };
  
export class CustomNotifications extends Construct {
    public readonly topic: string;
    public readonly gateway_url : string;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.topic = "arn:aws:sns:us-east-1:123456789012:MyTopic";

    // Create Lambda to publish messages to SNS topic
    const publisher = new lambda.NodejsFunction(this, 'Publisher', {
      entry: url.fileURLToPath(new URL('publisher.ts', import.meta.url)),

      runtime: Runtime.NODEJS_18_X
    });

    


const booksIntegration = new HttpLambdaIntegration('BooksIntegration', publisher);

const httpApi = new apigwv2.HttpApi(this, 'HttpApi');

httpApi.addRoutes({
  path: '/',
  integration: booksIntegration,
});

 
        
          this.gateway_url = httpApi.url?.toString() ?? '';      
  }
}