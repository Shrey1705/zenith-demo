// Core policy-admin system (mock of enterprise core) — port 4001
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ service: 'core-policy-system', status: 'up' }));
app.use('/v2', require('./src/routes/proposals'));
app.use('/v2', require('./src/routes/payments'));

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`[core-policy-system] listening on :${PORT}`));
