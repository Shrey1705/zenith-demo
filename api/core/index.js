// Vercel serverless entrypoint for core-policy-system.
// Delegates to the same Express app used by core-service/server.js in
// local dev — no business logic lives here, just the /api/core prefix strip.
const app = require('../../core-service/src/app');

module.exports = (req, res) => {
  req.url = req.url.replace(/^\/api\/core/, '') || '/';
  return app(req, res);
};
