// amplify/custom/CustomNotifications/publisher.ts
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Handler } from 'aws-lambda';
import type { Message } from './resource'; 
import { readdir } from 'fs/promises';
import { join } from 'path';

const client = new SNSClient({ region: process.env.AWS_REGION });
exports.handler = async () => {
  const currentDirectory = process.cwd();
  const files = await readdir(currentDirectory);

  console.log('Current directory files:', files);
  return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ message: "Hello, World!",files : files }),
  };
};