// All money is stored in whole rupees. Prices are always computed on the server.
export const CONVENIENCE_FEE_PER_TICKET = 25;
export const GST_RATE_ON_FEE = 0.18;

export function calculatePrice(seatPrices) {
  const subtotal = seatPrices.reduce((sum, p) => sum + p, 0);
  const convenienceFee = CONVENIENCE_FEE_PER_TICKET * seatPrices.length;
  const taxes = Math.round(convenienceFee * GST_RATE_ON_FEE);
  return { subtotal, convenienceFee, taxes, total: subtotal + convenienceFee + taxes };
}
