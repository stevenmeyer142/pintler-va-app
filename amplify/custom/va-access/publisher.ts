// amplify/custom/CustomNotifications/publisher.ts
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Handler } from 'aws-lambda';
import type { Message } from './resource'; 

const client = new SNSClient({ region: process.env.AWS_REGION });
exports.handler = async () => {
  return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ message: "Hello, World!" }),
  };
};