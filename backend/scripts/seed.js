/**
 * Seeds demonstration data. Safe to run repeatedly:
 *  - movies are upserted by slug, theatres by (name, city), shows by (theatre, screen, start time),
 *    demo reviewers by email and reviews by (user, movie). Nothing is duplicated.
 *  - existing bookings and user accounts are never touched.
 *
 * Shows are generated for today and the next 3 days (Indian Standard Time), so re-running the
 * seed on a later day tops up the schedule.
 *
 * Usage: npm run seed
 */
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import env, { assertRequiredEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import Movie from '../models/movieModel.js';
import Theatre from '../models/theatreModel.js';
import Show from '../models/showModel.js';
import User from '../models/userModel.js';
import Review from '../models/reviewModel.js';
import movieData, { slugFor } from './data/movies.js';
import theatreData from './data/theatres.js';
import { recalculateMovieRating } from '../services/ratingService.js';

const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const SLOTS = [
  [9, 30],
  [13, 0],
  [16, 30],
  [20, 0],
];
const DAYS = 4;

/** Returns a Date for the given IST wall-clock time, `dayOffset` days from today (IST). */
function istDate(dayOffset, hours, minutes) {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const utcMs = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() + dayOffset, hours, minutes);
  return new Date(utcMs - IST_OFFSET_MS);
}

const DEMO_REVIEWERS = [
  { username: 'Aditi (demo)', email: 'reviewer1@demo.imovies.invalid' },
  { username: 'Rahul (demo)', email: 'reviewer2@demo.imovies.invalid' },
  { username: 'Sneha (demo)', email: 'reviewer3@demo.imovies.invalid' },
];

const DEMO_REVIEWS = [
  [5, 'Stunning visuals and a soundtrack that stays with you. Watched it twice!'],
  [4, 'Great performances. The second half drags a little, but the ending makes up for it.'],
  [4, 'Solid entertainer. Perfect for a weekend with friends.'],
  [3, 'Good idea, uneven execution. Still worth a watch on the big screen.'],
  [5, 'One of the best films this year. The theatre was cheering at the climax.'],
];

async function seedMovies() {
  const ids = [];
  for (const { releaseOffsetDays, art, tagline, ...data } of movieData) {
    const slug = slugFor(data.movieName);
    const releaseDate = istDate(releaseOffsetDays, 0, 0);
    const movie = await Movie.findOneAndUpdate(
      { slug: { $regex: `^${slug}-\\d{4}$` } },
      {
        $set: { ...data, posterUrl: `/posters/${slug}.svg`, backdropUrl: `/posters/${slug}.svg` },
        $setOnInsert: { releaseDate, slug: `${slug}-${releaseDate.getUTCFullYear()}` },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    ids.push(movie);
  }
  return ids;
}

async function seedTheatres() {
  const theatres = [];
  for (const data of theatreData) {
    theatres.push(
      await Theatre.findOneAndUpdate(
        { theatreName: data.theatreName, city: data.city },
        { $set: data },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      )
    );
  }
  return theatres;
}

async function seedShows(movies, theatres) {
  const nowShowing = movies.filter((m) => m.status === 'now-showing');
  const formats = ['2D', '2D', '3D', 'IMAX'];
  let created = 0;
  let rotation = 0;
  for (let day = 0; day < DAYS; day += 1) {
    for (const theatre of theatres) {
      for (const screen of theatre.screens) {
        for (const [h, m] of SLOTS) {
          const startsAt = istDate(day, h, m);
          if (startsAt <= new Date()) continue;
          const movie = nowShowing[rotation % nowShowing.length];
          rotation += 1;
          const result = await Show.updateOne(
            { theatre: theatre._id, screen, startsAt },
            {
              $setOnInsert: {
                movie: movie._id,
                theatre: theatre._id,
                screen,
                startsAt,
                format: theatre.amenities.includes('IMAX') && screen === 'Screen 1' ? 'IMAX' : formats[rotation % 3],
                language: movie.language,
                seatLayout: theatre.seatLayout.toObject(),
                isActive: true,
              },
            },
            { upsert: true }
          );
          created += result.upsertedCount;
        }
      }
    }
  }
  return created;
}

async function seedReviews(movies) {
  const reviewers = [];
  for (const r of DEMO_REVIEWERS) {
    let user = await User.findOne({ email: r.email });
    if (!user) {
      user = new User({ ...r, role: 'user', isDemoAccount: true });
      // Random password that is never stored or printed: demo reviewers cannot log in.
      await user.setPassword(crypto.randomBytes(32).toString('hex'));
      await user.save();
    }
    reviewers.push(user);
  }
  let i = 0;
  for (const movie of movies.filter((m) => m.status === 'now-showing')) {
    for (const reviewer of reviewers.slice(0, 2 + (i % 2))) {
      const [rating, comment] = DEMO_REVIEWS[i % DEMO_REVIEWS.length];
      i += 1;
      await Review.updateOne(
        { user: reviewer._id, movie: movie._id },
        { $setOnInsert: { user: reviewer._id, movie: movie._id, rating, comment, status: 'approved' } },
        { upsert: true }
      );
    }
    await recalculateMovieRating(movie._id);
  }
}

async function main() {
  assertRequiredEnv();
  await connectDB(env.MONGODB_URI);
  console.log(`Seeding ${mongoose.connection.name}...`);
  await Promise.all([Movie.syncIndexes(), Theatre.syncIndexes(), Show.syncIndexes(), Review.syncIndexes()]);

  const movies = await seedMovies();
  console.log(`  movies:   ${movies.length} upserted`);
  const theatres = await seedTheatres();
  console.log(`  theatres: ${theatres.length} upserted`);
  const shows = await seedShows(movies, theatres);
  console.log(`  shows:    ${shows} new (existing shows left unchanged)`);
  await seedReviews(movies);
  console.log('  reviews:  demo reviews ensured');
  console.log('Done. Create an administrator with `npm run create-admin` (see README).');
}

main()
  .catch((err) => {
    console.error(`\n[seed] ${err.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
