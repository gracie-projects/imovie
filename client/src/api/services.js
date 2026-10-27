import api from './client';

const data = (promise) => promise.then((res) => res.data);

export const authApi = {
  me: () => data(api.get('/auth/me')),
  session: () => data(api.get('/auth/session')),
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  logout: () => data(api.post('/auth/logout')),
  updateProfile: (body) => data(api.put('/auth/profile', body)),
  changePassword: (body) => data(api.put('/auth/password', body)),
};

export const movieApi = {
  list: (params) => data(api.get('/movies', { params })),
  filters: () => data(api.get('/movies/filters')),
  get: (id) => data(api.get(`/movies/${id}`)),
  create: (body) => data(api.post('/movies', body)),
  update: (id, body) => data(api.put(`/movies/${id}`, body)),
  remove: (id) => data(api.delete(`/movies/${id}`)),
};

export const theatreApi = {
  list: (params) => data(api.get('/theatres', { params })),
  cities: () => data(api.get('/theatres/cities')),
  get: (id) => data(api.get(`/theatres/${id}`)),
  create: (body) => data(api.post('/theatres', body)),
  update: (id, body) => data(api.put(`/theatres/${id}`, body)),
  remove: (id) => data(api.delete(`/theatres/${id}`)),
};

export const showApi = {
  list: (params) => data(api.get('/shows', { params })),
  get: (id) => data(api.get(`/shows/${id}`)),
  seats: (id) => data(api.get(`/shows/${id}/seats`)),
  formats: () => data(api.get('/shows/formats')),
  create: (body) => data(api.post('/shows', body)),
  update: (id, body) => data(api.put(`/shows/${id}`, body)),
  remove: (id) => data(api.delete(`/shows/${id}`)),
};

export const bookingApi = {
  holdSeats: (showId, seats) => data(api.post('/bookings/hold-seats', { showId, seats })),
  releaseHold: (holdId) => data(api.delete(`/bookings/hold/${holdId}`)),
  create: (holdId) => data(api.post('/bookings', { holdId })),
  my: (params) => data(api.get('/bookings/my', { params })),
  get: (id) => data(api.get(`/bookings/${id}`)),
  cancel: (id, reason) => data(api.patch(`/bookings/${id}/cancel`, { reason })),
};

export const paymentApi = {
  config: () => data(api.get('/payments/config')),
  createOrder: (bookingId) => data(api.post('/payments/order', { bookingId })),
  completeDemo: (paymentId, outcome, method) => data(api.post(`/payments/${paymentId}/demo-complete`, { outcome, method })),
};

export const favoriteApi = {
  list: () => data(api.get('/favorites')),
  add: (movieId) => data(api.post(`/favorites/${movieId}`)),
  remove: (movieId) => data(api.delete(`/favorites/${movieId}`)),
};

export const reviewApi = {
  forMovie: (movieId, params) => data(api.get(`/reviews/movie/${movieId}`, { params })),
  create: (body) => data(api.post('/reviews', body)),
  update: (id, body) => data(api.put(`/reviews/${id}`, body)),
  remove: (id) => data(api.delete(`/reviews/${id}`)),
};

export const adminApi = {
  dashboard: () => data(api.get('/admin/dashboard')),
  users: (params) => data(api.get('/admin/users', { params })),
  bookings: (params) => data(api.get('/admin/bookings', { params })),
  reviews: (params) => data(api.get('/admin/reviews', { params })),
  moderateReview: (id, status, note) => data(api.patch(`/admin/reviews/${id}/moderate`, { status, note })),
};
