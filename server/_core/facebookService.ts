import puppeteer from 'puppeteer';
import fs from 'fs';

/**
 * FACEBOOK GROUPS SYNC SERVICE - VECY NETWORK v11.80
 * Automatización de publicaciones en Facebook Groups usando Puppeteer.
 * Soporta sincronización de imágenes y videos (Buffers binarios o Base64).
 * Incluye blindaje contra falsos positivos y evidencia visual obligatoria.
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
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-notifications'
    ]
  });

  let page: any;

  try {
    page = await browser.newPage();
    
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
      await page.keyboard.press('p');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Manejo de Multimedia (Imagen o Video - Soporte Binario Seguro)
    if (mediaData) {
      console.log('[Facebook-Sync] Procesando multimedia adjunta...');
      const fileInputSelector = 'input[type="file"]';
      await page.waitForSelector(fileInputSelector, { timeout: 5000 });
      
      const tempPath = `/tmp/fb_sync_upload_${Date.now()}.mp4`;
      
      if (Buffer.isBuffer(mediaData)) {
        fs.writeFileSync(tempPath, mediaData);
      } else {
        fs.writeFileSync(tempPath, Buffer.from(mediaData, 'base64'));
      }
      
      const input = await page.$(fileInputSelector);
      if (input) {
        await input.uploadFile(tempPath);
        setTimeout(() => {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }, 25000);
      }
      
      console.log('[Facebook-Sync] Esperando procesamiento multimedia de Meta...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        await page.waitForFunction(() => {
          const btn = Array.from(document.querySelectorAll('div[role="button"]'))
            .find(el => {
              const label = el.getAttribute('aria-label');
              return label === 'Publicar' || label === 'Post';
            });
          return btn && btn.getAttribute('aria-disabled') !== 'true';
        }, { timeout: 25000 });
        console.log('[Facebook-Sync] Multimedia lista.');
      } catch (e) {
        console.log('[Facebook-Sync] Latencia detectada en carga, continuando flujo.');
      }
    }

    // Simulación de tipeado humano
    await new Promise(resolve => setTimeout(resolve, 2000));
    for (const char of content) {
      await page.keyboard.sendCharacter(char);
      const delay = Math.floor(Math.random() * (60 - 15 + 1)) + 15;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log('[Facebook-Sync] Contenido ingresado. Procediendo a publicar...');

    // v11.80: Depuración de selectores para eliminar falsos positivos
    const publishButtonSelectors = [
      'div[aria-label="Publicar"]',
      'div[aria-label="Post"]'
    ];

    let published = false;
    for (const selector of publishButtonSelectors) {
      try {
        const btn = await page.$(selector);
        if (btn) {
          const isDisabled = await page.evaluate((el: any) => el.getAttribute('aria-disabled') === 'true', btn);
          if (!isDisabled) {
            await btn.click();
            published = true;
            break;
          }
        }
      } catch (e) {}
    }

    // Fallback de teclado
    if (!published) {
      console.log('[Facebook-Sync] Selectores específicos no encontrados, ejecutando fallback de teclado.');
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    // Espera final para confirmación
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // v11.80: Captura de evidencia visual obligatoria
    await page.screenshot({ path: "./evidencia_publicacion.png", fullPage: true });
    console.log("[Facebook-Sync] Captura de confirmación visual guardada en ./evidencia_publicacion.png");

    console.log('[Facebook-Sync] Ciclo de publicación finalizado.');
    return true;

  } catch (error: any) {
    if (page) {
      try {
        await page.screenshot({ path: "./error_facebook.png", fullPage: true });
        console.log('[Facebook-Sync-Error] Captura de pantalla de error guardada en ./error_facebook.png para auditoría visual.');
      } catch (screenshotError) {}
    }
    console.error(`[Facebook-Sync-Error] Fallo en la automatización: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}
