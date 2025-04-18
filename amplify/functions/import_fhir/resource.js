"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sayHello = void 0;
const backend_1 = require("@aws-amplify/backend");
exports.sayHello = (0, backend_1.defineFunction)({
    // optionally specify a name for the Function (defaults to directory name)
    name: 'say-hello',
    // optionally specify a path to your handler (defaults to "./handler.ts")
    entry: './handler.ts'
});
