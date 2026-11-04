### 🚀 ESTADO ACTIVO DEL SISTEMA (v33.94.0 — 2026-11-04)
- **JanIA Server:** `v33.94` (`33.94.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Suite Proptech IA de 7 Herramientas Pro Personalizables (Ingeniería Inversa Superada de Wasi, Qrador, Habi/Casacol, Matterport y DocuSign/Autentic — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico y Visión de Eduardo A. Rivera:**
     - Incorporar al ecosistema de Marca Propia y Marca Blanca Neutra las herramientas analizadas mediante Ingeniería Inversa de Arquitectura (REA), incluyendo a **Qrador** (búsqueda semántica con IA y colecciones curadas), **Habi/Casacol** (avalúo instantáneo ACM captador de propietarios), **Matterport/Giraffe360** (Home Staging Virtual IA) y **DocuSign/Autentic** (contratos inmobiliarios con sello digital Ley 527).
  2. **Las 7 Herramientas Pro Personalizables Activas en Dashboard y Micro-Sitio (`/s/:slug`):**
     - **1. Vecy Agenda Pro Marca Propia:** Notificaciones enrutadas al WhatsApp y correo propios del suscriptor (`customAgentWhatsapp`, `customAgentEmail`).
     - **2. Widget de Agente IA Personalizable:** IA Femenina/Masculina, 6 personalidades (`Normal`, `Audaz`, `Profesional`, `Extrovertida`, `Seria`, `Cordial`) y prompt propio.
     - **3. Simulador Hipotecario Bancario & Calculadora ROI Inversor.**
     - **4. Buscador Semántico & Curador de Colecciones IA (Estilo Qrador):** `agent.semanticCuratorSearch` con score de afinidad 85%-99% y colecciones compartibles por WhatsApp.
     - **5. Avalúo Instantáneo ACM & Captador de Propietarios (Estilo Habi/Casacol):** `agent.calculateInstantValuation` con rango de venta, precio/$m^2$, canon mensual y `+50 vPoints` por lead.
     - **6. Estudio de Home Staging Virtual & Remodelación IA (Estilo Matterport/Qrador Photo AI):** `agent.generateVirtualStagingPlan` con comparador interactivo Antes/Después en 5 estilos arquitectónicos.
     - **7. Generador de Contratos & Promesas Ley 527 (Estilo DocuSign/Autentic):** `agent.generateBrandedLegalContract` con 4 minutas colombianas, código `CUV-LEY527` y sello `SHA-256`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-suite-proptech-ia-qrador-habi-staging-docusign-v33-94` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 180 `vitest` (6/6 passing) | Build `npm run build` limpio.


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


