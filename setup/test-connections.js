import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('=== Test de conexiones ===\n');

  // Test Stripe
  console.log('1. Stripe...');
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const charges = await stripe.charges.list({ limit: 1 });
    console.log(`   ✅ Stripe OK - ${charges.data.length > 0 ? 'Ultima charge: ' + charges.data[0].id : 'Sin charges'}`);
  } catch (err) {
    console.log(`   ❌ Stripe ERROR: ${err.message}`);
  }

  // Test Teachable
  console.log('2. Teachable...');
  try {
    const res = await fetch('https://developers.teachable.com/v1/users?page=1&per=1', {
      headers: {
        apiKey: process.env.TEACHABLE_API_KEY,
        Accept: 'application/json',
      },
    });
    const data = await res.json();
    console.log(`   ✅ Teachable OK - Status ${res.status}, Users: ${data.users?.length || 0}`);
  } catch (err) {
    console.log(`   ❌ Teachable ERROR: ${err.message}`);
  }

  // Test Supabase
  console.log('3. Supabase...');
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase.from('fidelization_purchases').select('id').limit(1);
    if (error && error.code === '42P01') {
      console.log('   ⚠️  Supabase CONECTADO pero tabla fidelization_purchases NO EXISTE. Ejecuta setup/migration.sql');
    } else if (error) {
      console.log(`   ❌ Supabase ERROR: ${error.message}`);
    } else {
      console.log(`   ✅ Supabase OK - Tabla existe, ${data.length} registros`);
    }
  } catch (err) {
    console.log(`   ❌ Supabase ERROR: ${err.message}`);
  }

  // Test SMTP (solo verifica la conexion, no envia)
  console.log('4. SMTP...');
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.verify();
    console.log('   ✅ SMTP OK - Conexion verificada');
  } catch (err) {
    console.log(`   ❌ SMTP ERROR: ${err.message}`);
  }

  console.log('\n=== Fin de tests ===');
}

test();
