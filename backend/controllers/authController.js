import bcrypt from 'bcryptjs';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middlewares/auth.js';
import { GENRES } from '../models/movieModel.js';

// Compared against when the email does not exist, so response time does not reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync('timing-equalisation-only', 12);

function sendSession(res, user, status = 200) {
  setAuthCookie(res, signToken(user));
  res.status(status).json({ success: true, user: user.toJSON() });
}

export async function register(req, res) {
  const { username, email, password } = req.body;
  // The role is never taken from the request: public sign-ups are always regular users.
  const user = new User({ username, email, role: 'user' });
  await user.setPassword(password);
  await user.save();
  sendSession(res, user, 201);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
  const valid = user && !user.isDemoAccount ? await user.comparePassword(password) : await bcryptDummy(password);
  if (!user || !valid) throw ApiError.unauthorized('Invalid email or password');
  sendSession(res, user);
}

async function bcryptDummy(password) {
  await bcrypt.compare(String(password), DUMMY_HASH);
  return false;
}

export function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
}

/** Like /me, but answers 200 with user: null for visitors, so the app's startup check is not an error. */
export async function session(req, res) {
  const user = req.user ? await User.findById(req.user._id) : null;
  res.json({ success: true, user });
}

export async function me(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.unauthorized();
  res.json({ success: true, user });
}

export async function updateProfile(req, res) {
  const allowed = ['username', 'phone', 'city', 'favoriteGenres'];
  const updates = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  if (updates.favoriteGenres) updates.favoriteGenres = updates.favoriteGenres.filter((g) => GENRES.includes(g));
  const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
  res.json({ success: true, user });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  await user.setPassword(newPassword);
  await user.save();
  sendSession(res, user);
}
