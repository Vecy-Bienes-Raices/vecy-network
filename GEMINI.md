### 🚀 ESTADO ACTIVO DEL SISTEMA (v34.01.0 — 2026-11-06)
- **JanIA Server:** `v34.01` (`34.01.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Generación Automática de Códigos de Inmueble, Entrega de Dirección Física 24h Antes / Citas Exprés y Copia Espejo al Bróker (Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico del Caso Alfredo Anaya (Solicitud #1147 — ID-LACAR-01BOG):**
     - **Causa del fallo de entrega de WhatsApp inicial:** En el formulario de la solicitud #1147, Alfredo digitó por error `573108145757` (12 dígitos, repitiendo `57` al final en lugar de `9457`). Su número real es `+57 310 8149457`. El socket de Baileys despachó al número digitado, el cual no existe en WhatsApp. El correo a `inmovalores81@gmail.com` sí se despachó con éxito con el PDF adjunto (`Contrato_Puntas_1147_...pdf`).
     - **Causa del aviso *"Esperando el mensaje. Esto puede demorar un poco"*:*** En dispositivos vinculados (WhatsApp Web en el navegador de Eduardo), los mensajes salientes generados desde el socket Baileys en el VPS aparecen con ese aviso de sincronización si el navegador no tiene la clave de descifrado local para el `deviceSentMessage`. Sin embargo, el destinatario final (el teléfono del cliente) sí lo recibe y lo lee al instante. Para erradicar la incertidumbre en Eduardo, JanIA despacha una **copia espejo al WhatsApp oficial del Bróker (+57 316 656 9719)** como mensaje entrante directo, garantizando visibilidad 100% nítida y confirmada.
  2. **Generación Automática de Códigos de Inmueble en la Tienda (`properties.create`):**
     - El fundador ya no tiene que inventar códigos a mano. Al subir cualquier inmueble al portal, el sistema genera de forma automática y determinista el código estructurado `ID-BOG-[ZONA3][CONSECUTIVO]` (ej. para La Carolina: `ID-BOG-CAR01`, Chicó: `ID-BOG-CHI01`), almacenándolo en `externalListingId` y `canonicalExternalId`.
  3. **Protocolo Doctrinal de Entrega de Dirección Física Completa:**
     - La dirección física privada (`location`: *"KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá"*) se mantiene confidencial en la tienda pública para proteger al agente y evitar desintermediación.
     - **Cita Normal (> 24h):** JanIA despacha la confirmación inicial y programa la entrega de la dirección para exactamente 24 horas antes de la cita por WhatsApp y correo.
     - **Cita Exprés (< 24h):** JanIA despacha la confirmación inicial e inmediatamente enseguida el segundo mensaje con la dirección física completa y recomendaciones de portería.
     - **Alfredo Anaya:** Configurado para entrega el **DOMINGO 8 DE NOVIEMBRE A LAS 11:00 AM** (exactamente 24 horas antes de la cita del lunes 9 de noviembre a las 11:00 AM) de su confirmación final y dirección física con copia espejo al WhatsApp del Bróker (+57 316 656 9719) vía script `server/scripts/send_alfredo_address.ts`.
  4. **Gobernanza y Suite de Regresión 187:**
     - Semilla `seed-auto-codigos-inmuebles-entrega-direccion-cita-vecy-v34-01` en `founderKnowledgeService.ts`.
     - Suite 187 con 5 pruebas automatizadas pasando al 100%.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 187 `vitest` (100% passing) | Build `npm run build` limpio.


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


