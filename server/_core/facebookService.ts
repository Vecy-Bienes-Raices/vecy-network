import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

/**
 * FACEBOOK GROUPS SYNC SERVICE - VECY NETWORK v11.85
 * Automatización de publicaciones en Facebook Groups usando Puppeteer.
 * Soporta sincronización de imágenes y videos (Buffers binarios o Base64).
 * Incluye blindaje contra falsos positivos y evidencia visual obligatoria.
 * Enfoque: Contexto anclado a modal de publicación (anti-desvíos de interfaz).
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
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-notifications'
    ]
  });

  let page: any;
  let tempPathToDelete: string | null = null;

  try {
    page = await browser.newPage();
    
    // Configurar cookies para mantener la sesión
    const cookies = JSON.parse(cookiesJson);
    await page.setCookie(...cookies);

    // Navegar al grupo
    await page.goto(groupUrl, { waitUntil: 'networkidle2' });

    // ==========================================
    // PASO 1: APERTURA EN LA CAJA DE TEXTO DEL FEED
    // ==========================================
    console.log('[Facebook-Sync] PASO 1: Buscando y haciendo clic en "Escribe algo..." en el feed principal...');
    let clickedPostBox = false;
    const startTime = Date.now();

    // Esperar y buscar el disparador correcto ignorando el navbar superior
    while (Date.now() - startTime < 15000) {
      const clicked = await page.evaluate(() => {
        const xpathResult = document.evaluate(
          "//*[contains(text(), 'Escribe algo...') or contains(text(), 'Write something...') or contains(text(), 'Crea una publicación') or contains(text(), 'Create a public post')]",
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          const el = xpathResult.snapshotItem(i) as HTMLElement;
          if (el) {
            // Ignorar navbar/header/barras de navegación lateral
            if (el.closest('header') || el.closest('nav') || el.closest('[role="navigation"]') || el.closest('[role="banner"]')) {
              continue;
            }
            
            // Buscar ancestro interactivo con role="button" o similar
            let clickable: HTMLElement | null = el;
            while (clickable && clickable !== document.body) {
              if (clickable.getAttribute('role') === 'button' || clickable.tagName === 'BUTTON') {
                clickable.click();
                return true;
              }
              clickable = clickable.parentElement;
            }
            // Fallback: clic directo
            el.click();
            return true;
          }
        }
        
        // Fallback: buscar botones que contengan el texto dentro del main/feed
        const main = document.querySelector('div[role="main"], div[role="feed"]');
        if (main) {
          const divs = Array.from(main.querySelectorAll('div[role="button"]'));
          for (const div of divs) {
            const text = div.textContent || '';
            if (text.includes('Escribe algo...') || text.includes('Write something...')) {
              (div as HTMLElement).click();
              return true;
            }
          }
        }
        
        return false;
      });

      if (clicked) {
        clickedPostBox = true;
        console.log('[Facebook-Sync] Clic exitoso en el disparador del feed.');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!clickedPostBox) {
      console.log('[Facebook-Sync] Selector de caja de texto no detectado. Intentando fallback con la tecla "P".');
      await page.keyboard.press('p');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // ==========================================
    // PASO 2: VERIFICACIÓN Y ANCLAJE AL MODAL
    // ==========================================
    console.log('[Facebook-Sync] PASO 2: Esperando la aparición del modal div[role="dialog"]...');
    await page.waitForSelector('div[role="dialog"]', { timeout: 8000 });
    
    // Esperar a que el contenido del modal esté cargado (el textbox esté disponible)
    console.log('[Facebook-Sync] Esperando que se cargue la estructura interna del modal (textbox)...');
    await page.waitForSelector('div[role="dialog"] div[role="textbox"]', { timeout: 10000 });

    const modalElement = await page.$('div[role="dialog"]');
    if (!modalElement) {
      throw new Error('No se encontró el elemento modal div[role="dialog"] tras la espera.');
    }
    console.log('[Facebook-Sync] Modal div[role="dialog"] detectado y anclado correctamente.');

    // ==========================================
    // PASO 3: CARGA DEL VIDEO DIGITAL (BOTÓN FOTO/VIDEO)
    // ==========================================
    if (mediaData) {
      console.log('[Facebook-Sync] PASO 3: Procesando y cargando archivo multimedia...');
      
      // Intentar hacer clic en el botón de "Foto/video" dentro del modal usando una estrategia de múltiples capas
      const clickedMediaBtn = await page.evaluate((modal: any) => {
        if (!modal) return false;
        
        const allElements: any[] = Array.from(modal.querySelectorAll('*'));
        
        // Estrategia 1: Buscar por aria-label (insensible a mayúsculas/minúsculas)
        for (const el of allElements) {
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          if (ariaLabel === 'foto/video' || ariaLabel === 'photo/video' || ariaLabel.includes('foto/video')) {
            (el as HTMLElement).click();
            return true;
          }
        }
        
        // Estrategia 2: Buscar por contenido de texto exacto o parcial
        for (const el of allElements) {
          const text = (el.textContent || '').toLowerCase().trim();
          if (text === 'foto/video' || text === 'photo/video') {
            let clickable = el as HTMLElement;
            while (clickable && clickable !== modal) {
              if (clickable.getAttribute('role') === 'button' || clickable.tagName === 'BUTTON') {
                clickable.click();
                return true;
              }
              clickable = clickable.parentElement!;
            }
            (el as HTMLElement).click();
            return true;
          }
        }

        // Estrategia 3: Buscar contenedor "Agregar a tu publicación" y hacer clic en el primer botón/icono al lado
        const containerTexts = ['agregar a tu publicación', 'add to your post', 'agregar a tu publicacion'];
        for (const el of allElements) {
          const text = (el.textContent || '').toLowerCase().trim();
          if (containerTexts.some((ct: any) => text.includes(ct))) {
            let parent = el.parentElement;
            while (parent && parent !== modal) {
              // Buscar todos los botones interactivos dentro de este contenedor
              const buttons: any[] = Array.from(parent.querySelectorAll('div[role="button"], [aria-label]'));
              const iconButtons = buttons.filter((btn: any) => btn !== el && !btn.textContent?.toLowerCase().includes(text));
              if (iconButtons.length > 0) {
                // El primer icono suele ser el de Foto/Video
                (iconButtons[0] as HTMLElement).click();
                return true;
              }
              parent = parent.parentElement;
            }
          }
        }
        
        return false;
      }, modalElement);

      if (clickedMediaBtn) {
        console.log('[Facebook-Sync] Clic en el disparador multimedia ejecutado con éxito.');
      } else {
        console.log('[Facebook-Sync] Advertencia: No se pudo localizar el botón multimedia explícito, se buscará el input directamente.');
      }

      // Esperar a que el input file esté disponible en el modal
      const fileInputSelector = 'div[role="dialog"] input[type="file"]';
      await page.waitForSelector(fileInputSelector, { timeout: 8000 });
      
      const fileInput = await modalElement.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('No se encontró el elemento input[type="file"] anidado en el modal.');
      }

      // Escribir archivo temporal en el workspace
      const tempFileName = `temp_fb_upload_${Date.now()}.mp4`;
      const tempPath = path.resolve(process.cwd(), tempFileName);
      tempPathToDelete = tempPath;

      if (Buffer.isBuffer(mediaData)) {
        fs.writeFileSync(tempPath, mediaData);
      } else {
        fs.writeFileSync(tempPath, Buffer.from(mediaData, 'base64'));
      }
      console.log(`[Facebook-Sync] Archivo temporal creado: ${tempPath}`);

      // Inyectar el archivo binario
      await fileInput.uploadFile(tempPath);
      console.log('[Facebook-Sync] Archivo inyectado en el input de carga.');

      // Esperar procesamiento de carga multimedia de Meta
      console.log('[Facebook-Sync] Esperando procesamiento multimedia de Meta...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        await page.waitForFunction(() => {
          const dialog = document.querySelector('div[role="dialog"]');
          if (!dialog) return false;

          const buttons = Array.from(dialog.querySelectorAll('div[role="button"], div[aria-label]'));
          const pubButton = buttons.find(el => {
            const label = el.getAttribute('aria-label');
            const text = el.textContent || '';
            return label === 'Publicar' || label === 'Post' || text.trim() === 'Publicar' || text.trim() === 'Post';
          });

          if (!pubButton) return false;

          // Habilitado si no tiene los atributos/clases de desactivado
          const isDisabled = pubButton.getAttribute('aria-disabled') === 'true' || 
                             pubButton.getAttribute('disabled') !== null ||
                             pubButton.classList.contains('disabled');
          return !isDisabled;
        }, { timeout: 30000 });
        console.log('[Facebook-Sync] Procesamiento multimedia completado.');
      } catch (e) {
        console.log('[Facebook-Sync] Latencia detectada en carga multimedia de Meta. Continuando...');
      }
    }

    // ==========================================
    // PASO 4: INGRESO DE TEXTO COMERCIAL
    // ==========================================
    console.log('[Facebook-Sync] PASO 4: Enfocando y escribiendo copy comercial...');
    const textBoxSelector = 'div[role="dialog"] div[role="textbox"]';
    await page.waitForSelector(textBoxSelector, { timeout: 8000 });
    
    const textBox = await modalElement.$('div[role="textbox"]');
    if (!textBox) {
      throw new Error('No se encontró el cuadro de texto (textbox) dentro del modal.');
    }

    await textBox.focus();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Escribir el contenido simulando tipeado humano
    await page.keyboard.type(content, { delay: 35 });
    console.log('[Facebook-Sync] Copy comercial ingresado con éxito.');

    // ==========================================
    // PASO 5: CLIC FINAL EN EL BOTÓN AZUL {{PUBLICAR}}
    // ==========================================
    console.log('[Facebook-Sync] PASO 5: Localizando botón de publicación definitiva...');
    
    const publishBtnHandle = await page.waitForFunction(() => {
      const dialog = document.querySelector('div[role="dialog"]');
      if (!dialog) return null;

      const buttons = Array.from(dialog.querySelectorAll('div[role="button"], div[aria-label]'));
      const pubButton = buttons.find(el => {
        const label = el.getAttribute('aria-label');
        const text = el.textContent || '';
        return label === 'Publicar' || label === 'Post' || text.trim() === 'Publicar' || text.trim() === 'Post';
      });

      if (!pubButton) return null;

      const isDisabled = pubButton.getAttribute('aria-disabled') === 'true' || 
                         pubButton.getAttribute('disabled') !== null ||
                         pubButton.classList.contains('disabled');
      
      return !isDisabled ? pubButton : null;
    }, { timeout: 15000 });

    if (!publishBtnHandle) {
      throw new Error('El botón de publicar no está habilitado o no fue encontrado.');
    }

    const publishBtn = publishBtnHandle.asElement();
    if (publishBtn) {
      await publishBtn.click();
      console.log('[Facebook-Sync] Clic físico ejecutado sobre el botón.');
    } else {
      // Fallback por evaluación JS si falla la conversión de ElementHandle
      await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"]');
        if (dialog) {
          const buttons = Array.from(dialog.querySelectorAll('div[role="button"], div[aria-label]'));
          const pubButton = buttons.find(el => {
            const label = el.getAttribute('aria-label');
            const text = el.textContent || '';
            return label === 'Publicar' || label === 'Post' || text.trim() === 'Publicar' || text.trim() === 'Post';
          }) as HTMLElement;
          if (pubButton) pubButton.click();
        }
      });
      console.log('[Facebook-Sync] Clic fallback ejecutado por JS.');
    }

    // ==========================================
    // TELEMETRÍA Y CONTROL DE CIERRE (ÉXITO)
    // ==========================================
    console.log('[Facebook-Sync] Esperando 5000ms para confirmación de guardado en servidores de Meta...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.screenshot({ path: "./evidencia_publicacion.png", fullPage: true });
    console.log("[Facebook-Sync] Captura de confirmación visual guardada en ./evidencia_publicacion.png");

    console.log('[Facebook-Sync] Proceso finalizado exitosamente.');
    return true;

  } catch (error: any) {
    // ==========================================
    // TELEMETRÍA Y CONTROL DE CIERRE (FALLO)
    // ==========================================
    if (page) {
      try {
        await page.screenshot({ path: "./error_facebook.png", fullPage: true });
        console.log('[Facebook-Sync-Error] Captura de pantalla de error guardada en ./error_facebook.png');
      } catch (screenshotError) {
        console.error('[Facebook-Sync-Error] No se pudo tomar la captura de pantalla de error:', screenshotError);
      }
    }
    console.error(`[Facebook-Sync-Error] Fallo en la automatización: ${error.message}`);
    return false;

  } finally {
    // Limpieza de archivos temporales
    if (tempPathToDelete && fs.existsSync(tempPathToDelete)) {
      try {
        fs.unlinkSync(tempPathToDelete);
        console.log('[Facebook-Sync] Archivo temporal limpiado.');
      } catch (e) {}
    }
    if (browser) {
      await browser.close();
      console.log('[Facebook-Sync] Instancia de Puppeteer cerrada.');
    }
  }
}
