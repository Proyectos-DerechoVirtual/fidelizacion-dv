import Stripe from 'stripe';
import { MIN_AMOUNT_CENTS } from './constants.js';

let stripeClient;

function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

/**
 * Obtiene compras recientes de Stripe filtradas:
 * - Solo charges exitosos
 * - Importe >= 100 EUR
 * - No recurrentes (sin subscription asociada)
 * - Posteriores a CUTOFF_DATE
 */
export async function getRecentPurchases(sinceDays = 8) {
  const stripe = getStripe();
  const cutoffDate = new Date(process.env.CUTOFF_DATE);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  // Usar la fecha mas reciente entre cutoff y sinceDays
  const effectiveDate = cutoffDate > sinceDate ? cutoffDate : sinceDate;
  const createdGte = Math.floor(effectiveDate.getTime() / 1000);

  const purchases = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const params = {
      created: { gte: createdGte },
      limit: 100,
      expand: ['data.customer', 'data.invoice'],
    };
    if (startingAfter) params.starting_after = startingAfter;

    const charges = await stripe.charges.list(params);

    for (const charge of charges.data) {
      // Solo exitosos
      if (charge.status !== 'succeeded') continue;

      // Solo EUR (ignorar MXN, USD, etc.)
      if (charge.currency !== 'eur') continue;

      // Filtrar importe minimo (100 EUR = 10000 centimos)
      if (charge.amount < MIN_AMOUNT_CENTS) continue;

      // Filtrar recurrentes: si tiene invoice con subscription, es recurrente
      if (charge.invoice && charge.invoice.subscription) continue;

      const email =
        charge.billing_details?.email ||
        charge.customer?.email ||
        charge.receipt_email;

      if (!email) continue;

      const name =
        charge.billing_details?.name ||
        charge.customer?.name ||
        '';

      purchases.push({
        chargeId: charge.id,
        email: email.toLowerCase().trim(),
        name,
        amount: charge.amount / 100,
        currency: charge.currency,
        date: new Date(charge.created * 1000).toISOString(),
      });
    }

    hasMore = charges.has_more;
    if (hasMore && charges.data.length > 0) {
      startingAfter = charges.data[charges.data.length - 1].id;
    }
  }

  return purchases;
}

/**
 * Obtiene TODAS las compras desde el cutoff (para procesar mensajes de largo plazo)
 */
export async function getAllPurchasesSinceCutoff() {
  return getRecentPurchases(365);
}
