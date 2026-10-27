import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';

export const AUTH_COOKIE = 'imovies_token';

const cookieBase = () => ({
  httpOnly: true,
  secure: env.isProduction || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
});

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function setAuthCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(AUTH_COOKIE, token, { ...cookieBase(), expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, cookieBase());
}

export { cookieBase };

async function resolveUser(req) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
  // Always load the user so that role changes and deleted accounts take effect immediately.
  return User.findById(payload.sub).select('username email role isDemoAccount').lean();
}

/** Requires a valid session. The user's role is read from the database, not trusted from the token. */
export async function requireAuth(req, _res, next) {
  const user = await resolveUser(req);
  if (!user || user.isDemoAccount) return next(ApiError.unauthorized());
  req.user = user;
  next();
}

/** Attaches req.user when a valid session exists, but never rejects the request. */
export async function optionalAuth(req, _res, next) {
  const user = await resolveUser(req);
  if (user && !user.isDemoAccount) req.user = user;
  next();
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'admin') return next(ApiError.forbidden('Administrator access required'));
  next();
}
