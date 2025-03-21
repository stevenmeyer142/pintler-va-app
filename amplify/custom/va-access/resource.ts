import * as url from 'node:url';
import { Runtime, Code } from 'aws-cdk-lib/aws-lambda';
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
      handler: 'lambda.handler',
      code: Code.fromAsset('amplify/custom/va-access/dist'), 
      memorySize: 1024,  

      runtime: Runtime.NODEJS_LATEST
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