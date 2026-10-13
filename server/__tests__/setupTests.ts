/**
 * Setup Global de Pruebas para Vitest (v33.00)
 * Blindaje Inmutable de Claves de Pago en Entorno de Pruebas (NODE_ENV=test / npm test)
 */
import axios from "axios";
import { isPaidKey } from "../_core/geminiKeyManager";

// 1. Forzar explícitamente variables de entorno de pruebas
process.env.NODE_ENV = "test";
process.env.VITEST = "true";

// 2. Anular / excluir estrictamente la clave de pago en el entorno de pruebas
delete process.env.GEMINI_PAID_KEY;

// 3. Garantizar pool de claves gratuitas seguras para tests si no estuviera configurado
if (!process.env.GEMINI_FREE_KEYS && !process.env.GEMINI_API_KEY_2) {
  process.env.GEMINI_FREE_KEYS = "test_free_key_1,test_free_key_2,test_free_key_3,test_free_key_4";
}

// 4. Interceptor Axios de Red: Bloqueo inmutable contra cualquier petición saliente con la clave de pago
axios.interceptors.request.use((config) => {
  const url = config.url || "";
  if (url.includes("generativelanguage.googleapis.com")) {
    try {
      const parsedUrl = new URL(url);
      const key = parsedUrl.searchParams.get("key") || "";
      if (isPaidKey(key)) {
        throw new Error("🚨 [SEGURIDAD TEST]: Intento de invocar la clave de pago GEMINI_PAID_KEY en entorno de pruebas bloqueado estrictamente.");
      }
    } catch (err: any) {
      if (err.message && err.message.includes("[SEGURIDAD TEST]")) {
        throw err;
      }
    }
  }
  return config;
});
