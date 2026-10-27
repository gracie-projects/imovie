// Must be imported before anything that reads config/env.js.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/imovies_test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-the-startup-check-0123456789';
process.env.PAYMENT_PROVIDER = 'demo';
process.env.SEAT_HOLD_MINUTES = '8';
process.env.CANCELLATION_CUTOFF_HOURS = '2';
