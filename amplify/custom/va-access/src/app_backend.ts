/**
 * @fileoverview
 * Backend application logic for the VA Access App, providing OAuth2 authentication,
 * session management, and FHIR patient data handling. Integrates with AWS Secrets Manager
 * for secure client credential retrieval and S3 for patient record storage.
 * 
 * Main features:
 * - Express server setup with EJS templating.
 * - OAuth2 authentication using Passport.js.
 * - Secure session management with express-session.
 * - Patient FHIR data retrieval and upload to AWS S3.
 * - Dynamic configuration via environment variables and AWS Secrets Manager.
 * - API endpoints for authentication, session value updates, and patient data processing.
 * 
 * @module app_backend
 */

import axios from 'axios';
import express, { Request, Response, NextFunction } from "express";
import 'os';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import crypto from 'crypto';

import { createBucketAndUploadFile } from './aws_backend_s3';

/**
 * Represents a user session with OAuth2 tokens and optional profile information.
 * @typedef {Object} User
 * @property {string} accessToken - The OAuth2 access token for the user.
 * @property {string} [refreshToken] - The OAuth2 refresh token for the user.
 * @property {Record<string, any>} [profile] - Optional user profile information.
 */

class User {
  accessToken!: string;
  refreshToken?: string;
  profile?: Record<string, any>;
};

import session from 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }

}
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import bodyParser from 'body-parser';


var patient_record = "No patient record retrieved yet.";
var main_location: string = "";
var kms_key: string = "";

/**
 * Represents the application environment configuration, including OAuth2 endpoints,
 * client credentials, and FHIR API settings.
 * 
 * @class
 * @property {string} env - The environment name (e.g., "sandbox").
 * @property {string} clientID - OAuth2 client ID.
 * @property {string} clientSecret - OAuth2 client secret.
 * @property {string} version - API version.
 * @property {string} redirect_uri - OAuth2 redirect URI.
 * @property {string} authorizationURL - OAuth2 authorization endpoint.
 * @property {string} tokenURL - OAuth2 token endpoint.
 * @property {string} nonce - Nonce for OAuth2 requests.
 * @property {string} scope - OAuth2 scopes.
 * @property {string} gatewayURL - Application gateway URL.
 * @property {string} patient_icn - Default patient ICN for FHIR queries.
 * @method updateClientSecrets - Asynchronously retrieves and updates client credentials from AWS Secrets Manager.
 */

class Environment {
  env: string = "sandbox";
  clientID: string = "";
  clientSecret: string = "";
  version: string = 'v1';
  redirect_uri: string = "";
  authorizationURL: string = "";
  tokenURL: string = "";
  nonce: string = crypto.randomBytes(32).toString('hex');
  scope: string = "profile openid offline_access launch/patient patient/AllergyIntolerance.read patient/Appointment.read patient/Binary.read patient/Condition.read patient/Device.read patient/DeviceRequest.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Encounter.read patient/Immunization.read patient/Location.read patient/Medication.read patient/MedicationOrder.read patient/MedicationRequest.read patient/MedicationStatement.read patient/Observation.read patient/Organization.read patient/Patient.read patient/Practitioner.read patient/PractitionerRole.read patient/Procedure.read";
  gatewayURL: string = "";
  patient_icn = "5000335";

  constructor() {

    this.gatewayURL = process.env.GATEWAY_URL || "";
    this.redirect_uri = `${this.gatewayURL}auth/cb`;
    this.authorizationURL = `https://${this.env}-api.va.gov/oauth2/health/${this.version}/authorization`;
    this.tokenURL = `https://${this.env}-api.va.gov/oauth2/health/${this.version}/token`;

    this.env = "sandbox";
  };
  async updateClientSecrets() {
    const secretPostfix = this.gatewayURL.split('//')[1]?.split('.')[0];
    const secretName = `dev/${secretPostfix}/va_client`;
    try {
      const client = new SecretsManagerClient();
      const response = await client.send(
        new GetSecretValueCommand({
          SecretId: secretName,
        })
      );
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        this.clientID = secret.client_id;
        this.clientSecret = secret.client_secret;

      } else {
        console.error(`Secret ${secretName} does not contain a string value.`);
        return undefined;
      }
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      return undefined;
    }
  }

};
let environment: Environment = new Environment();

/**
 * Configures Passport.js with OAuth2 strategy for authentication.
 * 
 * @function
 * @returns {void}
 */
const configurePassport = () => {

  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  interface OAuth2Profile {
    [key: string]: any; // Replace with specific fields if the structure of the profile is known
  }

  interface OAuth2CallbackParams {
    accessToken: string;
    refreshToken: string;
    profile: OAuth2Profile;
  }


  passport.use("oauth2", new OAuth2Strategy({
    authorizationURL: environment.authorizationURL,
    tokenURL: environment.tokenURL,
    clientID: environment.clientID,
    clientSecret: environment.clientSecret,
    scope: environment.scope,
    state: true,
    callbackURL: environment.redirect_uri

  },
    function (
      accessToken: string,
      refreshToken: string,
      profile: OAuth2Profile,
      cb: (error: any, user?: OAuth2CallbackParams) => void
    ) {
      cb(null, { accessToken, refreshToken, profile });
    }
  ));
}


/**
 * Middleware to handle OAuth2 authentication callback, process errors,
 * and establish user session.
 * 
 * @async
 * @function
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>}
 */
