import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import SeatMap from '../components/booking/SeatMap';

const sections = [
  { key: 'lower', name: 'Lower Stall', price: 150, rows: [{ label: 'A', seats: ['A1', 'A2', 'A3', 'A4'] }] },
  { key: 'balcony', name: 'Balcony', price: 300, rows: [{ label: 'B', seats: ['B1', 'B2'] }] },
];

describe('SeatMap', () => {
  it('renders every seat as a labelled button with its state', () => {
    render(<SeatMap sections={sections} booked={['A2']} held={['A3']} selected={['B1']} onToggle={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByRole('button', { name: /Seat A1, Lower Stall, .*150, available/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Seat A2.*booked/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Seat A3.*held by another customer/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Seat B1.*selected/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle only for available seats', async () => {
    const onToggle = vi.fn();
    render(<SeatMap sections={sections} booked={['A2']} held={[]} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /Seat A1/ }));
    await userEvent.click(screen.getByRole('button', { name: /Seat A2/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle.mock.calls[0][0]).toBe('A1');
  });

  it('disables every seat when booking is closed', () => {
    render(<SeatMap sections={sections} booked={[]} held={[]} selected={[]} onToggle={() => {}} disabled />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});
