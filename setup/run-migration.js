import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Credenciales PostgreSQL de Supabase self-hosted
// Ajustar si son diferentes
const config = {
  host: '148.230.118.233',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
};

async function run() {
  const client = new pg.Client(config);

  try {
    console.log('Conectando a PostgreSQL...');
    await client.connect();
    console.log('Conectado.');

    const sql = readFileSync(join(__dirname, 'migration.sql'), 'utf8');
    console.log('Ejecutando migracion...');
    await client.query(sql);
    console.log('Tablas creadas correctamente.');
  } catch (err) {
    console.error('Error:', err.message);

    // Si falla en puerto 5432, intentar 54322 (Docker)
    if (err.message.includes('ECONNREFUSED') && config.port === 5432) {
      console.log('Reintentando en puerto 54322...');
      config.port = 54322;
      const client2 = new pg.Client(config);
      try {
        await client2.connect();
        const sql = readFileSync(join(__dirname, 'migration.sql'), 'utf8');
        await client2.query(sql);
        console.log('Tablas creadas correctamente (puerto 54322).');
      } catch (err2) {
        console.error('Error en puerto 54322:', err2.message);
        console.log('\n--- INSTRUCCIONES MANUALES ---');
        console.log('Ejecuta el contenido de setup/migration.sql en tu Supabase SQL Editor');
      } finally {
        await client2.end();
      }
    }
  } finally {
    await client.end().catch(() => {});
  }
}

run();
