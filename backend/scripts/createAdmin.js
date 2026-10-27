/**
 * Creates the first administrator, or promotes an existing account to administrator.
 *
 * Credentials are read from environment variables so they never appear in source code
 * or in the shell history as plain arguments:
 *
 *   ADMIN_NAME=Admin ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run create-admin
 *
 * (or put the three values in backend/.env, run the command, then delete them again).
 * An existing account is promoted without touching its password unless --reset-password is passed.
 */
import env, { assertRequiredEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/userModel.js';

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

async function main() {
  assertRequiredEnv();
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  const username = (process.env.ADMIN_NAME || 'Administrator').trim();
  const resetPassword = process.argv.includes('--reset-password');

  if (!email) throw new Error('Set ADMIN_EMAIL (and ADMIN_PASSWORD for a new account) before running this script.');

  await connectDB(env.MONGODB_URI);
  let user = await User.findOne({ email }).select('+passwordHash');

  if (user) {
    user.role = 'admin';
    if (resetPassword) {
      if (!PASSWORD_RULE.test(password)) throw new Error('ADMIN_PASSWORD must be 8-72 characters with at least one letter and one number.');
      await user.setPassword(password);
    }
    await user.save();
    console.log(`Existing account ${email} now has the admin role${resetPassword ? ' and a new password' : ''}.`);
  } else {
    if (!PASSWORD_RULE.test(password)) throw new Error('ADMIN_PASSWORD must be 8-72 characters with at least one letter and one number.');
    user = new User({ username, email, role: 'admin' });
    await user.setPassword(password);
    await user.save();
    console.log(`Administrator account created for ${email}.`);
  }
  console.log('Remove ADMIN_PASSWORD from your environment / .env file now that the account exists.');
}

main()
  .catch((err) => {
    console.error(`\n[create-admin] ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
