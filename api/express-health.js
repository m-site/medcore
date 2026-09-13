import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(rateLimit({ windowMs: 60_000, limit: 10, validate: { xForwardedForHeader: false } }));
app.get('/api/express-health', (_request, response) => response.json({ ok: true }));
export default app;
