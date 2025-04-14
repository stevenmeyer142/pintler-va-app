"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePassport = exports.environment = exports.app = void 0;
require('dotenv').config();
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
require("os");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const client_s3_1 = require("@aws-sdk/client-s3");
class User {
}
;
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const passport_oauth2_1 = __importDefault(require("passport-oauth2"));
const https_1 = __importDefault(require("https"));
//import sqlite3 from 'sqlite3';
const body_parser_1 = __importDefault(require("body-parser"));
var patient_record = "No patient record retrieved yet.";
class Environment {
    constructor() {
        this.env = "sandbox";
        this.clientID = "";
        this.clientSecret = "";
        this.version = 'v1';
        this.redirect_uri = "";
        this.authorizationURL = "";
        this.tokenURL = "";
        this.nonce = "14343103be036d10b974c40b6eb7c6553f0b91c0f766f1e3f7358d76c377bb8d"; // TODO: dynamically set Nonce
        this.scope = "profile openid offline_access launch/patient patient/AllergyIntolerance.read patient/Appointment.read patient/Binary.read patient/Condition.read patient/Device.read patient/DeviceRequest.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Encounter.read patient/Immunization.read patient/Location.read patient/Medication.read patient/MedicationOrder.read patient/MedicationRequest.read patient/MedicationStatement.read patient/Observation.read patient/Organization.read patient/Patient.read patient/Practitioner.read patient/PractitionerRole.read patient/Procedure.read";
        this.gatewayURL = "";
        this.patient_icn = "5000335";
        this.gatewayURL = process.env.GATEWAY_URL || "";
        this.redirect_uri = `${this.gatewayURL}auth/cb`;
        this.authorizationURL = `https://${this.env}-api.va.gov/oauth2/health/${this.version}/authorization`;
        this.tokenURL = `https://${this.env}-api.va.gov/oauth2/health/${this.version}/token`;
        this.env = "sandbox";
    }
    ;
    updateClientSecrets() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const secretPostfix = (_a = this.gatewayURL.split('//')[1]) === null || _a === void 0 ? void 0 : _a.split('.')[0];
            const secretName = `dev/${secretPostfix}/va_client`;
            try {
                const client = new client_secrets_manager_1.SecretsManagerClient();
                const response = yield client.send(new client_secrets_manager_1.GetSecretValueCommand({
                    SecretId: secretName,
                }));
                if (response.SecretString) {
                    const secret = JSON.parse(response.SecretString);
                    this.clientID = secret.client_id;
                    this.clientSecret = secret.client_secret;
                }
                else {
                    console.error(`Secret ${secretName} does not contain a string value.`);
                    return undefined;
                }
            }
            catch (error) {
                console.error(`Failed to retrieve secret ${secretName}:`, error);
                return undefined;
            }
        });
    }
    // list s3 buckets
    listS3Buckets() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Initializing S3 client...');
            const s3 = new client_s3_1.S3Client({
                logger: console, // Enable logging for S3Client
            });
            console.log('S3 client initialized:', s3);
            try {
                const command = new client_s3_1.ListBucketsCommand({});
                console.log('listS3Buckets command', command);
                const response = yield s3.send(command);
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
            }
            catch (error) {
                console.error('Error listing S3 buckets:', error);
            }
        });
    }
}
;
let environment = new Environment();
exports.environment = environment;
// const gatewayURL = "https://edxjyofsg3.execute-api.us-east-1.amazonaws.com/";
// const env = "sandbox"; // or "production"
// const patient_icn = "5000335";
// const clientID = "0oa13njziopZHpfgA2p8"; // process.env.CLIENT_ID;
// const clientSecret = "9geUDNUP5GtCdeVyAXI71Ryz6IAxeBrxbWOITpR2jRrKdjpgEh3He2gHXZUErDQy"; // process.env.CLIENT_SECRET;
// const version = 'v1';
// const redirect_uri = `${gatewayURL}auth/cb`;
// const authorizationURL = `https://${env}-api.va.gov/oauth2/health/${version}/authorization`;
// const tokenURL = `https://${env}-api.va.gov/oauth2/health/${version}/token`;
// const nonce = "14343103be036d10b974c40b6eb7c6553f0b91c0f766f1e3f7358d76c377bb8d";
// const scope = "profile openid offline_access launch/patient patient/AllergyIntolerance.read patient/Appointment.read patient/Binary.read patient/Condition.read patient/Device.read patient/DeviceRequest.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Encounter.read patient/Immunization.read patient/Location.read patient/Medication.read patient/MedicationOrder.read patient/MedicationRequest.read patient/MedicationStatement.read patient/Observation.read patient/Organization.read patient/Patient.read patient/Practitioner.read patient/PractitionerRole.read patient/Procedure.read";
class Row {
}
const configurePassport = () => {
    //const scope="profile openid offline_access claim.read claim.write";
    passport_1.default.serializeUser((user, done) => {
        //   console.log('serializeUser', user);
        done(null, user);
    });
    passport_1.default.deserializeUser((user, done) => {
        //   console.log('deserializeUser', user);
        done(null, user);
    });
    passport_1.default.use("oauth2", new passport_oauth2_1.default({
        authorizationURL: environment.authorizationURL,
        tokenURL: environment.tokenURL,
        clientID: environment.clientID,
        clientSecret: environment.clientSecret,
        scope: environment.scope,
        state: true,
        callbackURL: environment.redirect_uri
    }, function (accessToken, refreshToken, profile, cb) {
        cb(null, { accessToken, refreshToken, profile });
    }));
};
exports.configurePassport = configurePassport;
const userDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.session && req.session.user) {
        res.send(req.session.user);
        next();
    }
    else {
        res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        next();
    }
});
const verifyVeteranStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.session && req.session.user) {
        const access_token = req.session.user.accessToken;
        const has_token = access_token !== undefined;
        const veteranStatus = yield new Promise((resolve, reject) => {
            https_1.default.get(`https://${environment.env}-api.va.gov/services/veteran_verification/v2/status`, { headers: { 'Authorization': `Bearer ${access_token}` } }, (res) => {
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
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }).on('error', reject);
        });
        res.render('status', { has_token: has_token, veteranStatus: veteranStatus, user: req.session.user });
        next();
    }
    else {
        res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        next();
    }
});
const wrapAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('wrapAuth called');
    //Passport or OIDC don't seem to set 'err' if our Auth Server sets them in the URL as params so we need to do this to catch that instead of relying on callback
    if (req.query.error) {
        return next(req.query.error_description);
    }
    //console.log('wrapAuth response ', req.query);
    const code = req.query.code;
    passport_1.default.authenticate('oauth2', function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect(`${environment.gatewayURL}auth`);
        }
        req.session.user = user;
        res.redirect(`${environment.gatewayURL}home`);
    })(req, res, next);
});
const loggedIn = (req) => {
    return req.session && req.session.user;
};
const app = (0, express_1.default)();
exports.app = app;
const startApp = () => __awaiter(void 0, void 0, void 0, function* () {
    //  const port = 8081;
    const secret = 'My Super Secret Secret';
    // let db = new sqlite3.Database('./db/lighthouse.sqlite', (err) => {
    //   if (err) {
    //     return console.error(err.message);
    //   }
    //   console.log('Connected to SQlite database.');
    // });
    app.set('view engine', 'ejs');
    app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    app.use((0, express_session_1.default)({ secret, cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));
    app.use(body_parser_1.default.json()); // support json encoded bodies
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    var jsonParser = body_parser_1.default.json();
    app.post('/', (req, res) => {
        var _a;
        const has_token = ((_a = req.session.user) === null || _a === void 0 ? void 0 : _a.accessToken) !== undefined;
        const url = `https://${environment.env}-api.va.gov/oauth2/claims/${environment.version}/authorization?clientID=${environment.clientID}&nonce=${environment.nonce}&redirect_uri=${environment.redirect_uri}&response_type=code&scope=${environment.scope}&state=1589217940`;
        //console.log("\nAuthorization url ", url, "\n");
        if (req.session && req.session.user) {
            res.render('index', { has_token: has_token, autherizeLink: url });
        }
        else {
            res.render('index', { has_token: has_token, autherizeLink: url });
        }
    });
    app.get('/status', verifyVeteranStatus);
    app.get('/userdetails', userDetails);
    app.get('/coming_soon', (req, res) => {
        res.render('coming_soon', { has_token: {}, });
    });
    app.get('/home', (req, res) => {
        var _a;
        //  console.log('home req.session.user', req.session.user);
        if (req.session && req.session.user) {
            const has_token = ((_a = req.session.user) === null || _a === void 0 ? void 0 : _a.accessToken) !== undefined;
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
        }
        else {
            res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        }
    });
    app.get('/claims', (req, res) => {
        if (req.session && req.session.user) {
            const access_token = req.session.user.accessToken;
            const has_token = access_token !== undefined;
            axios_1.default.get(`https://${environment.env}-api.va.gov/services/claims/${environment.version}/claims`, {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            })
                .then(response => {
                res.render('claims', { claims: response.data.data, has_token: has_token });
            })
                .catch(error => {
                console.error(error);
            });
        }
        else {
            res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        }
    });
    app.post('/patient', jsonParser, (req, res) => {
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
            axios_1.default.get(url, {
                headers: headers
            })
                .then((response) => {
                console.log('Patient response', response.data);
                patient_record = JSON.stringify(response.data, null, 2);
                console.log('Patient record', patient_record);
                res.redirect(`${environment.gatewayURL}home`);
            })
                .catch((error) => {
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
        }
        else {
            res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        }
    });
    app.get('/claims/for/:id', (req, res) => {
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
        }
        else {
            res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        }
    });
    app.post('/users', (req, res) => {
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
        passport_1.default.authenticate("oauth2")(req, res, next);
    });
    app.get('/auth/cb', wrapAuth);
    app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const has_token = ((_a = req.session.user) === null || _a === void 0 ? void 0 : _a.accessToken) !== undefined;
        const url = `https://${environment.env}-api.va.gov/oauth2/claims/${environment.version}/authorization?clientID=${environment.clientID}&nonce=${environment.nonce}&redirect_uri=${environment.redirect_uri}&response_type=code&scope=${environment.scope}&state=1589217940`;
        //console.log("\nAuthorization url ", url, "\n");
        if (req.session && req.session.user) {
            res.render('index', { has_token: has_token, autherizeLink: url });
        }
        else {
            res.render('index', { has_token: has_token, autherizeLink: url });
        }
    }));
    //  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //  configurePassport();
        startApp();
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}))();
