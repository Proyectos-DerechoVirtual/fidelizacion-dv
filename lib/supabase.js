import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return client;
}

// --- Purchases ---

/**
 * Dado un array de charge IDs, retorna un Set con los que ya existen en la BD.
 * Un solo query en vez de uno por cada charge.
 */
export async function getExistingChargeIds(chargeIds) {
  const { data } = await getSupabase()
    .from('fidelization_purchases')
    .select('stripe_charge_id')
    .in('stripe_charge_id', chargeIds);
  return new Set((data || []).map((r) => r.stripe_charge_id));
}

export async function insertPurchase(purchase) {
  const { data, error } = await getSupabase()
    .from('fidelization_purchases')
    .insert(purchase)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPurchasesPendingMessages() {
  const { data, error } = await getSupabase()
    .from('fidelization_purchases')
    .select('*, fidelization_sent_messages(message_type)');
  if (error) throw error;
  return data || [];
}

// --- Sent Messages ---

export async function recordSentMessage({ purchaseId, messageType, status }) {
  const { error } = await getSupabase()
    .from('fidelization_sent_messages')
    .insert({
      purchase_id: purchaseId,
      message_type: messageType,
      sent_at: new Date().toISOString(),
      status,
    });
  if (error) throw error;
}
