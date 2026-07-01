// Core policy-admin system (mock of enterprise core) — local dev entrypoint.
const app = require('./src/app');

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`[core-policy-system] listening on :${PORT}`));
