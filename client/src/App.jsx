import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import { ProtectedRoute, AdminRoute, GuestRoute } from './routes/guards';
import { Spinner } from './components/common/States';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetails from './pages/MovieDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Less frequently visited pages are split into separate bundles.
const Theatres = lazy(() => import('./pages/Theatres'));
const TheatreDetails = lazy(() => import('./pages/TheatreDetails'));
const SeatSelection = lazy(() => import('./pages/SeatSelection'));
const Checkout = lazy(() => import('./pages/Checkout'));
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminMovies = lazy(() => import('./pages/admin/AdminMovies'));
const AdminTheatres = lazy(() => import('./pages/admin/AdminTheatres'));
const AdminShows = lazy(() => import('./pages/admin/AdminShows'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        containerClassName="toaster"
        toastOptions={{
          duration: 4000,
          style: { background: '#161a26', color: '#f4f5f9', border: '1px solid #272d3d' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#0b0d14' } },
          error: { iconTheme: { primary: '#e50914', secondary: '#fff' }, duration: 6000 },
        }}
      />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="movies" element={<Movies />} />
            <Route path="movies/:id" element={<MovieDetails />} />
            <Route path="theatres" element={<Theatres />} />
            <Route path="theatres/:id" element={<TheatreDetails />} />
            <Route path="shows/:showId/seats" element={<SeatSelection />} />

            <Route element={<GuestRoute />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="checkout/:bookingId" element={<Checkout />} />
              <Route path="bookings" element={<MyBookings />} />
              <Route path="bookings/:id" element={<BookingDetails />} />
              <Route path="bookings/:id/confirmation" element={<BookingConfirmation />} />
              <Route path="favorites" element={<Favorites />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="admin" element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="movies" element={<AdminMovies />} />
                <Route path="theatres" element={<AdminTheatres />} />
                <Route path="shows" element={<AdminShows />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="users" element={<AdminUsers />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
