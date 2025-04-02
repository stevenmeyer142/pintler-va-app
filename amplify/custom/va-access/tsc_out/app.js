"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const compression_1 = __importDefault(require("compression"));
const serverless_express_1 = require("@codegenie/serverless-express");
const ejs = require("ejs").__express;
const app = (0, express_1.default)();
exports.app = app;
const router = express_1.default.Router();
app.set("view engine", "ejs");
app.engine(".ejs", ejs);
router.use((0, compression_1.default)());
router.use((0, cors_1.default)({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
}));
router.use(express_1.default.json());
router.use(express_1.default.urlencoded({ extended: true }));
const client_id = "client_id";
// NOTE: tests can't find the views directory without this
app.set("views", path_1.default.join(__dirname, "views"));
router.get("/", (req, res) => {
    console.log("Request parameters:", req.params);
    const currentInvoke = (0, serverless_express_1.getCurrentInvoke)();
    const { event = {} } = currentInvoke;
    const { requestContext = {} } = event;
    const { domainName = "localhost:3000" } = requestContext;
    const apiUrl = `https://${domainName}`;
    return res.render("index", {
        apiUrl, client_id
    });
});
router.post("/", (req, res) => {
    console.log("Request parameters:", req.params);
    console.log("Request body:", req.body);
    const currentInvoke = (0, serverless_express_1.getCurrentInvoke)();
    const { event = {} } = currentInvoke;
    const { requestContext = {} } = event;
    const { domainName = "localhost:3000" } = requestContext;
    const apiUrl = `https://${domainName}`;
    return res.render("index", {
        apiUrl, client_id
    });
});
router.get("/code-genie-logo", (req, res) => {
    return res.sendFile(path_1.default.join(__dirname, "code-genie-logo.png"));
});
router.get("/users", (req, res) => {
    return res.json(users);
});
router.get("/users/:userId", (req, res) => {
    const user = getUser(req.params.userId);
    if (!user)
        return res.status(404).json({});
    return res.json(user);
});
router.post("/users", (req, res) => {
    const user = {
        id: ++userIdCounter,
        name: req.body.name,
    };
    users.push(user);
    return res.status(201).json(user);
});
router.put("/users/:userId", (req, res) => {
    const user = getUser(req.params.userId);
    if (!user)
        return res.status(404).json({});
    user.name = req.body.name;
    return res.json(user);
});
router.delete("/users/:userId", (req, res) => {
    const userIndex = getUserIndex(req.params.userId);
    if (userIndex === -1)
        return res.status(404).json({});
    users.splice(userIndex, 1);
    return res.json(users);
});
router.get("/cookie", (req, res) => {
    res.cookie("Foo", "bar");
    res.cookie("Fizz", "buzz");
    return res.json({});
});
const getUser = (userId) => users.find((u) => u.id === parseInt(userId));
const getUserIndex = (userId) => users.findIndex((u) => u.id === parseInt(userId));
// Ephemeral in-memory data store
const users = [
    {
        id: 1,
        name: "Joe",
    },
    {
        id: 2,
        name: "Jane",
    },
];
let userIdCounter = users.length;
// The serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)
app.use("/", router);
