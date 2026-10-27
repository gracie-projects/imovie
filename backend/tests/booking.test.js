import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  setupDatabase,
  teardownDatabase,
  registeredClient,
  adminClient,
  createFixtures,
  bookSeats,
  SeatLock,
  Booking,
  Payment,
} from './helpers.js';

before(setupDatabase);
after(teardownDatabase);

describe('seat holds', () => {
  it('holds seats and prices them on the server', async () => {
    const { show } = await createFixtures();
    const c = await registeredClient();
    const res = await c
      .post('/api/bookings/hold-seats')
      .send({ showId: show._id, seats: ['A1', 'E2'], price: 1 })
      .expect(201);
    // A1 is lower (150), E2 is balcony (300); fees: 25/ticket + 18% GST on fees.
    assert.deepEqual(res.body.hold.price, { subtotal: 450, convenienceFee: 50, taxes: 9, total: 509 });

    const seats = await c.get(`/api/shows/${show._id}/seats`).expect(200);
    assert.deepEqual(seats.body.heldByMe.sort(), ['A1', 'E2']);
    const other = await registeredClient();
    const seen = await other.get(`/api/shows/${show._id}/seats`).expect(200);
    assert.deepEqual(seen.body.held.sort(), ['A1', 'E2']);
  });

  it('rejects invalid, duplicate and too many seats', async () => {
    const { show } = await createFixtures();
    const c = await registeredClient();
    await c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['Z99'] }).expect(400);
    await c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['A1', 'A1'] }).expect(400);
    await c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: [] }).expect(400);
    const many = Array.from({ length: 11 }, (_, i) => `C${i + 1}`).slice(0, 10).concat('D1');
    await c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: many }).expect(400);
  });

  it('returns 409 when another user already holds a seat', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const b = await registeredClient();
    await a.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['B3', 'B4'] }).expect(201);
    const res = await b.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['B4', 'B5'] }).expect(409);
    assert.deepEqual(res.body.details.unavailableSeats, ['B4']);
    // The failed attempt must not leave B5 locked.
    assert.equal(await SeatLock.countDocuments({ show: show._id, seatId: 'B5' }), 0);
  });

  it('lets exactly one of many concurrent requests win the same seat', async () => {
    const { show } = await createFixtures();
    const clients = await Promise.all(Array.from({ length: 8 }, () => registeredClient()));
    const results = await Promise.all(
      clients.map((c) => c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['C5', 'C6'] }))
    );
    const statuses = results.map((r) => r.status).sort();
    assert.equal(statuses.filter((s) => s === 201).length, 1, `statuses: ${statuses}`);
    assert.equal(statuses.filter((s) => s === 409).length, 7);
    assert.equal(await SeatLock.countDocuments({ show: show._id }), 2);
  });

  it('allows an expired hold to be taken over by someone else', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const b = await registeredClient();
    await a.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['D1'] }).expect(201);
    await SeatLock.updateMany({ show: show._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await b.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['D1'] }).expect(201);
  });

  it('refuses holds for shows that have already started', async () => {
    const { show } = await createFixtures({ hoursFromNow: -1 });
    const c = await registeredClient();
    await c.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['A1'] }).expect(409);
  });
});

