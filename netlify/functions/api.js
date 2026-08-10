const serverless = require('serverless-http');
const app = require('../../server/app');

// Wrap the Express app configuration in serverless-http handler
module.exports.handler = serverless(app);
