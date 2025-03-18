import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/va_health/resource';
import { CustomNotifications } from './custom/va-access/resource';

const backend = defineBackend({
  auth,
  data,
  sayHello
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