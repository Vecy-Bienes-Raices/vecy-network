import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Limpieza Profunda - VECY CORE
 * Purga procesos de navegación y rastros de sesión de whatsapp-web.js
 */

const TARGET_PATHS = [
  '.wwebjs_cache'
];

function killProcesses() {
  console.log('🚀 Finalizando procesos de navegación de JanIA...');
  try {
    // pkill -f para buscar únicamente procesos chrome que contengan "session-jania-main"
    execSync('pkill -f "session-jania-main"');
    console.log('✅ Procesos de navegación de JanIA terminados.');
  } catch (e) {
    // Ignorar si no hay procesos
  }
}

function clearPaths() {
  console.log('🧹 Limpiando huella digital y caché...');
  TARGET_PATHS.forEach(target => {
    const fullPath = path.resolve(process.cwd(), target);
    if (fs.existsSync(fullPath)) {
      try {
        // Eliminar de forma recursiva y forzada
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Eliminado: ${target}`);
      } catch (e) {
        console.error(`❌ Error eliminando ${target}:`, (e as Error).message);
      }
    } else {
      console.log(`ℹ️ No se encontró: ${target} (Ya limpio)`);
    }
  });

  // Limpieza adicional de SingletonLock por si acaso
  const lockFile = path.resolve(process.cwd(), '.wwebjs_auth/session-session-jania-main/SingletonLock');
  if (fs.existsSync(lockFile)) {
    try {
      fs.unlinkSync(lockFile);
      console.log('✅ SingletonLock removido.');
    } catch (e) {}
  }
}

function main() {
  console.log('--- INICIO DE LIMPIEZA PROFUNDA VECY ---');
  killProcesses();
  clearPaths();
  console.log('--- LIMPIEZA COMPLETADA CON ÉXITO ---');
}

main();
