import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setupDatabase, teardownDatabase, client, registeredClient, adminClient, createFixtures } from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('authentication', () => {
  it('registers a user, sets an HttpOnly cookie and never returns the password hash', async () => {
    const c = await client();
    const res = await c
      .post('/api/auth/register')
      .send({ username: 'Asha', email: 'Asha@Example.com', password: 'Password123' })
      .expect(201);
    assert.equal(res.body.user.email, 'asha@example.com');
    assert.equal(res.body.user.role, 'user');
    assert.equal(res.body.user.passwordHash, undefined);
    const cookie = res.headers['set-cookie'].find((h) => h.startsWith('imovies_token='));
    assert.match(cookie, /HttpOnly/i);

    const me = await c.get('/api/auth/me').expect(200);
    assert.equal(me.body.user.email, 'asha@example.com');
    assert.equal(me.body.user.passwordHash, undefined);
  });

  it('ignores a role supplied during public registration', async () => {
    const c = await client();
    const res = await c
      .post('/api/auth/register')
      .send({ username: 'Mallory', email: 'mallory@example.com', password: 'Password123', role: 'admin' })
      .expect(201);
    assert.equal(res.body.user.role, 'user');
  });

  it('rejects duplicate emails, weak passwords and invalid emails', async () => {
    const c = await client();
    await c.post('/api/auth/register').send({ username: 'Dup', email: 'dup@example.com', password: 'Password123' }).expect(201);
    const dup = await c.post('/api/auth/register').send({ username: 'Dup', email: 'DUP@example.com', password: 'Password123' }).expect(409);
    assert.match(dup.body.message, /already exists/);
    await c.post('/api/auth/register').send({ username: 'Weak', email: 'weak@example.com', password: 'short' }).expect(400);
    await c.post('/api/auth/register').send({ username: 'Weak', email: 'weak@example.com', password: 'onlyletters' }).expect(400);
    await c.post('/api/auth/register').send({ username: 'Bad', email: 'not-an-email', password: 'Password123' }).expect(400);
  });

  it('logs in with correct credentials and rejects wrong ones with a generic message', async () => {
    await registeredClient({ email: 'login@example.com' });
    const c = await client();
    const wrong = await c.post('/api/auth/login').send({ email: 'login@example.com', password: 'Wrong12345' }).expect(401);
    const unknown = await c.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Wrong12345' }).expect(401);
    assert.equal(wrong.body.message, unknown.body.message);
    await c.post('/api/auth/login').send({ email: 'login@example.com', password: 'Password123' }).expect(200);
    await c.get('/api/auth/me').expect(200);
    const session = await c.get('/api/auth/session').expect(200);
    assert.equal(session.body.user.email, 'login@example.com');
    await c.post('/api/auth/logout').expect(200);
    await c.get('/api/auth/me').expect(401);
    const anonymous = await c.get('/api/auth/session').expect(200);
    assert.equal(anonymous.body.user, null);
  });

  it('rejects MongoDB operator injection in the login body', async () => {
    const c = await client();
    await c.post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } }).expect(400);
  });

  it('requires a CSRF token for state-changing requests', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'Password123' }).expect(403);
    assert.match(res.body.message, /CSRF/);
  });

  it('returns 401 for protected routes without a session', async () => {
    await request(app).get('/api/bookings/my').expect(401);
    await request(app).get('/api/favorites').expect(401);
  });
});

describe('authorization', () => {
  it('blocks regular users from every admin endpoint', async () => {
    const c = await registeredClient();
    const { movie } = await createFixtures();
    await c.get('/api/admin/dashboard').expect(403);
    await c.get('/api/admin/bookings').expect(403);
    await c.get('/api/admin/users').expect(403);
    await c.post('/api/movies').send({ movieName: 'Hack' }).expect(403);
    await c.put(`/api/movies/${movie._id}`).send({ movieName: 'Hacked' }).expect(403);
    await c.delete(`/api/movies/${movie._id}`).expect(403);
    await c.post('/api/theatres').send({}).expect(403);
    await c.post('/api/shows').send({}).expect(403);
  });

  it('lets administrators manage movies, theatres and shows', async () => {
    const admin = await adminClient();
    const movie = await admin
      .post('/api/movies')
      .send({
        movieName: 'Admin Created',
        description: 'Created through the admin API in a test.',
        genres: ['Comedy'],
        language: 'Hindi',
        durationMins: 100,
        releaseDate: '2026-01-01',
      })
      .expect(201);
    const theatre = await admin
      .post('/api/theatres')
      .send({
        theatreName: 'Admin Theatre',
        city: 'Pune',
        address: '42 Admin Road, Pune',
        screens: ['Screen 1'],
        seatLayout: {
          lower: { rows: 2, seatsPerRow: 10, price: 100 },
          middle: { rows: 2, seatsPerRow: 10, price: 150 },
          balcony: { rows: 1, seatsPerRow: 10, price: 250 },
        },
      })
      .expect(201);
    const startsAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
    const show = await admin
      .post('/api/shows')
      .send({ movie: movie.body.movie._id, theatre: theatre.body.theatre._id, startsAt, prices: { balcony: 300 } })
      .expect(201);
    assert.equal(show.body.show.seatLayout.balcony.price, 300);
    assert.equal(show.body.show.seatLayout.lower.price, 100);

    // A second show on the same screen at the same time is rejected.
    await admin
      .post('/api/shows')
      .send({ movie: movie.body.movie._id, theatre: theatre.body.theatre._id, startsAt })
      .expect(409);

    await admin.put(`/api/movies/${movie.body.movie._id}`).send({ status: 'archived' }).expect(200);
    await admin.get('/api/admin/dashboard').expect(200);
  });

  it('rejects an invalid seat layout', async () => {
    const admin = await adminClient();
    const res = await admin
      .post('/api/theatres')
      .send({
        theatreName: 'Too Big',
        city: 'Pune',
        address: '1 Big Road, Pune',
        screens: ['Screen 1'],
        seatLayout: {
          lower: { rows: 20, seatsPerRow: 10, price: 100 },
          middle: { rows: 10, seatsPerRow: 10, price: 150 },
          balcony: { rows: 1, seatsPerRow: 10, price: 250 },
        },
      })
      .expect(400);
    assert.match(res.body.message, /at most 26 rows/);
  });
});
