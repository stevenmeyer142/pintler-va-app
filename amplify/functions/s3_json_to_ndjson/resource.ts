import { defineFunction } from '@aws-amplify/backend';

export const s3JsonToNdjson = defineFunction({
  // optionally specify a name for the Function (defaults to directory name)
  name: 's3JsonToNdjson',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts',
});