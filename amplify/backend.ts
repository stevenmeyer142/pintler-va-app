import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sayHello } from './functions/va_health/resource';

defineBackend({
  auth,
  data,
  sayHello
});
