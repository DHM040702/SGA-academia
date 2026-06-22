/**
 * Script de un solo uso: restablece la contraseña de TODOS los usuarios que
 * tengan DNI a su número de DNI, y marca debe_cambiar_password = true para
 * forzar el cambio en el primer ingreso.
 *
 * Uso (en el servidor, desde la carpeta backend):
 *   node prisma/reset-passwords-dni.cjs
 *
 * Requisitos previos:
 *   1. La columna debe_cambiar_password debe existir (ver ALTER TABLE).
 *   2. La variable DATABASE_URL debe estar disponible (cargada desde .env).
 */
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Cargar DATABASE_URL desde backend/.env si no está en el entorno
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '');
    }
  }
}

const ROUNDS = 10;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    "SELECT id, dni FROM usuarios WHERE dni IS NOT NULL AND deleted_at IS NULL",
  );
  console.log(`Restableciendo contraseña = DNI para ${rows.length} usuarios...`);

  let n = 0;
  for (const u of rows) {
    const hash = await bcrypt.hash(u.dni, ROUNDS);
    await pool.query(
      "UPDATE usuarios SET password_hash = $1, debe_cambiar_password = true WHERE id = $2",
      [hash, u.id],
    );
    if (++n % 100 === 0) console.log(`  ... ${n}/${rows.length}`);
  }

  console.log(`Listo. ${n} usuarios restablecidos (contraseña = su DNI, cambio obligatorio).`);
  await pool.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
