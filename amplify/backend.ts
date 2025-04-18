import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';

import { data } from './data/resource';
import { CustomNotifications } from './custom/va-access/resource';
import { importFHIR } from './functions/import_fhir/resource';

const backend = defineBackend({
  auth,
  data,
  importFHIR,
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