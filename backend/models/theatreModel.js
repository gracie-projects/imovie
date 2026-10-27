import mongoose from 'mongoose';
import seatLayoutSchema from './seatLayoutSchema.js';
import { totalSeats } from '../utils/seatLayout.js';

const theatreSchema = new mongoose.Schema(
  {
    theatreName: { type: String, required: [true, 'Theatre name is required'], trim: true, maxlength: 100 },
    city: { type: String, required: [true, 'City is required'], trim: true, maxlength: 60 },
    address: { type: String, required: [true, 'Address is required'], trim: true, maxlength: 200 },
    screens: { type: [String], default: ['Screen 1'] },
    amenities: { type: [String], default: [] },
    seatLayout: { type: seatLayoutSchema, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

theatreSchema.index({ theatreName: 1, city: 1 }, { unique: true });
theatreSchema.index({ city: 1 });

theatreSchema.virtual('totalSeats').get(function getTotalSeats() {
  return totalSeats(this.seatLayout);
});

export default mongoose.model('Theatre', theatreSchema);
