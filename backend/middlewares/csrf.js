import crypto from 'node:crypto';
import ApiError from '../utils/ApiError.js';
import { cookieBase } from './auth.js';

/**
 * Double-submit CSRF protection.
 *
 * GET /api/auth/csrf-token stores a random token in an HttpOnly cookie and returns the same
 * token in the response body. The frontend keeps it in memory and sends it in the
 * X-CSRF-Token header with every state-changing request. A malicious site can make the
 * browser send the cookie, but it cannot read the token, so the header will not match.
 */
export const CSRF_COOKIE = 'imovies_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken(req, res) {
  const existing = req.cookies?.[CSRF_COOKIE];
  const token = existing && /^[a-f0-9]{64}$/.test(existing) ? existing : crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, cookieBase());
  res.json({ csrfToken: token });
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== headerToken.length ||
    !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return next(new ApiError(403, 'Invalid or missing CSRF token. Refresh the page and try again.', { code: 'CSRF' }));
  }
  next();
}
