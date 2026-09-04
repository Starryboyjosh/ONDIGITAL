// Traducción de internal/store/backup.go.
import fs from 'node:fs';
import path from 'node:path';

// backup crea una copia consistente de la base SQLite dentro de destDir.
// Devuelve la ruta del archivo creado.
export function backup(db, destDir) {
  fs.mkdirSync(destDir, { recursive: true, mode: 0o755 });
  // Checkpoint del WAL para que el archivo principal traiga lo último.
  db.exec('PRAGMA wal_checkpoint(FULL)');

  const src = dbPath(db);
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const dest = path.join(destDir, `onstock-backup-${stamp}.db`);
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o600);
  return dest;
}

function dbPath(db) {
  for (const row of db.all('PRAGMA database_list')) {
    if (row.name === 'main' && row.file) return row.file;
  }
  throw new Error('no se pudo resolver la ruta de la base de datos');
}
