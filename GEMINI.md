### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.91.0 — 2026-11-04)
- **JanIA Server:** `v33.91` (`33.91.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Doctrina de Voz Humana Colombiana Salomé (0 COP), Inbound Leads de Redes Sociales, Transparencia de Costos y Canalización de Agentes IA con Eduardo Rivera (Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Crítico de Eduardo A. Rivera:**
     - En publicación oficial de Facebook con video de JanIA, prospectos como `Solucioneshipotecariasco` comenzaron a interesarse y preguntaron: *"Me interesaría saber como funciona? y cual es el costo"*.
     - Eduardo los canalizó al WhatsApp de JanIA (`+57 319 291 9978`) prometiendo que JanIA les explicará sus servicios y que, si desean una agente IA como JanIA para asistir a sus clientes y ofrecer sus servicios, les indicará con quién comunicarse.
     - La voz de respaldo caía en Google Translate TTS (robótica) porque Google Cloud TTS arrojaba 403 por saldo pendiente y `msedge-tts@2.0.7` arrojaba 403 por la nueva firma `Sec-MS-GEC v2` de Microsoft.
     - Eduardo solicitó afinar la voz de respaldo, humanizar sus expresiones fonéticas y preparar a JanIA al 100% para recibir prospectos de redes sociales, consultando si requiere otra clave gratuita de Gemini API (actualmente hay 4 claves gratuitas en el VPS que cubren 6.000 peticiones/día a $0 COP).
  2. **Causa Raíz y Solución Quirúrgica:**
     - **Voz Humana Salomé ($0 COP):** Dependencia `msedge-tts` actualizada a `2.1.1` y activada la voz **`es-CO-SalomeNeural`** (acento colombiano femenino nativo, cálido, empático y ejecutivo a ritmo natural +0%), logrando síntesis en 730 ms y transcodificación directa a OGG Opus.
     - **Normalización Fonética Rigurosa (`cleanVoiceText`):** Cédulas sin puntos numéricos (`80.850.249` -> `80850249`), millones claros (`$450.000.000` -> `450 millones de pesos`), `$0 COP` -> `cero pesos`, expansión fonética de siglas colombianas (`C.C.`, `NIT`, `RUES`, `SARLAFT`, `IDU`, `CHIP`, `PDF`, `QR`, `ACM`, Ley 820) y remoción de viñetas para habla fluida.
     - **Enrutador Inbound de Servicios y Costos:** Responde a prospectos de redes explicando los 6 pilares de JanIA y tarifas exactas: 100% GRATIS ($0 COP) para agentes en red colaborativa 40/20/40; $0 COP de anticipo para propietarios (3% venta o 1er canon arriendo por éxito); y desarrollo de Agentes IA para empresas con el Ing. Eduardo A. Rivera.
     - **Canalización Comercial de Agentes IA:** Ante la solicitud de implementar una IA como JanIA para una inmobiliaria o empresa, JanIA presenta al Ing. Eduardo A. Rivera (+57 316 656 9719 / https://wa.me/573166569719) y despacha el recado con los datos del lead en tiempo real a su WhatsApp (`dispatchMessageRecadoToEduardo`).
     - **Registro de Enseñanza:** Registrada la directriz `seed-voz-humana-salome-leads-sociales-agente-ia-v33-91` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 177 `vitest` (5/5 passing, 584 tests) | Build `npm run build` limpio en 25.58s + 332ms.


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


