import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setupDatabase, teardownDatabase, registeredClient, adminClient, createFixtures, Movie } from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('catalogue', () => {
  it('returns an empty, well-formed list when there are no movies', async () => {
    const res = await request(app).get('/api/movies').expect(200);
    assert.deepEqual(res.body.items, []);
    assert.equal(res.body.pagination.total, 0);
  });

  it('searches, filters and paginates movies', async () => {
    await createFixtures();
    await Movie.create({
      movieName: 'Searchable Comedy',
      description: 'Only here to be found by the search test.',
      genres: ['Comedy'],
      language: 'Tamil',
      durationMins: 110,
      releaseDate: new Date(),
    });
    const search = await request(app).get('/api/movies?q=searchable').expect(200);
    assert.equal(search.body.items.length, 1);
    const genre = await request(app).get('/api/movies?genre=Comedy&language=Tamil').expect(200);
    assert.equal(genre.body.items[0].movieName, 'Searchable Comedy');
    const page = await request(app).get('/api/movies?limit=1&page=2').expect(200);
    assert.equal(page.body.items.length, 1);
    assert.equal(page.body.pagination.totalPages, 2);
    // Regex characters in the search box must not break the query.
    await request(app).get('/api/movies?q=(%5B*').expect(200);
  });

  it('lists upcoming shows with availability and returns the seat map', async () => {
    const { movie, show } = await createFixtures();
    const list = await request(app).get(`/api/shows?movie=${movie._id}`).expect(200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].seatsTotal, 48);
    assert.equal(list.body.items[0].seatsAvailable, 48);
    const seats = await request(app).get(`/api/shows/${show._id}/seats`).expect(200);
    assert.deepEqual(seats.body.sections.map((s) => s.key), ['lower', 'middle', 'balcony']);
    assert.equal(seats.body.sections[2].rows[0].label, 'E');
    await request(app).get('/api/shows/not-an-id/seats').expect(400);
  });
});

describe('favourites and reviews', () => {
  it('adds favourites idempotently and removes them', async () => {
    const { movie } = await createFixtures();
    const c = await registeredClient();
    await c.post(`/api/favorites/${movie._id}`).expect(201);
    await c.post(`/api/favorites/${movie._id}`).expect(201);
    const list = await c.get('/api/favorites').expect(200);
    assert.equal(list.body.items.length, 1);
    await c.delete(`/api/favorites/${movie._id}`).expect(200);
    assert.equal((await c.get('/api/favorites').expect(200)).body.items.length, 0);
  });

  it('allows one review per user, updates the rating and supports moderation', async () => {
    const { movie } = await createFixtures();
    const a = await registeredClient();
    const b = await registeredClient();
    const review = await a.post('/api/reviews').send({ movieId: movie._id, rating: 5, comment: 'Loved it' }).expect(201);
    await a.post('/api/reviews').send({ movieId: movie._id, rating: 4 }).expect(409);
    await b.post('/api/reviews').send({ movieId: movie._id, rating: 2 }).expect(201);
    await b.post('/api/reviews').send({ movieId: movie._id, rating: 9 }).expect(400);
    let stored = await Movie.findById(movie._id).lean();
    assert.equal(stored.avgRating, 3.5);
    assert.equal(stored.reviewCount, 2);

    // Users cannot edit or delete someone else's review.
    await b.put(`/api/reviews/${review.body.review._id}`).send({ rating: 1 }).expect(404);
    await b.delete(`/api/reviews/${review.body.review._id}`).expect(404);

    const admin = await adminClient();
    await admin.patch(`/api/admin/reviews/${review.body.review._id}/moderate`).send({ status: 'rejected' }).expect(200);
    stored = await Movie.findById(movie._id).lean();
    assert.equal(stored.avgRating, 2);
    const publicList = await request(app).get(`/api/reviews/movie/${movie._id}`).expect(200);
    assert.equal(publicList.body.items.length, 1);
  });
});
