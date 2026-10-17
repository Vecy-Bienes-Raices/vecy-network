### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.21.0 — 2026-10-17)
- **JanIA Server:** `v33.21` (`33.21.0`) listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Título y Marco Legal Propio por Servicio (`🛡️ VERIFICACIÓN OFICIAL DE EMPRESA` vs `☑️ VERIFICACIÓN OFICIAL DE IDENTIDAD`), Pregunta de Seguimiento en Mensaje Separado y Flujo Interactivo NO vs SÍ:** Diferenciación estricta entre Persona Jurídica (`🛡️ *VERIFICACIÓN OFICIAL DE EMPRESA — VECY BIENES RAÍCES* 🇨🇴` + `⚖️ *_Publicidad Mercantil y Datos Públicos (Art. 26 C. de Co. y Ley 1581/12):_*`) y Persona Natural (`☑️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴` + `🛡️ *_Habeas Data (Ley 1581/12):_*`). La pregunta `💡 *¿Deseas que realice la verificación de identidad y antecedentes...*` se envía en un **mensaje separado** después del reporte de empresa; si el usuario responde **NO**, JanIA envía la invitación a calificar y comentar haciendo alusión a que ayuda a que estos servicios sigan siendo **100% GRATUITOS**; si responde **SÍ**, JanIA verifica el documento y entrega el reporte de identidad con su formato y título propios.
- **Plantilla Informativa Oficial RUES de 4 Secciones (NIT ↔ Razón Social) y Verificación Post-Reporte de Miembros:** Estructuración completa en `server/_core/ruesService.ts` y `server/_core/identityVerificationService.ts` de las 4 secciones de RUES (1. Información General; 2. Actividad Económica CIIU 1 a 4; 3. Representante Legal Principal vs. Suplentes con documento; 4. Propietario / Establecimiento).
- **Normalización de `functionCall.args` en Gemini REST API y Motor Dual RUES Nacional (0 Puppeteer / 0 Geo-Block en VPS):** Corrección crítica en `server/_core/llm.ts` y `server/_core/jania/handlers/dmHandler.ts` para normalizar `functionCall.args` y `functionCall.arguments`, e integración en `server/_core/ruesService.ts` del motor nacional Socrata (`datos.gov.co/resource/c82u-588k.json`) junto con `elasticprd.rues.org.co`.
- **JanIA "Gemela Cognitiva de Gemini 4 Argon":** Personalidad Argon de persuasión ejecutiva, agudeza mental, calidez humana y solvencia jurídica superior; erradicación definitiva del doble saludo en DMs y entregas de herramientas.
- **Superpoderes Nativos WhatsApp Business:** Encuestas interactivas (`sendNativeWhatsAppPoll`), tarjetas de contacto vCard (`sendNativeWhatsAppContact`), eventos estructurados (`sendNativeWhatsAppEvent`) y moderación con borrado en grupos oficiales con enlace de invitación.
- **Memoria Permanente Inteligente y Entrega de Documentos PDF:** Historial continuo permanente de hasta 20 turnos con timestamp `[YYYY-MM-DD HH:mm]`, ficha histórica del contacto (`getContactPermanentDossier`) y despacho nativo de archivos PDF en WhatsApp (Predial Bogotá, Certificados de Pago y Paz y Salvo IDU).
- **Validación Limpia:** Typecheck `npm run check` (0 errores) | Tests `npm test` passing (288/288 a $0 COP) | Build `npm run build` limpio.

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


