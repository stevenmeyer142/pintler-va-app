// amplify/custom/CustomNotifications/publisher.ts
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Handler } from 'aws-lambda';
import type { Message } from './resource'; 

const client = new SNSClient({ region: process.env.AWS_REGION });

// define the handler that will publish messages to the SNS Topic 
export const handler: Handler<Message, void> = async (event) => {
  const { subject, body, recipient } = event;
  const command = new PublishCommand({
    TopicArn: process.env.SNS_TOPIC_ARN,
    Message: JSON.stringify({
      subject,
      body,
      recipient
    })
  });
  try {
    const response = await client.send(command);
    console.log('published', response);
  } catch (error) {
    console.log('failed to publish message', error);
    throw new Error('Failed to publish message', { cause: error });
  }
};