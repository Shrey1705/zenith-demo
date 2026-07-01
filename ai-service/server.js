// AI feasibility portal backend — local dev entrypoint.
const app = require('./src/app');

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`[ai-feasibility-service] listening on :${PORT}`));
