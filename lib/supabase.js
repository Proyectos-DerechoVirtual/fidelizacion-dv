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

export async function findPurchaseByChargeId(chargeId) {
  const { data } = await getSupabase()
    .from('fidelization_purchases')
    .select('*')
    .eq('stripe_charge_id', chargeId)
    .maybeSingle();
  return data;
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
