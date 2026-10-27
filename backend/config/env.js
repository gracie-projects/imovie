import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  PORT: toInt(process.env.PORT, 5000),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  // Comma-separated list of allowed browser origins.
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  // "lax" works when the frontend and API share a site (Vite proxy in development,
  // or a rewrite on the frontend host). Use "none" only when the frontend and API
  // are on different sites; that requires HTTPS.
  COOKIE_SAMESITE: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  SEAT_HOLD_MINUTES: toInt(process.env.SEAT_HOLD_MINUTES, 8),
  MAX_SEATS_PER_BOOKING: toInt(process.env.MAX_SEATS_PER_BOOKING, 10),
  CANCELLATION_CUTOFF_HOURS: toInt(process.env.CANCELLATION_CUTOFF_HOURS, 2),
  PAYMENT_PROVIDER: (process.env.PAYMENT_PROVIDER || 'demo').toLowerCase(),
};

/**
 * Fail fast with an actionable message instead of crashing later with a cryptic error.
 */
export function assertRequiredEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}.\n` +
        'Copy backend/.env.example to backend/.env and fill in the values.'
    );
  }
  if (env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long. Generate one with:\n' +
        '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
  if (!['lax', 'strict', 'none'].includes(env.COOKIE_SAMESITE)) {
    throw new Error('COOKIE_SAMESITE must be one of: lax, strict, none');
  }
  if (env.PAYMENT_PROVIDER !== 'demo') {
    throw new Error(`PAYMENT_PROVIDER "${env.PAYMENT_PROVIDER}" is not implemented. Only "demo" is available.`);
  }
}

export const allowedOrigins = () =>
  env.CLIENT_URL.split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

export default env;
