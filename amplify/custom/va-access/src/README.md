# VA Access AWS Lambda Express Server.

This AWS Lambda function was derived from the following code.
[vets-api-clients](https://github.com/department-of-veterans-affairs/vets-api-clients)

Specifically the code in the folder "samples/oauth_node".

# Building the code.

Because the code is TypeScript, it must be converted into JavaScript to run in the Lambda function.

The script "amplify/custom/va-access/build.sh", converts the TypeScript to JavaScript. When using the Amplify sandbox, this script must be run manually.

When building in the AWS Console as an Amplify App, this script is run automatically as configured in "amplify.yml".