require('dotenv').config();
import axios from 'axios';
import express, { Request, Response, NextFunction } from "express";
import 'os';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import cors  from 'cors';



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
//import sqlite3 from 'sqlite3';
import bodyParser from 'body-parser';


var patient_record = "No patient record retrieved yet.";
var main_location: string = "";

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

  // list s3 buckets
  async listS3Buckets() {
    console.log('Initializing S3 client...');
    const s3 = new S3Client({
      logger: console, // Enable logging for S3Client
    });
    console.log('S3 client initialized:', s3);
    try {
      const command = new ListBucketsCommand({});
      console.log('listS3Buckets command', command);
      const response = await s3.send(command);
      console.log('listS3Buckets response', response);
      if (response.Buckets) {
        console.log('S3 Buckets:');
        response.Buckets.forEach((bucket) => {
          console.log(`- ${bucket.Name}`);
        });
      }
      else {
        console.log('No S3 buckets found.');
      }
    } catch (error) {
      console.error('Error listing S3 buckets:', error);
    }
  }
  // list secrets
};
let environment: Environment = new Environment();


class Row {
  first_name!: string;
  last_name!: string;
  social_security_number!: string;
  birth_date!: string;
}

const configurePassport = () => {
  //const scope="profile openid offline_access claim.read claim.write";
  passport.serializeUser((user: Express.User, done) => {
    //   console.log('serializeUser', user);
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    //   console.log('deserializeUser', user);
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

const userDetails = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    res.send(req.session.user);
    next();
  } else {
    res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    next();
  }
}

const verifyVeteranStatus = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session && req.session.user) {
    const access_token = req.session.user.accessToken;
    const has_token = access_token !== undefined;
    const veteranStatus = await new Promise((resolve, reject) => {
      https.get(
        `https://${environment.env}-api.va.gov/services/veteran_verification/v2/status`,
        { headers: { 'Authorization': `Bearer ${access_token}` } },
        (res) => {
          let rawData = '';
          if (res.statusCode !== 200) {
            reject(new Error('Request Failed'));
          }
          res.setEncoding('utf-8');
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            try {
              const parsedOutput = JSON.parse(rawData);
              resolve(parsedOutput.data.attributes.veteran_status);
            } catch (err) {
              reject(err);
            }
          });
        }
      ).on('error', reject);
    });
    res.render('status', { has_token: has_token, veteranStatus: veteranStatus, user: req.session.user });
    next();
  } else {
    res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    next();
  }
};


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

  //  const port = 8081;
  const secret = 'My Super Secret Secret'
  // let db = new sqlite3.Database('./db/lighthouse.sqlite', (err) => {
  //   if (err) {
  //     return console.error(err.message);
  //   }
  //   console.log('Connected to SQlite database.');
  // });

  app.set('view engine', 'ejs')
  app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(session({ secret, cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));
  app.use(bodyParser.json()); // support json encoded bodies
  app.use(bodyParser.urlencoded({ extended: true }));
 
 // app.use(cors);

  app.post('/', (req: Request, res) => {
    const has_token = req.session.user?.accessToken !== undefined;

    const url = `https://${environment.env}-api.va.gov/oauth2/claims/${environment.version}/authorization?clientID=${environment.clientID}&nonce=${environment.nonce}&redirect_uri=${environment.redirect_uri}&response_type=code&scope=${environment.scope}&state=1589217940`;

    //console.log("\nAuthorization url ", url, "\n");
    if (req.session && req.session.user) {
      res.render('index', { has_token: has_token, autherizeLink: url })
    } else {
      res.render('index', { has_token: has_token, autherizeLink: url })
    }
  });

  app.get('/status', verifyVeteranStatus);
  app.get('/userdetails', userDetails);
  app.get('/coming_soon', (req: Request, res) => {
    res.render('coming_soon', { has_token: {}, })
  })

  app.get('/home', (req: Request, res: Response) => {
    //  console.log('home req.session.user', req.session.user);
    if (req.session && req.session.user) {
      const has_token = req.session.user?.accessToken !== undefined;
      // db.all(sql, [], (err:NodeJS.ErrnoException, rows:[Row]) => {
      //   if (err) {
      //     throw err;
      //   }
      //   rows.forEach((row) => {
      //     users.push(row)
      //   });
      //   res.render('home', { has_token, users });
      // });

      res.render('home', { has_token, patient_record });

    } else {
      res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    }
  });

  app.get('/claims', (req: Request, res) => {
    if (req.session && req.session.user) {
      const access_token = req.session.user.accessToken;
      const has_token = access_token !== undefined;
      axios.get(`https://${environment.env}-api.va.gov/services/claims/${environment.version}/claims`, {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      })
        .then(response => {
          res.render('claims', { claims: response.data.data, has_token: has_token });
        })
        .catch(error => {
          console.error(error)
        })
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
        .then((response: { data: FhirResponse }) => {
          console.log('Patient response', response.data);
          patient_record = JSON.stringify(response.data, null, 2);
          console.log('Patient record', patient_record);
          res.redirect(`${environment.gatewayURL}home`);
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
    if (req.body.main_location) {
      main_location = req.body.main_location;
      res.status(200).send({ message: "main_location updated successfully" });
    } else {
      res.status(400).send({ error: "main_location is required in the request body" });
    }
  });

  app.get('/claims/for/:id', (req: Request, res) => {
    if (req.session && req.session.user) {
      const id = req.params.id;
      const users = [];
      const sql = `SELECT id, first_name, last_name, social_security_number, birth_date FROM veterans where id = ?`;
      const access_token = req.session.user.accessToken;
      const has_token = access_token !== undefined;
      // db.get(sql, [id], (err: Error | null, row: { first_name: string; last_name: string; social_security_number: string; birth_date: string }) => {
      //   if (err) {
      //     throw err;
      //   }
      //   const url = `https://${env}-api.va.gov/services/claims/v1/claims`;
      //   const headers = {
      //     Authorization: `Bearer ${access_token}`,
      //     'X-VA-First-Name': row.first_name,
      //     'X-VA-Last-Name': row.last_name,
      //     'X-VA-Birth-Date': row.birth_date,
      //     'X-VA-SSN': row.social_security_number
      //   };
      //   console.log('url', url);
      //   console.log('headers', headers);

      //   axios.get(url, {
      //     headers: headers
      //   })
      //   .then(response => {
      //     res.render('claims', { user: `${row.first_name} ${row.last_name}`, claims: response.data.data, has_token: has_token });
      //   })
      //   .catch(error => {
      //     console.log(error)
      //     console.log('Iam error')
      //   })
      // });

    } else {
      res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
    }
  });

  app.post('/users', (req: Request, res) => {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const social_security_number = req.body.ssn;
    const birth_date = req.body.birth_date;
    console.log(first_name);
    console.log(last_name);
    console.log(social_security_number);
    console.log(birth_date);
    // db.run('INSERT INTO veterans(first_name, last_name, social_security_number, birth_date) VALUES(?, ?, ?, ?)', [first_name, last_name, social_security_number, birth_date], (err) => {
    //   if(err) {
    //     return console.log(err.message);
    //   }

    //   res.redirect('/home');
    // })
  });

  app.get('/auth', (req, res, next) => {
    console.log('Auth endpoint hit');
    passport.authenticate("oauth2")(req, res, next);
  });
  app.get('/auth/cb', wrapAuth);

  
  app.get('/return_toapp', (req, res) => {
    console.log('return_toapp endpoint hit main_location', main_location);
    const patientName = req.query.patientName || "Unknown";
    const patientID = req.query.patientID || "Unknown";
    console.log(`Patient Name: ${patientName}, Patient ID: ${patientID}`);
    const redirectUrl = `${main_location}/display_patient?patientName=${patientName}&patientID=${patientID}`;
 
    res.redirect(redirectUrl);
  });

  app.get('/', async (req: Request, res) => {
    const has_token = req.session.user?.accessToken !== undefined;
    console.log('Headers:', req.headers);
    const mainUrlHeader = req.headers['main-url'] || 'http://localhost:5173';
    main_location = Array.isArray(mainUrlHeader) ? mainUrlHeader[0] : mainUrlHeader;
    console.log('main_location', main_location);

    const url = `https://${environment.env}-api.va.gov/oauth2/claims/${environment.version}/authorization?clientID=${environment.clientID}&nonce=${environment.nonce}&redirect_uri=${environment.redirect_uri}&response_type=code&scope=${environment.scope}&state=1589217940`;

    //console.log("\nAuthorization url ", url, "\n");
    if (req.session && req.session.user) {
      res.render('index', { has_token: has_token, autherizeLink: url })
    } else {
      res.render('index', { has_token: has_token, autherizeLink: url })
    }
  });

  //  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}

(async () => {
  try {
    //  configurePassport();
    startApp();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

export { app, environment, configurePassport };
