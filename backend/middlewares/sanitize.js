/**
 * Strips keys that start with "$" or contain "." from JSON bodies, so a client cannot smuggle
 * MongoDB operators such as {"email": {"$ne": null}} into a query.
 * (Express 5 parses query strings with the "simple" parser, which never produces nested objects.)
 */
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(val);
    }
    return out;
  }
  return value;
}

export default function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
}