describe('booking and demo payment', () => {
  it('confirms a booking only after a successful payment and then blocks the seats', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const { booking, paid } = await bookSeats(a, show._id, ['A5', 'A6']);
    assert.equal(paid.status, 200);
    assert.equal(paid.body.booking.status, 'confirmed');
    assert.equal(paid.body.booking.paymentStatus, 'paid');
    assert.equal(paid.body.booking.isDemoPayment, true);
    assert.match(paid.body.booking.bookingReference, /^IMV-[A-Z0-9]{8}$/);
    assert.equal(booking.totalAmount, 300 + 50 + 9);

    const locks = await SeatLock.find({ show: show._id }).lean();
    assert.deepEqual(locks.map((l) => l.status), ['booked', 'booked']);
    assert.ok(locks.every((l) => l.expiresAt === null));

    const b = await registeredClient();
    await b.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['A6'] }).expect(409);
    const seats = await b.get(`/api/shows/${show._id}/seats`).expect(200);
    assert.deepEqual(seats.body.booked.sort(), ['A5', 'A6']);
  });

  it('does not confirm a booking when the demo payment fails, and releases the seats', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const { booking, paid } = await bookSeats(a, show._id, ['B1'], 'failure');
    assert.equal(paid.status, 200);
    assert.equal(paid.body.paymentStatus, 'failed');
    const stored = await Booking.findById(booking._id).lean();
    assert.equal(stored.status, 'failed');
    assert.equal(stored.paymentStatus, 'failed');
    assert.equal(await SeatLock.countDocuments({ show: show._id }), 0);

    const b = await registeredClient();
    await b.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['B1'] }).expect(201);
  });

  it('processes a payment only once even if submitted twice', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const { order } = await bookSeats(a, show._id, ['B2']);
    const again = await a.post(`/api/payments/${order.paymentId}/demo-complete`).send({ outcome: 'failure' }).expect(200);
    assert.equal(again.body.alreadyProcessed, true);
    assert.equal(again.body.booking.status, 'confirmed');
  });

  it('refunds and does not confirm when the hold expired and the seat was taken before payment', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const b = await registeredClient();
    const hold = await a.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['C1'] }).expect(201);
    const booking = await a.post('/api/bookings').send({ holdId: hold.body.hold.holdId }).expect(201);
    const order = await a.post('/api/payments/order').send({ bookingId: booking.body.booking._id }).expect(201);

    // Simulate the hold running out and another customer grabbing the seat.
    await SeatLock.updateMany({ show: show._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await Booking.updateOne({ _id: booking.body.booking._id }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } });
    await b.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['C1'] }).expect(201);

    const res = await a.post(`/api/payments/${order.body.order.paymentId}/demo-complete`).send({ outcome: 'success' }).expect(409);
    assert.match(res.body.message, /refunded/);
    const stored = await Booking.findById(booking.body.booking._id).lean();
    assert.notEqual(stored.status, 'confirmed');
    assert.equal(stored.paymentStatus, 'refunded');
    const payment = await Payment.findById(order.body.order.paymentId).lean();
    assert.equal(payment.status, 'refunded');
    // B still owns the seat.
    const lock = await SeatLock.findOne({ show: show._id, seatId: 'C1' }).lean();
    assert.equal(lock.user.toString(), b.user._id);
  });

  it('rejects creating a booking from an expired hold', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const hold = await a.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['D2'] }).expect(201);
    await SeatLock.updateMany({ show: show._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await a.post('/api/bookings').send({ holdId: hold.body.hold.holdId }).expect(410);
  });

  it('does not let a user create a booking from someone else\'s hold', async () => {
    const { show } = await createFixtures();
    const a = await registeredClient();
    const b = await registeredClient();
    const hold = await a.post('/api/bookings/hold-seats').send({ showId: show._id, seats: ['D3'] }).expect(201);
    await b.post('/api/bookings').send({ holdId: hold.body.hold.holdId }).expect(410);
  });
});

describe('booking access and cancellation', () => {
  it('hides a booking from other users but shows it to its owner and admins', async () => {
    const { show } = await createFixtures();
    const owner = await registeredClient();
    const { booking } = await bookSeats(owner, show._id, ['A1']);
    await owner.get(`/api/bookings/${booking._id}`).expect(200);
    const stranger = await registeredClient();
    await stranger.get(`/api/bookings/${booking._id}`).expect(404);
    await stranger.patch(`/api/bookings/${booking._id}/cancel`).send({}).expect(404);
    const admin = await adminClient();
    await admin.get(`/api/bookings/${booking._id}`).expect(200);

    const mine = await stranger.get('/api/bookings/my').expect(200);
    assert.equal(mine.body.items.length, 0);
  });

  it('cancels a confirmed booking, refunds the demo payment and frees the seats', async () => {
    const { show } = await createFixtures({ hoursFromNow: 48 });
    const a = await registeredClient();
    const { booking } = await bookSeats(a, show._id, ['B7', 'B8']);
    const res = await a.patch(`/api/bookings/${booking._id}/cancel`).send({}).expect(200);
    assert.equal(res.body.booking.status, 'cancelled');
    assert.equal(res.body.booking.paymentStatus, 'refunded');
    assert.equal(await SeatLock.countDocuments({ show: show._id }), 0);
    await a.patch(`/api/bookings/${booking._id}/cancel`).send({}).expect(409);
  });

  it('refuses customer cancellation close to the show time', async () => {
    const { show } = await createFixtures({ hoursFromNow: 1 });
    const a = await registeredClient();
    const { booking } = await bookSeats(a, show._id, ['A2']);
    const res = await a.patch(`/api/bookings/${booking._id}/cancel`).send({}).expect(409);
    assert.match(res.body.message, /2 hours/);
  });

  it('excludes demo payments from verified revenue on the dashboard', async () => {
    const admin = await adminClient();
    const res = await admin.get('/api/admin/dashboard').expect(200);
    assert.equal(res.body.stats.verifiedRevenue, 0);
    assert.ok(res.body.stats.demoVolume > 0);
  });
});
