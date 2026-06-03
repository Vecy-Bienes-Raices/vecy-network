/**
 * Setup Stealth Puppeteer for whatsapp-web.js
 * Version: 1.0.0
 * 
 * Este archivo intercepta la carga del módulo 'puppeteer' para inyectar
 * 'puppeteer-extra' con el plugin de sigilo (stealth) activado,
 * de modo que whatsapp-web.js lo consuma sin modificar su código interno.
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

try {
  const puppeteerExtra = require('puppeteer-extra');
  const StealthPlugin = require('puppeteer-extra-plugin-stealth');
  
  // Registrar el plugin de sigilo
  puppeteerExtra.use(StealthPlugin());
  
  // Sobrescribir la caché del módulo para 'puppeteer'
  try {
    const puppeteerPath = require.resolve('puppeteer');
    (require as any).cache[puppeteerPath] = {
      id: puppeteerPath,
      filename: puppeteerPath,
      loaded: true,
      exports: puppeteerExtra,
      parent: null,
      children: []
    };
    console.log('🛡️ [Stealth] Intercepción de Puppeteer (completo) exitosa.');
  } catch (err) {}

  // Sobrescribir la caché del módulo para 'puppeteer-core'
  try {
    const puppeteerCorePath = require.resolve('puppeteer-core');
    (require as any).cache[puppeteerCorePath] = {
      id: puppeteerCorePath,
      filename: puppeteerCorePath,
      loaded: true,
      exports: puppeteerExtra,
      parent: null,
      children: []
    };
    console.log('🛡️ [Stealth] Intercepción de Puppeteer-Core exitosa.');
  } catch (err) {}
  
  console.log('🛡️ [Stealth] Evasión de firmas activada para WhatsApp de forma robusta.');
} catch (error) {
  console.error('❌ [Stealth-Error] No se pudo configurar Stealth Puppeteer:', error);
}
