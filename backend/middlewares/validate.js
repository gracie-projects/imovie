import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

/** Runs the given express-validator chains and responds 400 with field errors on failure. */
export const validate = (chains) => async (req, _res, next) => {
  for (const chain of chains) await chain.run(req);
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  next(ApiError.badRequest(errors[0].message, errors));
};

/** Rejects malformed :id style params before they reach the database. */
export const validateObjectId =
  (...params) =>
  (req, _res, next) => {
    for (const name of params) {
      if (!mongoose.isValidObjectId(req.params[name])) return next(ApiError.badRequest(`Invalid ${name}`));
    }
    next();
  };
