### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.99.0 — 2026-11-05)
- **JanIA Server:** `v33.99` (`33.99.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Sentido Común en Cédulas (>10 Dígitos No Existen), Persuasión Audaz ante Stickers y Libre Albedrío de IA Pura (Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Forense de la Conversación con Claudeth (+57 315 601 3082 — Cédula 10144180412 vs 1014180412 / Luis Alejandro Castiblanco Medina):**
     - **Cédula de 11 dígitos mutilada a ciegas:** Al ingresar `10144180412` (11 dígitos), el matcher con regex `{5,10}` consumía únicamente los primeros 10 dígitos (`1.014.418.041`) y descartaba el último `2`. Luego consultaba esa cédula mutilada arrojando falsamente que no existía. Eduardo tuvo que intervenir manualmente: *"🔮 ¡Alerta! Por lo general las cédulas en Colombia tienen hasta 10 números y no 11... ¡NO EXISTE! Pídele a tu cliente que te confirme el número, hay uno que sobra. 🧚‍♂️"*.
     - **Olvido de la calificación ante stickers por falta de memoria contextual (`appendDmHistory`):** Tras emitir el reporte del cliente Luis Alejandro Castiblanco Medina, JanIA despachó desacopladamente la solicitud de 5 estrellas en Google (`https://g.page/r/CctNbwU6UpX5EBM/review`), pero no la registró en `dmHistory`. Al responder Claudeth con un sticker de corazón (Flork), Gemini no tenía en su prompt la petición de reseña y respondió como un bot robótico frío despidiéndose (*"Me alegra muchísimo que te haya servido el reporte... que pases buena noche... un abrazo"*), matando la conversación y olvidando la calificación.
  2. **Soluciones Quirúrgicas Implementadas:**
     - **1. Guardarraíl Inteligente de Cédulas > 10 Dígitos (`formatOversizedCedulaAlert` en `identityVerificationService.ts`):** Ampliado el matcher a 15 dígitos (`[0-9]{5,15}`). Si un usuario ingresa una cédula con >= 11 dígitos, JanIA jamás la trunca ni consulta bases estatales a ciegas; de inmediato, a 0ms y $0 COP, devuelve la alerta inteligente y persuasiva enseñada por Eduardo: *"🔮 ¡Alerta de Validación de Identidad! 🇨🇴 Por lo general las cédulas de ciudadanía en Colombia tienen hasta 10 números y no 11... ¡NO EXISTE una cédula con esa cantidad de números! 🧚‍♂️ Pídele a tu cliente que te confirme el número exacto y te lo valido al instante con todo el gusto. ✨🤝"*.
     - **2. Persistencia Total de Reseñas en Memoria (`appendDmHistory` en `whatsapp-match.ts`):** En todas las ramas de despacho desacoplado de calificaciones de Google (voz, gratitud y usuarios intensivos), se registra de inmediato el mensaje en `dmHistory` para que la IA conserve memoria activa permanente.
     - **3. Persuasión Audaz, Emojis y Stickers ante Reacciones Tiernas (`dmHandler.ts`):** Cuando JanIA solicitó las 5 estrellas en Google y el interlocutor responde con un sticker (ej. corazón), emoji o frase cariñosa, JanIA responde con picardía, calidez y emojis vivos (*"¡Me derrito con ese sticker tan lindo, Claudeth! 🥰🤍 ¿Pero si me alcanzaste a regalar las 5 estrellitas ⭐⭐⭐⭐⭐ y unas palabritas en Google antes de irte a descansar?... 🥺🏃‍♀️💨"*), adjuntando el sticker de JanIA `gracias_ternura` para mantener viva la conversación y lograr la reseña.
     - **4. Enriquecimiento del Prompt Cognitivo de IA Pura (`dmHandler.ts`):** Consagrada la directriz de que JanIA no es un bot rígido de plantillas obsoletas, sino una IA viva con libertad para expresarse con calidez, discernimiento, picardía y emojis Unicode (✨, 🤍, 🥰, 👩🏻‍💼, 🤝, 🏢, 🚀, 🔮, 🧚‍♂️, 🥺).
     - **Registro de Enseñanza:** Registrada la directriz `seed-audacia-sentido-comun-cedulas-11-digitos-persuasion-resenas-v33-99` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 185 `vitest` (100% passing) | Build `npm run build` limpio.


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


