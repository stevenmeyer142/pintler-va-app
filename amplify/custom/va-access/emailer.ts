// amplify/custom/CustomNotifications/emailer.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { SNSHandler } from 'aws-lambda';
import type { Message } from './resource';

const sesClient = new SESClient({ region: process.env.AWS_REGION });

// define the handler to process messages from the SNS topic and send via SES
export const handler: SNSHandler = async (event) => {
  for (const record of event.Records) {
    const message: Message = JSON.parse(record.Sns.Message);

    // send the message via email
    await sendEmail(message);
  }
};

const sendEmail = async (message: Message) => {
  const { recipient, subject, body } = message;

  const command = new SendEmailCommand({
    Source: process.env.SOURCE_ADDRESS,
    Destination: {
      ToAddresses: [recipient]
    },
    Message: {
      Body: {
        Text: { Data: body }
      },
      Subject: { Data: subject }
    }
  });

  try {
    const result = await sesClient.send(command);
    console.log(`Email sent to ${recipient}: ${result.MessageId}`);
  } catch (error) {
    console.error(`Error sending email to ${recipient}: ${error}`);
    throw new Error(`Failed to send email to ${recipient}`, { cause: error });
  }
};