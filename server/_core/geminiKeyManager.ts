/**
 * GESTOR INTELIGENTE Y SEGURO DE CLAVES GOOGLE GEMINI — VECY BIENES RAÍCES (v32.100)
 * 
 * Arquitectura de Seguridad y Doble Nivel:
 * 1. NIVEL 1 (Prioridad 100% Gratuita):
 *    - Rota equitativamente en Round-Robin entre las 4 claves gratuitas (GEMINI_FREE_KEYS / GEMINI_FREE_KEY_1..4).
 *    - Rendimiento optimizado (hasta 60 RPM combinadas a costo $0 COP).
 *    - Cooldown individual de 60 segundos por clave ante errores 429 (Rate Limit).
 * 2. NIVEL 2 (Respaldo de Emergencia de Pago 24/7):
 *    - GEMINI_PAID_KEY (Google Cloud Billing) solo se activa si las 4 claves gratuitas devuelven 429 simultáneamente.
 *    - Retorno Automático: Tan pronto una clave gratuita cumple sus 60s de enfriamiento, el flujo retorna a Nivel 1 a costo $0 COP.
 * 3. BLINDAJE INMUTABLE EN ENTORNO DE PRUEBAS (NODE_ENV=test / npm test):
 *    - GEMINI_PAID_KEY queda estrictamente bloqueada / anulada en tests.
 *    - Los tests utilizan exclusivamente el pool gratuito (GEMINI_FREE_KEYS) o mocks.
 *    - Si cualquier test intenta ejecutar peticiones con la clave de pago, arroja una excepción local inmediata sin tráfico externo.
 */

export interface ActiveKeyResult {
  key: string;
  isPaid: boolean;
  tier: 1 | 2;
  index: number;
}

const keyCooldowns = new Map<string, number>();
let roundRobinFreeIndex = 0;

/**
 * Sanitiza cualquier valor de clave eliminando comillas envolventes o espacios accidentales.
 */
export function sanitizeKey(k: string = ""): string {
  if (!k) return "";
  return k.replace(/^["']|["']$/g, "").trim();
}

/**
 * Detecta si el entorno actual corresponde a la ejecución de pruebas automatizadas.
 */
export function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    typeof process.env.VITEST_WORKER_ID !== "undefined"
  );
}

/**
 * Determina si una clave específica corresponde a la clave de pago de Google Cloud Billing.
 */
export function isPaidKey(k: string): boolean {
  if (!k) return false;
  const clean = sanitizeKey(k);
  if (!clean) return false;

  // 1. Clave explícitamente configurada en GEMINI_PAID_KEY
  const envPaid = sanitizeKey(process.env.GEMINI_PAID_KEY || "");
  if (envPaid && clean === envPaid) return true;

  // 2. Firma oficial de la clave de pago Vecy APP Google Cloud Billing
  if (clean.startsWith("AQ.Ab8RN6Kik") && clean.endsWith("c7ePwg")) return true;

  return false;
}

/**
 * Retorna la clave de pago (Nivel 2) si está configurada y el entorno no es de pruebas.
 * En entorno de pruebas (npm test / NODE_ENV=test) SIEMPRE retorna null.
 */
export function getPaidKey(): string | null {
  // Blindaje inmutable: Vetada y anulada al 100% en pruebas
  if (isTestEnvironment()) {
    return null;
  }

  const explicitPaid = sanitizeKey(process.env.GEMINI_PAID_KEY || "");
  if (explicitPaid) return explicitPaid;

  // Fallback a clave conocida de Google Cloud Billing si está en GEMINI_API_KEY o GEMINI_API_KEY_1
  const key1 = sanitizeKey(process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "");
  if (key1 && isPaidKey(key1)) return key1;

  // Fallback en lista GEMINI_API_KEYS
  const multi = (process.env.GEMINI_API_KEYS || "").split(",").map(sanitizeKey).filter(Boolean);
  const found = multi.find(k => isPaidKey(k));
  if (found) return found;

  return null;
}

/**
 * Retorna exclusivamente el pool de claves gratuitas (Nivel 1).
 * Garantiza que NINGUNA clave de pago forme parte de esta lista.
 */
export function getFreeKeys(): string[] {
  const keysSet = new Set<string>();

  // 1. Claves explícitas en GEMINI_FREE_KEYS
  const freeMulti = (process.env.GEMINI_FREE_KEYS || "").split(",").map(sanitizeKey).filter(Boolean);
  freeMulti.forEach(k => {
    if (!isPaidKey(k)) keysSet.add(k);
  });

  // 2. Claves individuales GEMINI_FREE_KEY_1..10
  for (let i = 1; i <= 10; i++) {
    const k = sanitizeKey(process.env[`GEMINI_FREE_KEY_${i}`] || "");
    if (k && !isPaidKey(k)) keysSet.add(k);
  }

  // 3. Claves numeradas tradicionales GEMINI_API_KEY_2..10 (las claves 2..5 son gratuitas en producción)
  for (let i = 2; i <= 10; i++) {
    const k = sanitizeKey(process.env[`GEMINI_API_KEY_${i}`] || "");
    if (k && !isPaidKey(k)) keysSet.add(k);
  }

  // 4. Claves desde GEMINI_API_KEYS que no correspondan a la clave de pago
  const allMulti = (process.env.GEMINI_API_KEYS || "").split(",").map(sanitizeKey).filter(Boolean);
  allMulti.forEach(k => {
    if (!isPaidKey(k)) keysSet.add(k);
  });

  // 5. Clave de respaldo GEMINI_BACKUP_KEY si no es de pago
  if (process.env.GEMINI_BACKUP_KEY) {
    const k = sanitizeKey(process.env.GEMINI_BACKUP_KEY);
    if (k && !isPaidKey(k)) keysSet.add(k);
  }

  // 6. GEMINI_API_KEY_1 o GEMINI_API_KEY únicamente si NO es de pago
  if (process.env.GEMINI_API_KEY_1) {
    const k = sanitizeKey(process.env.GEMINI_API_KEY_1);
    if (k && !isPaidKey(k)) keysSet.add(k);
  }
  if (process.env.GEMINI_API_KEY) {
    const k = sanitizeKey(process.env.GEMINI_API_KEY);
    if (k && !isPaidKey(k)) keysSet.add(k);
  }

  return Array.from(keysSet);
}

