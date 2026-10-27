import env from '../../config/env.js';
import demoProvider from './demoProvider.js';

// Register real providers here once they are implemented and configured.
const providers = { demo: demoProvider };

export function getPaymentProvider(name = env.PAYMENT_PROVIDER) {
  const provider = providers[name];
  if (!provider) throw new Error(`Payment provider "${name}" is not configured`);
  return provider;
}
