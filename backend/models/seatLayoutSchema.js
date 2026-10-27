import mongoose from 'mongoose';
import { validateLayout, MAX_SEATS_PER_ROW } from '../utils/seatLayout.js';

const sectionSchema = new mongoose.Schema(
  {
    rows: { type: Number, required: true, min: 0, max: 26 },
    seatsPerRow: { type: Number, required: true, min: 1, max: MAX_SEATS_PER_ROW },
    price: { type: Number, required: true, min: 0, max: 10000 },
  },
  { _id: false }
);

/** Structured seat layout used by both theatres and (as a snapshot) by shows. */
const seatLayoutSchema = new mongoose.Schema(
  {
    lower: { type: sectionSchema, required: true },
    middle: { type: sectionSchema, required: true },
    balcony: { type: sectionSchema, required: true },
  },
  { _id: false }
);

seatLayoutSchema.path('lower').validate(function checkWholeLayout() {
  const errors = validateLayout(this.toObject ? this.toObject() : this);
  return errors.length === 0;
}, 'Invalid seat layout (max 26 rows in total, at least one row)');

export default seatLayoutSchema;
