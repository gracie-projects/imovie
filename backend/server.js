import env, { assertRequiredEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { expireStaleHolds } from './services/bookingService.js';

async function start() {
  try {
    assertRequiredEnv();
    await connectDB(env.MONGODB_URI);
  } catch (err) {
    console.error(`\n[startup] ${err.message}\n`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`IMovies API listening on http://localhost:${env.PORT} (${env.NODE_ENV}, payments: ${env.PAYMENT_PROVIDER})`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[startup] Port ${env.PORT} is already in use. Stop the other process or set PORT in backend/.env.\n`);
    } else {
      console.error('[startup]', err);
    }
    process.exit(1);
  });

  // Housekeeping for abandoned checkouts. Seat availability never depends on this job.
  const cleanup = setInterval(() => {
    expireStaleHolds().catch((err) => console.error('[cleanup]', err.message));
  }, 60 * 1000);

  const shutdown = () => {
    clearInterval(cleanup);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
