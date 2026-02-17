import dotenv from 'dotenv';
dotenv.config();

import { getRecentPurchases } from '../lib/stripe.js';
import { findUserByEmail, getUserDetails } from '../lib/teachable.js';

async function testDryRun() {
  console.log('=== TEST DRY RUN ===\n');
  console.log(`CUTOFF_DATE: ${process.env.CUTOFF_DATE}`);
  console.log(`DRY_RUN: ${process.env.DRY_RUN}\n`);

  // 1. Obtener compras de Stripe
  console.log('📦 Obteniendo compras de Stripe (ultimos 30 dias, >= 100€, no recurrentes)...');
  const purchases = await getRecentPurchases(30);
  console.log(`   Encontradas: ${purchases.length}\n`);

  if (purchases.length === 0) {
    console.log('   No hay compras que cumplan los criterios.');
    console.log('   (Recuerda que CUTOFF_DATE filtra compras anteriores a esa fecha)');
    return;
  }

  // Mostrar las primeras 5
  const sample = purchases.slice(0, 5);
  for (const p of sample) {
    console.log(`   💳 ${p.chargeId}`);
    console.log(`      Email: ${p.email}`);
    console.log(`      Nombre: ${p.name}`);
    console.log(`      Importe: ${p.amount} ${p.currency}`);
    console.log(`      Fecha: ${p.date}`);

    // Buscar en Teachable
    const user = await findUserByEmail(p.email);
    if (user) {
      console.log(`      📚 Teachable ID: ${user.id}`);
      const details = await getUserDetails(user.id);
      if (details && details.courses.length > 0) {
        for (const c of details.courses) {
          console.log(`         Curso: ${c.courseName} (${c.percentComplete}% completado)`);
        }
        console.log(`         Ultimo login: ${details.lastSignIn || 'No disponible'}`);
      } else {
        console.log('         Sin cursos encontrados');
      }
    } else {
      console.log('      ⚠️  No encontrado en Teachable');
    }
    console.log('');
  }

  if (purchases.length > 5) {
    console.log(`   ... y ${purchases.length - 5} compras mas.\n`);
  }

  console.log('=== FIN TEST ===');
}

testDryRun().catch(console.error);
