-- Tabla de compras rastreadas
CREATE TABLE IF NOT EXISTS fidelization_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_charge_id text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  amount numeric NOT NULL,
  purchase_date timestamptz NOT NULL,
  teachable_user_id text,
  courses jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Tabla de mensajes enviados
CREATE TABLE IF NOT EXISTS fidelization_sent_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid REFERENCES fidelization_purchases(id) ON DELETE CASCADE,
  message_type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);

-- Indices para rendimiento
CREATE INDEX IF NOT EXISTS idx_purchases_email ON fidelization_purchases(customer_email);
CREATE INDEX IF NOT EXISTS idx_purchases_charge ON fidelization_purchases(stripe_charge_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_purchase ON fidelization_sent_messages(purchase_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_type ON fidelization_sent_messages(message_type);
