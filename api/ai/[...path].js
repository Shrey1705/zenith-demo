// Vercel serverless entrypoint for ai-feasibility-service.
// Delegates to the same Express app used by ai-service/server.js in
// local dev — no business logic lives here, just the /api/ai prefix strip.
const app = require('../../ai-service/src/app');

module.exports = (req, res) => {
  req.url = req.url.replace(/^\/api\/ai/, '') || '/';
  return app(req, res);
};
