### 🚀 ESTADO ACTIVO DEL SISTEMA (v34.08.0 — 2026-11-10)
- **JanIA Server:** `v34.08` (`34.08.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Reagendamiento Transparente de Citas, Despacho Concurrente y Aclaración Inmediata al Usuario (Caso Alfredo Anaya — Solicitud #1147 — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - Alfredo Anaya recibió un correo atrasado indicando la cita del lunes 9 de noviembre a las 11:00 AM, debido a que en la prueba de alto contraste se re-ejecutó el despacho sobre los datos antiguos registrados en la base de datos.
     - Dicha cita del lunes había sido cancelada por indisponibilidad/incumplimiento de los propietarios y reprogramada de común acuerdo para el **miércoles 11 de noviembre de 2026 a las 3:00 PM (15:00)** en el mismo apartamento (ID-LACAR-01BOG, Edificio Inmoval VI, La Carolina, Bogotá).
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - En `agendaWhatsAppService.ts`: `buildClientAppointmentAddressMessage` ahora detecta si una cita es `reagendada` y despliega el encabezado explícito `🔄 *CONFIRMACIÓN DE CITA REAGENDADA Y DIRECCIÓN OFICIAL*`, detalla la fecha anterior cancelada, la nota aclaratoria, los datos del acompañante (`Adriana Alvarez Barriga`, C.C. `21069381`) y la dirección completa confirmada (`KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá`).
     - En `emailContractService.ts`: `sendAppointmentAddressEmail` adapta dinámicamente el asunto (`🔄 Confirmación de Cita Reagendada y Dirección Oficial | Solicitud #1147 - La Carolina | Vecy Bienes Raíces`), incluye un banner de aclaración oficial, destaca la nueva fecha del miércoles 11 a las 3:00 PM, muestra la fecha anterior postergada, la dirección física confirmada y el botón de 1-clic a Google Calendar con estilos de alto contraste (`#ffffff !important`).
     - En `server/_core/index.ts`: Creado endpoint administrativo `POST /api/admin/reschedule-and-dispatch-appointment` que actualiza la base de datos PostgreSQL de forma atómica y ejecuta el despacho concurrente de WhatsApp y Correo Electrónico dentro del proceso activo de PM2 con Baileys conectado.
     - Script `send_alfredo_address.ts` actualizado con la nueva fecha oficial y nota aclaratoria.
  3. **Gobernanza y Suite de Regresión 194:**
     - Semilla directiva `seed-reagendamiento-citas-aclaracion-notificacion-inmediata-alfredo-anaya-v34-08` en `founderKnowledgeService.ts`.
     - Suite 194 con 4 pruebas automatizadas pasando al 100% (677/677 tests en verde).
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 194 `vitest` (100% passing) | Build `npm run build` limpio en 36.52s.


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


