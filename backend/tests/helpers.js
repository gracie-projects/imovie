import './setupEnv.js';
import mongoose from 'mongoose';
import request from 'supertest';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';
import User from '../models/userModel.js';
import Movie from '../models/movieModel.js';
import Theatre from '../models/theatreModel.js';
import Show from '../models/showModel.js';
import SeatLock from '../models/seatLockModel.js';
import Booking from '../models/bookingModel.js';
import Favorite from '../models/favoriteModel.js';
import Review from '../models/reviewModel.js';
import Payment from '../models/paymentModel.js';

export const app = createApp();

export async function setupDatabase() {
  if (!env.MONGODB_URI.includes('test')) throw new Error('Refusing to run tests against a non-test database');
  await connectDB(env.MONGODB_URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Movie, Theatre, Show, SeatLock, Booking, Favorite, Review, Payment].map((m) => m.syncIndexes()));
}

export async function teardownDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** A supertest agent that keeps cookies and sends the CSRF header automatically. */
export async function client() {
  const agent = request.agent(app);
  const res = await agent.get('/api/auth/csrf-token').expect(200);
  const token = res.body.csrfToken;
  const withCsrf = (method) => (url) => agent[method](url).set('X-CSRF-Token', token);
  return {
    agent,
    csrfToken: token,
    get: (url) => agent.get(url),
    post: withCsrf('post'),
    put: withCsrf('put'),
    patch: withCsrf('patch'),
    delete: withCsrf('delete'),
  };
}

let counter = 0;
export async function registeredClient(overrides = {}) {
  counter += 1;
  const n = counter;
  const c = await client();
  const res = await c
    .post('/api/auth/register')
    .send({ username: `User ${n}`, email: `user${n}@example.com`, password: 'Password123', ...overrides })
    .expect(201);
  c.user = res.body.user;
  return c;
}

export async function adminClient() {
  const c = await registeredClient();
  await User.updateOne({ _id: c.user._id }, { $set: { role: 'admin' } });
  return c;
}

export const layout = {
  lower: { rows: 2, seatsPerRow: 10, price: 150 },
  middle: { rows: 2, seatsPerRow: 10, price: 200 },
  balcony: { rows: 1, seatsPerRow: 8, price: 300 },
};

/** Creates a movie, a theatre and a show starting `hoursFromNow` hours from now. */
export async function createFixtures({ hoursFromNow = 48 } = {}) {
  const movie = await Movie.create({
    movieName: `Test Movie ${Date.now()}${Math.random()}`,
    description: 'A movie used by the automated test-suite.',
    genres: ['Drama'],
    language: 'English',
    durationMins: 120,
    releaseDate: new Date(),
  });
  const theatre = await Theatre.create({
    theatreName: `Test Theatre ${Date.now()}${Math.random()}`,
    city: 'Pune',
    address: '1 Test Street, Pune',
    screens: ['Screen 1'],
    seatLayout: layout,
  });
  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    screen: 'Screen 1',
    startsAt: new Date(Date.now() + hoursFromNow * 3600 * 1000),
    seatLayout: layout,
  });
  return { movie, theatre, show };
}

/** Holds seats, creates the booking and pays for it with the given demo outcome. */
export async function bookSeats(c, showId, seats, outcome = 'success') {
  const hold = await c.post('/api/bookings/hold-seats').send({ showId, seats }).expect(201);
  const booking = await c.post('/api/bookings').send({ holdId: hold.body.hold.holdId }).expect(201);
  const order = await c.post('/api/payments/order').send({ bookingId: booking.body.booking._id }).expect(201);
  const paid = await c
    .post(`/api/payments/${order.body.order.paymentId}/demo-complete`)
    .send({ outcome, method: 'upi' });
  return { hold: hold.body.hold, booking: booking.body.booking, order: order.body.order, paid };
}

export { User, Movie, Theatre, Show, SeatLock, Booking, Payment, Review, Favorite };
