import puppeteer from 'puppeteer';

/**
 * FACEBOOK GROUPS SYNC SERVICE - VECY NETWORK v11.0
 * Automatización de publicaciones en Facebook Groups usando Puppeteer.
 */

export async function publishToFacebookGroup(content: string, mediaData?: string): Promise<boolean> {
  const groupUrl = process.env.FB_GROUP_URL || 'https://www.facebook.com/groups/vecy.inmuebles.network.co';
  const cookiesJson = process.env.FB_COOKIES_JSON;

  if (!cookiesJson) {
    console.error('[Facebook-Sync-Error] No se encontró FB_COOKIES_JSON en las variables de entorno.');
    return false;
  }

  console.log(`[Facebook-Sync] Iniciando publicación en el grupo: ${groupUrl}`);
  
  const browser = await puppeteer.launch({
    headless: true,
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
      await page.keyboard.press('p');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Manejo de Multimedia (Imagen o Video)
    if (mediaData) {
      console.log('[Facebook-Sync] Cargando multimedia adjunta...');
      // Selector genérico para input de archivos en FB
      const fileInputSelector = 'input[type="file"]';
      await page.waitForSelector(fileInputSelector, { timeout: 5000 });
      
      // Guardamos el buffer temporalmente (usamos mp4 como extensión genérica compatible)
      const tempPath = `/tmp/fb_upload_${Date.now()}.mp4`;
      const fs = await import('fs');
      fs.writeFileSync(tempPath, Buffer.from(mediaData, 'base64'));
      
      const input = await page.$(fileInputSelector);
      if (input) {
        await input.uploadFile(tempPath);
        setTimeout(() => fs.unlinkSync(tempPath), 15000);
      }
      await new Promise(resolve => setTimeout(resolve, 8000)); // Más tiempo para videos
    }

    // Escribir el contenido con retraso humano
    await new Promise(resolve => setTimeout(resolve, 2000));
    const activeElement = await page.evaluateHandle(() => document.activeElement);
    
    for (const char of content) {
      await page.keyboard.sendCharacter(char);
      const delay = Math.floor(Math.random() * (60 - 15 + 1)) + 15;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log('[Facebook-Sync] Contenido escrito. Publicando...');

    // Localizar botón "Publicar" (Suele ser un div con role="button" que contiene el texto)
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

    if (!published) {
      // Si fallan los selectores, intentar con Enter
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    // Esperar procesamiento en servidores de Meta
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('[Facebook-Sync] Proceso finalizado con éxito.');
    return true;

  } catch (error: any) {
    console.error(`[Facebook-Sync-Error] Fallo en la automatización: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}
