import mongoose from 'mongoose';
import seatLayoutSchema from './seatLayoutSchema.js';

export const SHOW_FORMATS = ['2D', '3D', 'IMAX', '4DX'];

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screen: { type: String, trim: true, default: 'Screen 1', maxlength: 40 },
    startsAt: { type: Date, required: [true, 'Show date and time are required'] },
    format: { type: String, enum: SHOW_FORMATS, default: '2D' },
    language: { type: String, trim: true, maxlength: 40 },
    // Snapshot of the theatre layout (with this show's prices) taken when the show is created,
    // so later theatre edits never change seat ids or prices of an existing show.
    seatLayout: { type: seatLayoutSchema, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

showSchema.index({ theatre: 1, screen: 1, startsAt: 1 }, { unique: true });
showSchema.index({ movie: 1, startsAt: 1 });
showSchema.index({ startsAt: 1, isActive: 1 });

export default mongoose.model('Show', showSchema);
