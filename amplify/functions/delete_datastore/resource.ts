import { defineFunction } from '@aws-amplify/backend';

export const deleteDatastore = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 'delete_datastore',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts'
});