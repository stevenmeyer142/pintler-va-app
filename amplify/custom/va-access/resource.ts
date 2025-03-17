import * as url from 'node:url';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

// message to publish
export type Message = {
  subject: string;
  body: string;
  recipient: string;
};

type CustomNotificationsProps = {
  /**
   * The source email address to use for sending emails
   */
  sourceAddress: string;
};

export class CustomNotifications extends Construct {
  public readonly topic: sns.Topic;
  constructor(scope: Construct, id: string, props: CustomNotificationsProps) {
    super(scope, id);

    const { sourceAddress } = props;

    // Create SNS topic
    this.topic = new sns.Topic(this, 'NotificationTopic');

    // Create Lambda to publish messages to SNS topic
    const publisher = new lambda.NodejsFunction(this, 'Publisher', {
      entry: url.fileURLToPath(new URL('publisher.ts', import.meta.url)),
      environment: {
        SNS_TOPIC_ARN: this.topic.topicArn
      },
      runtime: Runtime.NODEJS_18_X
    });

    // Create Lambda to process messages from SNS topic
    const emailer = new lambda.NodejsFunction(this, 'Emailer', {
      entry: url.fileURLToPath(new URL('emailer.ts', import.meta.url)),
      environment: {
        SOURCE_ADDRESS: sourceAddress
      },
      runtime: Runtime.NODEJS_18_X
    });

    // Subscribe emailer Lambda to SNS topic
    this.topic.addSubscription(new subscriptions.LambdaSubscription(emailer));

    // Allow publisher to publish to SNS topic
    this.topic.grantPublish(publisher);
  }
}