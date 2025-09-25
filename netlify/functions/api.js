const serverless = require('serverless-http');
const app = require('../../server-service-account');

module.exports.handler = serverless(app);
