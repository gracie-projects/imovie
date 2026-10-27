/**
 * Seat layout helpers shared by theatres, shows and the booking service.
 *
 * A layout has three fixed sections. Rows are lettered starting at the screen:
 * lower (closest to the screen) -> middle -> balcony. Seat ids are "<row><number>", e.g. "C7".
 */
export const SECTION_ORDER = ['lower', 'middle', 'balcony'];
export const SECTION_LABELS = { lower: 'Lower Stall', middle: 'Middle Stall', balcony: 'Balcony' };
export const MAX_ROWS = 26;
export const MAX_SEATS_PER_ROW = 30;

const rowLetter = (index) => String.fromCharCode(65 + index);

export function buildSeatMap(layout) {
  const sections = [];
  let rowIndex = 0;
  for (const key of SECTION_ORDER) {
    const section = layout?.[key];
    if (!section || !section.rows) continue;
    const rows = [];
    for (let r = 0; r < section.rows; r += 1) {
      const label = rowLetter(rowIndex);
      rowIndex += 1;
      const seats = [];
      for (let n = 1; n <= section.seatsPerRow; n += 1) seats.push(`${label}${n}`);
      rows.push({ label, seats });
    }
    sections.push({ key, name: SECTION_LABELS[key], price: section.price, rows });
  }
  return sections;
}

/** Map of seatId -> { section, price } for constant-time validation and pricing. */
export function seatIndex(layout) {
  const index = new Map();
  for (const section of buildSeatMap(layout)) {
    for (const row of section.rows) {
      for (const seat of row.seats) index.set(seat, { section: section.key, price: section.price });
    }
  }
  return index;
}

export function totalSeats(layout) {
  return SECTION_ORDER.reduce(
    (sum, key) => sum + (layout?.[key]?.rows || 0) * (layout?.[key]?.seatsPerRow || 0),
    0
  );
}

/** Returns a list of human-readable problems; an empty list means the layout is valid. */
export function validateLayout(layout) {
  const errors = [];
  let rows = 0;
  for (const key of SECTION_ORDER) {
    const s = layout?.[key];
    const label = SECTION_LABELS[key];
    if (!s) {
      errors.push(`${label} section is missing`);
      continue;
    }
    if (!Number.isInteger(s.rows) || s.rows < 0) errors.push(`${label}: rows must be a whole number of 0 or more`);
    if (!Number.isInteger(s.seatsPerRow) || s.seatsPerRow < 1 || s.seatsPerRow > MAX_SEATS_PER_ROW)
      errors.push(`${label}: seats per row must be between 1 and ${MAX_SEATS_PER_ROW}`);
    if (typeof s.price !== 'number' || s.price < 0 || s.price > 10000)
      errors.push(`${label}: price must be between 0 and 10000`);
    rows += s.rows || 0;
  }
  if (rows < 1) errors.push('The layout needs at least one row');
  if (rows > MAX_ROWS) errors.push(`The layout can have at most ${MAX_ROWS} rows in total`);
  return errors;
}
