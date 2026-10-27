// Fictional theatres for demonstration only.
const standardLayout = {
  lower: { rows: 3, seatsPerRow: 14, price: 180 },
  middle: { rows: 5, seatsPerRow: 16, price: 250 },
  balcony: { rows: 3, seatsPerRow: 14, price: 350 },
};

const theatres = [
  {
    theatreName: 'Starlight Cinemas',
    city: 'Mumbai',
    address: '12 Marine View Road, Bandra West, Mumbai 400050',
    screens: ['Screen 1', 'Screen 2'],
    amenities: ['Dolby Atmos', 'Recliners', 'Food Court', 'Parking'],
    seatLayout: standardLayout,
  },
  {
    theatreName: 'Galaxy Multiplex',
    city: 'Bengaluru',
    address: '3rd Floor, Orion Mall, Koramangala, Bengaluru 560034',
    screens: ['Screen 1', 'Screen 2'],
    amenities: ['IMAX', '4K Laser', 'Wheelchair Access', 'Cafe'],
    seatLayout: {
      lower: { rows: 2, seatsPerRow: 12, price: 200 },
      middle: { rows: 6, seatsPerRow: 18, price: 280 },
      balcony: { rows: 3, seatsPerRow: 16, price: 420 },
    },
  },
  {
    theatreName: 'Royal Picture Palace',
    city: 'Delhi',
    address: '45 Connaught Circus, New Delhi 110001',
    screens: ['Screen 1', 'Screen 2'],
    amenities: ['Heritage Hall', 'Dolby 7.1', 'Snack Bar'],
    seatLayout: standardLayout,
  },
];

export default theatres;
