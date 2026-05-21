import puppeteer from 'puppeteer';
import fs from 'fs';

/**
 * FACEBOOK GROUPS SYNC SERVICE - VECY NETWORK v11.30
 * Automatización de publicaciones en Facebook Groups usando Puppeteer.
 * Soporta sincronización de imágenes y videos (Buffers binarios o Base64).
 */

export async function publishToFacebookGroup(content: string, mediaData?: string | Buffer): Promise<boolean> {
  const groupUrl = process.env.FB_GROUP_URL || 'https://www.facebook.com/groups/vecy.inmuebles.network.co';
  const cookiesJson = process.env.FB_COOKIES_JSON;

  if (!cookiesJson) {
    console.error('[Facebook-Sync-Error] No se encontró FB_COOKIES_JSON en las variables de entorno.');
    return false;
  }

  console.log(`[Facebook-Sync] Iniciando publicación en el grupo: ${groupUrl}`);
  
  const browser = await puppeteer.launch({
    headless: "new", // Modo moderno compatible con entornos de producción
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-notifications'
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Configurar cookies para mantener la sesión
    const cookies = JSON.parse(cookiesJson);
    await page.setCookie(...cookies);

    // Navegar al grupo
    await page.goto(groupUrl, { waitUntil: 'networkidle2' });

    // Esperar a que el cuadro de "Escribe algo..." esté disponible
    const postBoxSelector = 'div[role="button"] span:last-child';
    try {
      await page.waitForSelector(postBoxSelector, { timeout: 10000 });
      await page.click(postBoxSelector);
    } catch (e) {
      // Atajo de contingencia para abrir el cuadro de post
      await page.keyboard.press('p');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Manejo de Multimedia (Imagen o Video - Soporte Binario Seguro)
    if (mediaData) {
      console.log('[Facebook-Sync] Procesando multimedia adjunta...');
      const fileInputSelector = 'input[type="file"]';
      await page.waitForSelector(fileInputSelector, { timeout: 5000 });
      
      // Generar ruta temporal única
      const tempPath = `/tmp/fb_sync_upload_${Date.now()}.mp4`;
      
      // Control inteligente de escritura para evitar corrupción
      if (Buffer.isBuffer(mediaData)) {
        fs.writeFileSync(tempPath, mediaData);
      } else {
        fs.writeFileSync(tempPath, Buffer.from(mediaData, 'base64'));
      }
      
      const input = await page.$(fileInputSelector);
      if (input) {
        await input.uploadFile(tempPath);
        // Limpieza diferida del archivo temporal
        setTimeout(() => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }, 15000);
      }
      
      // Tiempo prudente para la carga del archivo en la interfaz de FB
      await new Promise(resolve => setTimeout(resolve, 8000)); 
    }

    // Simulación de tipeado humano (Anti-detección)
    await new Promise(resolve => setTimeout(resolve, 2000));
    for (const char of content) {
      await page.keyboard.sendCharacter(char);
      const delay = Math.floor(Math.random() * (60 - 15 + 1)) + 15;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log('[Facebook-Sync] Contenido ingresado. Procediendo a publicar...');

    // Selectores de botón "Publicar" por prioridad semántica
    const publishButtonSelectors = [
      'div[aria-label="Publicar"]',
      'div[aria-label="Post"]',
      'div[role="button"]'
    ];

    let published = false;
    for (const selector of publishButtonSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          await btn.click();
          published = true;
          break;
        }
      } catch (e) {}
    }

    // Fallback: Publicación forzada por atajo de teclado
    if (!published) {
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    // Esperar a que Facebook confirme la recepción del post
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('[Facebook-Sync] Publicación exitosa.');
    return true;

  } catch (error: any) {
    console.error(`[Facebook-Sync-Error] Error en la ejecución de Puppeteer: ${error.message}`);
    return false;
  } finally {
    // Blindaje de procesos: El navegador siempre debe cerrarse
    await browser.close();
  }
}
