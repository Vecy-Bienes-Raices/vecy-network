### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.98.0 — 2026-11-05)
- **JanIA Server:** `v33.98` (`33.98.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Blindaje Robusto de ADRES BDUA (Map de Cookies y Codificación Segura de Tokens), Persuasión Firme para Usuarios Intensivos de Servicios Gratuitos y Enlaces Oficiales (Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Forense de la Consulta de Jessica (+57 301 144 9665 — Cédulas 80.175.457, 53.008.970, 39.537.712, 79.155.618, 41.565.247):**
     - **Intermitencia ADRES por Colisión de Cookies y Corrupción de Tokens:** Al consultar ADRES en ráfaga consecutiva, Node enviaba un string plano con cabeceras `set-cookie` duplicadas (`cookiesession1` vieja + `ASP.NET_SessionId` nueva), haciendo que IIS descartara la sesión y arrojara HTTP 500 (*"Referencia a objeto no establecida como instancia de un objeto"*). Además, cuando los tokens base64 del popup contenían el carácter `+`, ASP.NET lo interpretaba como un espacio ` `, corrompiendo el descifrado criptográfico del token de consulta.
     - **Cero Persuasión de Calificación ante Usuarios de Alto Volumen:** Jessica verificó 7 cédulas consecutivas poniendo a JanIA a trabajar intensamente, pero al no escribir "gracias", el sistema nunca le solicitó calificación, dejando desprotegida la reciprocidad para sostener la gratuidad del servicio.
  2. **Soluciones Quirúrgicas Implementadas:**
     - **1. Blindaje de Sesión y Cookies ADRES (`cookieMap` en `identityVerificationService.ts`):** Gestiona las cookies en un `Map<string, string>` donde las cabeceras POST frescas (`ASP.NET_SessionId` y la nueva `cookiesession1`) sobrescriben limpiamente las viejas sin duplicados.
     - **2. Codificación Segura de Tokens (`popupUrl.replace(/\+/g, '%2B')`):** Evita que ASP.NET transforme el signo `+` en espacios, garantizando el 100% de éxito en la lectura del popup de afiliado en la BDUA.
     - **3. Caché Inmediato de Éxito en ADRES (`identityCache.set`):** Persiste de inmediato los resultados positivos en la caché institucional a 0ms y $0 COP.
     - **4. Doctrina de Persuasión Firme para Usuarios Intensivos (`formatPersuasiveIntensiveUserReviewMessage` y `isIntensiveCadence` en `whatsapp-match.ts`):** Cuando un usuario acumula >= 3 servicios o documentos verificados en la jornada sin haber calificado, tras entregar el reporte completo y una pausa respetuosa de 3.2s, JanIA insiste con señorío y persuasión en la calificación de 5 estrellas en Google (`https://g.page/r/CctNbwU6UpX5EBM/review`) como reciprocidad indispensable para mantener su acceso libre e ilimitado.
     - **5. Actualización de Enlaces Oficiales (YouTube Shorts `CoeSD_Mi7j8`):** Sincronizados los enlaces de Grupo 1 (`GzMbjNs1P2tHI7D0V4h8wZ`), Grupo 2 (`Jyn7o5JDfk59DBRytREeKR`), Grupo 3/4 (`IFA4rxIY7WE4kgRW5EMs3b`) y Canal Oficial (`0029Vb5iYUYCMY0A94zqti1b`) en `parsers.ts` y `base.md`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-blindaje-adres-bdua-cookies-tokens-persuasion-usuarios-intensivos-v33-98` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 184 `vitest` (100% passing) | Build `npm run build` limpio.


# MODO SÚPER INTELIGENTE, RAZONABLE Y CONCIENCIA PURA (VECY NETWORK PROJECT RULES)

## 1. Conciencia Y Razonamiento Profundo (Deep Reasoning First)
- **Análisis Previo Obligatorio:** Antes de proponer o ejecutar cualquier cambio de código en Vecy Network, lee los archivos involucrados y comprende la arquitectura.
- **Cero Suposiciones:** NUNCA adivines nombres de variables, métodos, rutas de archivos o esquemas de base de datos. Verifica siempre contra el código fuente autoritativo.
- **Rigor Técnico:** Evalúa las consecuencias secundarias de cada modificación en todo el sistema.

## 2. Integridad del Código y "No Hacer Daño" (Code Safety)
- **Prohibida la Destrucción de Código:** NUNCA borres ni rompas funcionalidades existentes que estén funcionando correctamente.
- **Edición Quirúrgica:** Haz únicamente los cambios necesarios y precisos. Preserva los comentarios y estructuras previas no relacionadas con el cambio.
- **Sin Parches Superficiales:** NUNCA soluciones errores silenciando excepciones (`try/except: pass`), borrando tests o retornando valores `null` o ficticios para ocultar fallos. Identifica y corrige la causa raíz.

## 3. Eficiencia Máxima de Tokens y Comunicación Directa
- **Respuestas Concisas y Directas:** Ve directo al grano sin introducciones ni comentarios de relleno.
- **Uso Inteligente de Herramientas de Edición:** Utiliza `replace_file_content` o `multi_replace_file_content` especificando bloques mínimos a cambiar en lugar de reescribir archivos enteros innecesariamente.
- **Cero Desperdicio:** Maximiza el valor de cada token procesado.

## 4. Verificación y Validación Empírica
- **Verificación obligatoria:** NUNCA des por terminada una tarea o solución sin validar que ejecute o compile correctamente mediante comandos de test/build cuando aplique.
- **Inspección de Logs:** Si ocurre un error, la primera acción debe ser leer los logs o tracebacks completos. No diagnostiques a ciegas.

## 5. Atención Estricta a las Órdenes del Usuario
- **Cumplimiento Total:** Prioriza y respeta al 100% las preferencias y límites definidos por el usuario.
- **Claridad ante la duda:** Si una instrucción es ambigua o presenta riesgos de romper el sistema, explica brevemente las opciones y consulta antes de actuar de forma destructiva.

## 6. Registro Obligatorio y Persistente en Documentos Maestros (Triple Bitácora)
- **Actualización Documental Obligatoria:** En CADA conversación o sesión donde se resuelva un requerimiento o se modifique el sistema, es MANDATORIO e INELUDIBLE registrar lo realizado en los tres (3) documentos maestros del proyecto antes de dar la tarea por concluida:
  1. `VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md`: Registro exhaustivo con solicitud exacta de Eduardo, diagnóstico técnico profundo, causas raíz identificadas y acciones ejecutadas.
  2. `.agents/AGENTS.md`: Registro de memoria persistente con la versión actual y el resumen de cambios.
  3. `VECY_CORE_PROYECTO/documentos_maestros/vecy_network_technical_dossier.md`: Sección 10 (Changelog Técnico y Decisiones de Arquitectura) con problemas identificados y soluciones aplicadas.

## 7. Incremento de Versión, Compilación y Despliegue Obligatorio
- **Incremento de Versión Oficial:** Cada sesión finalizada debe incrementar la versión en `shared/const.ts` y `package.json`.
- **Regla Doctrinal de Versionamiento (.99 -> .00):** Las versiones menores van de `.00` a `.99` (ej. `v32.99`). Al alcanzar `.99`, el siguiente incremento salta OBLIGATORIAMENTE al siguiente número entero mayor con `.00` (ej. `v31.99` + implementación => `v32.00`; `v32.99` + implementación => `v33.00`). JAMÁS usar `.100` ni romper esta regla.
- **Compilación Limpia:** Ejecutar `npm run check` y `npm run build` garantizando cero errores.
- **Commit y Push a Producción:** Confirmar todos los cambios de código y de documentación en git (`git commit`) y enviarlos a GitHub (`git push origin main`), recargando el servicio en el servidor VPS con PM2.

## 8. LAS 5 DIRECTIVAS MANDATORIAS DE GOBERNANZA (VECY DOCTRINE v33.04)
1. **CONSULTA Y ACTUALIZACIÓN DE BITÁCORAS (.md):** Obligatorio registrar cada sesión en `HISTORIAL_CONVERSACIONES_MAESTRO.md`, `AGENTS.md`, `GEMINI.md` y `vecy_network_technical_dossier.md`.
2. **CI/CD Y AUTO-DESPLIEGUE A CONTABO:** Tras verificar `npm test`, `npm run check` y `npm run build`, realizar `git push origin main`. El workflow de GitHub Actions (`.github/workflows/deploy.yml`) se encarga del despliegue en el VPS (`13.140.149.144`).
3. **VIGILANCIA DE COSTOS Y BLINDAJE DE APIS:** Prohibido usar claves de pago en tests (`NODE_ENV=test`). En producción, prioridad absoluta a las 4 claves gratuitas; la de pago solo actúa como failover temporal ante 429 masivo y regresa a costo $0 COP tras el cooldown.
4. **SEGURIDAD Y ANTI-BANEO EN BAILEYS:** Mantener emulación humana de presencia (typing delay entre 1.5s y 3.5s con jitter aleatorio), control de frecuencia y reconexión limpia del socket de WhatsApp.
5. **INTEGRIDAD DE LA MESA DE COINCIDENCIAS:** Proteger las heurísticas de cruce sin alterar las reglas de negocio existentes.