const wrapAuth = async (req: Request, res: Response, next: NextFunction) => {
  console.log('wrapAuth called');
  //Passport or OIDC don't seem to set 'err' if our Auth Server sets them in the URL as params so we need to do this to catch that instead of relying on callback
  if (req.query.error) {
    return next(req.query.error_description);
  }

  //console.log('wrapAuth response ', req.query);
  const code = req.query.code;

  passport.authenticate('oauth2', function (err: Error | null, user: User) {
    if (err) { return next(err) }
    if (!user) { return res.redirect(`${environment.gatewayURL}auth`) }
    req.session.user = user;
    res.redirect(`${environment.gatewayURL}home`);
  })(req, res, next);

};

/**
 * Checks if the user is logged in by verifying the session.
 * 
 * @function
 * @param {Request} req - Express request object.
 * @returns {boolean} True if user is logged in, false otherwise.
 */
const loggedIn = (req: Request) => {
  return req.session && req.session.user;
}
const app = express();

/**
 * Initializes and configures the Express application with authentication, session management,
 * and API endpoints for handling FHIR patient data and user sessions.
 *
 * - Sets up EJS as the view engine.
 * - Configures session management using `express-session` and custom session settings.
 * - Initializes Passport.js for OAuth2 authentication.
 * - Adds middleware for parsing JSON and URL-encoded request bodies.
 * - Defines the following routes:
 *   - `GET /home`: Renders the home page if the user is authenticated; otherwise, redirects to the login page.
 *   - `POST /patient`: Fetches FHIR patient data using the user's access token, uploads the data to a storage bucket,
 *     and redirects to a datastore creation endpoint. Handles errors and redirects as needed.
 *   - `PUT /set_session_values`: Updates application-wide session values (`main_location` and `kms_key`) from the request body.
 *   - `GET /auth`: Initiates the OAuth2 authentication flow using Passport.js.
 *   - `GET /auth/cb`: Handles the OAuth2 authentication callback.
 *
 * The function is designed to be invoked asynchronously at application startup.
 *
 * @async
 * @function
 */
const startApp = async () => {
  const secret = 'My Super Secret Secret'

  app.set('view engine', 'ejs')
  app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(session({ secret, cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));
  app.use(bodyParser.json()); // support json encoded bodies
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/home', (req: Request, res: Response) => {

    if (req.session && req.session.user) {
      const has_token = req.session.user?.accessToken !== undefined;

      res.render('home', { has_token, patient_record });

    } else {
      res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    }
  });

  app.post('/patient', (req: Request, res) => {
    console.log('Patient endpoint hit');
    if (req.session && req.session.user) {
      const access_token = req.session.user.accessToken;
      const has_token = access_token !== undefined;
      const patient_icn = req.body.patient_icn;

      const url = `https://${environment.env}-api.va.gov/services/fhir/v0/r4/Patient?_id=${patient_icn}`;

      const headers = {
        Authorization: `Bearer ${access_token}`,
        accept: 'application/fhir+json'
      };
      console.log('url', url);
      console.log('headers', headers);

      interface FhirResponse {
        data: any; // Replace `any` with a more specific type if the structure of the FHIR response is known
      }

      interface ErrorResponse {
        response?: {
          status: number;
          headers: Record<string, string>;
          data: any; // Replace `any` with a more specific type if the structure of the error response is known
        };
      }

      axios.get<FhirResponse>(url, {
        headers: headers
      })
        .then(async (response: { data: FhirResponse }) => {
          console.log('Patient response', response.data);
          patient_record = JSON.stringify(response.data, null, 2);
          try {
            const opjectKey = 'patient_record.json';
            const bucketName = await createBucketAndUploadFile(patient_icn, opjectKey, patient_record, kms_key);

            console.log('Created bucket', bucketName);
            const redirectUrl = `${main_location}create_datastore?patientId=${patient_icn}&patientBucket=${bucketName}&patientObjectKey=${opjectKey}`;

            res.redirect(redirectUrl);
          }
          catch (error) {
            console.error("Error creating bucket:", error);
            patient_record = `Error creating bucket:\n${error}`;
            res.redirect(`${environment.gatewayURL}home`);
          }
        })
        .catch((error: ErrorResponse) => {
          if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Request failed with response:', {
              status: error.response.status,
              headers: error.response.headers,
              data: error.response.data
            });
          }
          console.error(error);
        });


    } else {
      res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    }
  });

  app.put('/set_session_values', (req: Request, res) => {
    console.log('Patient endpoint hit');
    if (req.body.main_location && req.body.kms_key) {
      main_location = req.body.main_location;
      kms_key = req.body.kms_key;
      res.status(200).send({ message: "main_location and kms_key updated successfully" });
    } else {
      res.status(400).send({ error: "main_location and kms_kdy are required in the request body" });
    }
  });

  app.get('/auth', (req, res, next) => {
    console.log('Auth endpoint hit');
    passport.authenticate("oauth2")(req, res, next);
  });
  app.get('/auth/cb', wrapAuth);

}

(async () => {
  try {
    startApp();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

/**
 * Exports the Express app instance, environment configuration, and Passport configuration function.
 * @exports app
 * @exports environment
 * @exports configurePassport
 */
export { app, environment, configurePassport };
