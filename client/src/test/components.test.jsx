import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Poster from '../components/common/Poster';
import PriceBreakdown from '../components/booking/PriceBreakdown';
import { EmptyState } from '../components/common/States';
import { compareSeats, formatCurrency, formatDuration } from '../utils/format';
import { validateRegistration } from '../pages/Register';

const authState = { user: null, loading: false, isAdmin: false };
vi.mock('../context/AuthContext', () => ({ useAuth: () => authState }));
const { ProtectedRoute, AdminRoute } = await import('../routes/guards');

describe('Poster', () => {
  it('falls back to a local placeholder when the image fails to load', () => {
    render(<Poster src="https://example.invalid/poster.jpg" alt="Test poster" />);
    const img = screen.getByAltText('Test poster');
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', '/poster-fallback.svg');
  });

  it('uses the placeholder when no URL is given', () => {
    render(<Poster src="" alt="No poster" />);
    expect(screen.getByAltText('No poster')).toHaveAttribute('src', '/poster-fallback.svg');
  });
});

describe('PriceBreakdown', () => {
  it('groups seats by section and shows the server-calculated total', () => {
    render(
      <PriceBreakdown
        booking={{
          seatDetails: [
            { seatId: 'A1', section: 'lower', price: 150 },
            { seatId: 'A2', section: 'lower', price: 150 },
            { seatId: 'E1', section: 'balcony', price: 300 },
          ],
          convenienceFee: 75,
          taxes: 14,
          totalAmount: 689,
        }}
      />
    );
    expect(screen.getByText(/Lower Stall × 2/)).toBeInTheDocument();
    expect(screen.getByText(/Balcony × 1/)).toBeInTheDocument();
    expect(screen.getByText(formatCurrency(689))).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('renders the title, message and action', () => {
    render(<EmptyState title="Nothing here" message="Try again later" action={<button type="button">Go</button>} />);
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});

describe('route guards', () => {
  const renderAt = (path, guard) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={guard}>
            <Route path="/secret" element={<p>secret page</p>} />
          </Route>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    );

  it('sends anonymous visitors to the login page', () => {
    authState.user = null;
    renderAt('/secret', <ProtectedRoute />);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('keeps regular users out of admin pages', () => {
    Object.assign(authState, { user: { username: 'u', role: 'user' }, isAdmin: false });
    renderAt('/secret', <AdminRoute />);
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('lets administrators into admin pages', () => {
    Object.assign(authState, { user: { username: 'a', role: 'admin' }, isAdmin: true });
    renderAt('/secret', <AdminRoute />);
    expect(screen.getByText('secret page')).toBeInTheDocument();
  });
});

describe('registration validation', () => {
  it('rejects invalid input', () => {
    const errors = validateRegistration({ username: 'A', email: 'nope', password: 'short', confirm: 'x' });
    expect(Object.keys(errors).sort()).toEqual(['confirm', 'email', 'password', 'username']);
  });

  it('requires a letter and a number in the password', () => {
    expect(validateRegistration({ username: 'Asha', email: 'a@b.co', password: 'onlyletters', confirm: 'onlyletters' }).password).toMatch(/letter and a number/);
  });

  it('accepts valid input', () => {
    expect(validateRegistration({ username: 'Asha', email: 'a@b.co', password: 'Password1', confirm: 'Password1' })).toEqual({});
  });
});

describe('format helpers', () => {
  it('sorts seats naturally', () => {
    expect(['A10', 'B1', 'A2'].sort(compareSeats)).toEqual(['A2', 'A10', 'B1']);
  });

  it('formats durations', () => {
    expect(formatDuration(142)).toBe('2h 22m');
  });
});
