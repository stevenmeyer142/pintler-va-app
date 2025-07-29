"use strict";
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
const axios_1 = __importDefault(require("axios"));
const express_1 = __importDefault(require("express"));
require("os");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const crypto_1 = __importDefault(require("crypto"));
const aws_backend_s3_1 = require("./aws_backend_s3");
/**
 * Represents a user session with OAuth2 tokens and optional profile information.
 * @typedef {Object} User
 * @property {string} accessToken - The OAuth2 access token for the user.
 * @property {string} [refreshToken] - The OAuth2 refresh token for the user.
 * @property {Record<string, any>} [profile] - Optional user profile information.
 */
class User {
}
;
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const passport_oauth2_1 = __importDefault(require("passport-oauth2"));
const body_parser_1 = __importDefault(require("body-parser"));
var patient_record = "No patient record retrieved yet.";
var main_location = "";
var kms_key = "";
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
    constructor() {
        this.env = "sandbox";
        this.clientID = "";
        this.clientSecret = "";
        this.version = 'v1';
        this.redirect_uri = "";
        this.authorizationURL = "";
        this.tokenURL = "";
        this.nonce = crypto_1.default.randomBytes(32).toString('hex');
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
}
;
let environment = new Environment();
exports.environment = environment;
/**
 * Configures Passport.js with OAuth2 strategy for authentication.
 *
 * @function
 * @returns {void}
 */
const configurePassport = () => {
    passport_1.default.serializeUser((user, done) => {
        done(null, user);
    });
    passport_1.default.deserializeUser((user, done) => {
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
/**
 * Checks if the user is logged in by verifying the session.
 *
 * @function
 * @param {Request} req - Express request object.
 * @returns {boolean} True if user is logged in, false otherwise.
 */
const loggedIn = (req) => {
    return req.session && req.session.user;
};
const app = (0, express_1.default)();
exports.app = app;
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
const startApp = () => __awaiter(void 0, void 0, void 0, function* () {
    const secret = 'My Super Secret Secret';
    app.set('view engine', 'ejs');
    app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    app.use((0, express_session_1.default)({ secret, cookie: { maxAge: 60000 }, resave: true, saveUninitialized: true }));
    app.use(body_parser_1.default.json()); // support json encoded bodies
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    app.get('/home', (req, res) => {
        var _a;
        if (req.session && req.session.user) {
            const has_token = ((_a = req.session.user) === null || _a === void 0 ? void 0 : _a.accessToken) !== undefined;
            res.render('home', { has_token, patient_record });
        }
        else {
            res.redirect(`${environment.gatewayURL}auth`); // Redirect the user to login if they are not
        }
    });
    app.post('/patient', (req, res) => {
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
                .then((response) => __awaiter(void 0, void 0, void 0, function* () {
                console.log('Patient response', response.data);
                patient_record = JSON.stringify(response.data, null, 2);
                try {
                    const opjectKey = 'patient_record.json';
                    const bucketName = yield (0, aws_backend_s3_1.createBucketAndUploadFile)(patient_icn, opjectKey, patient_record, kms_key);
                    console.log('Created bucket', bucketName);
                    const redirectUrl = `${main_location}create_datastore?patientId=${patient_icn}&patientBucket=${bucketName}&patientObjectKey=${opjectKey}`;
                    res.redirect(redirectUrl);
                }
                catch (error) {
                    console.error("Error creating bucket:", error);
                    patient_record = `Error creating bucket:\n${error}`;
                    res.redirect(`${environment.gatewayURL}home`);
                }
            }))
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
    app.put('/set_session_values', (req, res) => {
        console.log('Patient endpoint hit');
        if (req.body.main_location && req.body.kms_key) {
            main_location = req.body.main_location;
            kms_key = req.body.kms_key;
            res.status(200).send({ message: "main_location and kms_key updated successfully" });
        }
        else {
            res.status(400).send({ error: "main_location and kms_kdy are required in the request body" });
        }
    });
    app.get('/auth', (req, res, next) => {
        console.log('Auth endpoint hit');
        passport_1.default.authenticate("oauth2")(req, res, next);
    });
    app.get('/auth/cb', wrapAuth);
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        startApp();
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}))();
