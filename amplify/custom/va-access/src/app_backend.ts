require('dotenv').config(); // TODO: This is probably not needed.
import axios from 'axios';
import express, { Request, Response, NextFunction } from "express";
import 'os';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { createBucketAndUploadFile } from './aws_backend_s3';


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
import https from 'https';
import bodyParser from 'body-parser';


var patient_record = "No patient record retrieved yet.";
var main_location: string = "";
var kms_key: string = "";

class Environment {
  env: string = "sandbox";
  clientID: string = "";
  clientSecret: string = "";
  version: string = 'v1';
  redirect_uri: string = "";
  authorizationURL: string = "";
  tokenURL: string = "";
  nonce: string = "14343103be036d10b974c40b6eb7c6553f0b91c0f766f1e3f7358d76c377bb8d"; // TODO: dynamically set Nonce
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


class Row {
  first_name!: string;
  last_name!: string;
  social_security_number!: string;
  birth_date!: string;
}

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

const loggedIn = (req: Request) => {
  return req.session && req.session.user;
}
const app = express();

const startApp = async () => {
  const secret = 'My Super Secret Secret'

  app.set('view engine', 'ejs')
  app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(session({ secret, cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));
  app.use(bodyParser.json()); // support json encoded bodies
  app.use(bodyParser.urlencoded({ extended: true }));


  app.post('/', (req: Request, res) => {
    const has_token = req.session.user?.accessToken !== undefined;

    const url = `https://${environment.env}-api.va.gov/oauth2/claims/${environment.version}/authorization?clientID=${environment.clientID}&nonce=${environment.nonce}&redirect_uri=${environment.redirect_uri}&response_type=code&scope=${environment.scope}&state=1589217940`;

    // TODO: why are these the same for if and else?
    if (req.session && req.session.user) {
      res.render('index', { has_token: has_token, autherizeLink: url })
    } else {
      res.render('index', { has_token: has_token, autherizeLink: url })
    }
  });

  
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
          const redirectUrl = `${main_location}display_patient?patientId=${patient_icn}&patientBucket=${bucketName}&patientObjectKey=${opjectKey}`;
 
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

  
  // app.get('/return_toapp', (req, res) => {
  //   console.log('return_toapp endpoint hit main_location', main_location);
  //   const patientName = req.query.patientName || "Unknown";
  //   const patientID = req.query.patientID || "Unknown";
  //   console.log(`Patient Name: ${patientName}, Patient ID: ${patientID}`);
  //   const redirectUrl = `${main_location}/patient_import?patientName=${patientName}&patientID=${patientID}`;
 
  //   res.redirect(redirectUrl);
  // });
}

(async () => {
  try {
    startApp();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

export { app, environment, configurePassport };