/**
 * Barrera estricta de seguridad: Lanza una excepción si se intenta invocar la clave de pago en tests.
 */
export function assertKeyAllowedForExecution(key: string): void {
  if (isTestEnvironment() && isPaidKey(key)) {
    throw new Error("🚨 [SEGURIDAD TEST]: Intento de invocar la clave de pago GEMINI_PAID_KEY en entorno de pruebas bloqueado estrictamente.");
  }
}

/**
 * Registra un periodo de enfriamiento (cooldown) para una clave tras un error 429 o saturación.
 */
export function markKeyCooldown(key: string, seconds: number = 60, reason: string = "Rate Limit (429)"): void {
  const clean = sanitizeKey(key);
  if (!clean) return;
  keyCooldowns.set(clean, Date.now() + seconds * 1000);
  const isPaid = isPaidKey(clean);
  const keyLabel = isPaid ? "Nivel 2 Pago 🚨" : "Nivel 1 Gratis";
  console.warn(`[JanIA-GeminiManager] 🛡️ Clave Gemini ${keyLabel} (...${clean.slice(-6)}) en cooldown por ${seconds}s debido a ${reason}.`);
}

/**
 * Verifica si una clave se encuentra actualmente en periodo de enfriamiento.
 */
export function isKeyInCooldown(key: string): boolean {
  const clean = sanitizeKey(key);
  const cd = keyCooldowns.get(clean);
  if (!cd) return false;
  return Date.now() < cd;
}

/**
 * Limpia el estado de cooldowns en memoria (útil para pruebas unitarias).
 */
export function clearAllCooldowns(): void {
  keyCooldowns.clear();
}

/**
 * Obtiene la siguiente clave activa respetando la jerarquía Nivel 1 -> Nivel 2 -> Retorno Automático.
 */
export function getActiveKey(): ActiveKeyResult {
  const freeKeys = getFreeKeys();
  const now = Date.now();

  // Filtrar claves gratuitas disponibles (que no estén en cooldown)
  const availableFree: { key: string; index: number }[] = [];
  for (let i = 0; i < freeKeys.length; i++) {
    const k = freeKeys[i];
    const cd = keyCooldowns.get(k) || 0;
    if (now >= cd) {
      availableFree.push({ key: k, index: i + 1 });
    }
  }

  // NIVEL 1 (Prioridad 100% Gratuita): Rotación Round-Robin entre claves gratuitas activas
  if (availableFree.length > 0) {
    const chosen = availableFree[roundRobinFreeIndex % availableFree.length];
    roundRobinFreeIndex = (roundRobinFreeIndex + 1) % availableFree.length;
    return {
      key: chosen.key,
      isPaid: false,
      tier: 1,
      index: chosen.index
    };
  }

  // Si todas las claves gratuitas están en cooldown (429 simultáneo en las 4):
  if (isTestEnvironment()) {
    throw new Error("🚨 [SEGURIDAD TEST]: Todas las claves gratuitas están en cooldown y la clave de pago GEMINI_PAID_KEY está estrictamente vetada en entorno de pruebas.");
  }

  // NIVEL 2 (Respaldo de Emergencia de Pago en Producción):
  const paidKey = getPaidKey();
  if (paidKey) {
    const paidCooldown = keyCooldowns.get(paidKey) || 0;
    if (now >= paidCooldown) {
      console.warn("[JanIA-GeminiManager] 🚨 Nivel 2 de Emergencia: Todas las claves gratuitas (4/4) en cooldown (429). Activando GEMINI_PAID_KEY como respaldo...");
      return {
        key: paidKey,
        isPaid: true,
        tier: 2,
        index: 99
      };
    }
  }

  // Retorno Automático / Espera: Si todo está en cooldown, seleccionar la clave gratuita que primero se descongele
  if (freeKeys.length === 0) {
    throw new Error("No hay ninguna clave de Gemini configurada en el entorno.");
  }

  let bestKey = freeKeys[0];
  let minCooldown = Infinity;
  let bestIdx = 1;
  for (let i = 0; i < freeKeys.length; i++) {
    const k = freeKeys[i];
    const cd = keyCooldowns.get(k) || 0;
    if (cd < minCooldown) {
      minCooldown = cd;
      bestKey = k;
      bestIdx = i + 1;
    }
  }

  return {
    key: bestKey,
    isPaid: false,
    tier: 1,
    index: bestIdx
  };
}

/**
 * Retorna todas las claves disponibles (gratuitas y, si aplica en producción, la de pago).
 */
export function getAllAvailableKeys(): string[] {
  const free = getFreeKeys();
  const paid = getPaidKey();
  return paid ? [...free, paid] : free;
}

/**
 * Gestor singleton centralizado.
 */
export const geminiKeyManager = {
  sanitizeKey,
  isTestEnvironment,
  isPaidKey,
  getPaidKey,
  getFreeKeys,
  assertKeyAllowedForExecution,
  markKeyCooldown,
  isKeyInCooldown,
  clearAllCooldowns,
  getActiveKey,
  getAllAvailableKeys
};
