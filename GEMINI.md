### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.88.0 — 2026-11-03)
- **JanIA Server:** `v33.88` (`33.88.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Doctrina de Verdad en Encuestas Interactivas (Exclusivas en Grupos Oficiales de WhatsApp y Cero Falsedad de Encuesta en el Canal Oficial — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Crítico de Eduardo A. Rivera:**
     - En los grupos oficiales (Grupo 2 y 3), JanIA enviaba la encuesta interactiva nativa (con opciones y botones de votación en vivo) pero el mensaje de acompañamiento decía falsamente: *"Acabamos de activar nuestra encuesta interactiva en el Canal Oficial: «¿Qué tanto castiga el precio un garaje lineal?» ... 👉 Sigue el Canal Oficial y vota aquí"*.
     - En los canales de WhatsApp (`@newsletter`), la arquitectura oficial de Meta no soporta widgets interactivos de votación para seguidores. La encuesta interactiva en vivo se realiza **exclusivamente en los grupos oficiales**.
     - Mandato terminante de Eduardo: *"si vas a hacer la encuesta solamente en los grupos, pues por favor que el post hable de que la encuesta está en los grupos y no en el canal ya que eso de que la encuesta está en el canal es falso. Que NO SE TE OLVIDE NUNCA."*
  2. **Solución y Blindaje Quirúrgico:**
     - **Erradicación de la Falsedad:** El post en los grupos ahora declara con total honestidad y exactitud: **"📊 ENCUESTA Y DEBATE OFICIAL EN NUESTROS GRUPOS VECY"** y *"Acabamos de activar nuestra encuesta interactiva aquí en nuestros grupos oficiales de WhatsApp:"*, invitando a los colegas a votar en la encuesta nativa *"aquí arriba en el chat"*.
     - **Canal Oficial como Medio Informativo:** El enlace al Canal Oficial se presenta honestamente como canal de novedades (*"👉 Sigue también nuestro Canal Oficial de novedades:"*), sin afirmar jamás que la votación interactiva se hace en el canal.
     - **Desacoplamiento Operativo:** Los envíos a grupos oficiales no se cancelan ni abortan por limitaciones o caídas del canal newsletter.
     - **Registro de Enseñanza:** Registrada la directriz `seed-encuestas-interactivas-exclusivas-grupos-oficiales-verdad-canal-v33-88` en `founderKnowledgeService.ts`, `base.md` y `prompts.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 174 `vitest` (5/5 passing, 564 tests) | Build `npm run build` limpio en 24.5s.


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


