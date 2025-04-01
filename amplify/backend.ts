import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { CustomNotifications } from './custom/va-access/resource';
import { sayHello } from './functions/say-hello/resource';

const backend = defineBackend({
  auth,
  sayHello,
});



const customNotifications = new CustomNotifications(
  backend.createStack('CustomNotifications'),
  'CustomNotifications',
);

backend.addOutput({
  custom: {
    gatewayURL: customNotifications.gateway_url,
  },
});