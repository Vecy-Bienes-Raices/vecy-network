### 🚀 ESTADO ACTIVO DEL SISTEMA (v34.10.0 — 2026-11-10)
- **JanIA Server:** `v34.10` (`34.10.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Homologación Resiliente de Direcciones en Inmuebles Multirreserva, Despacho Oficial de Correos y Reconocimiento Contextual en DMs (Caso Lincy Hoyos y Ana María Díaz — Solicitudes #1148 y #1149 — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz:**
     - En `agendaWhatsAppService.ts`, `KNOWN_PROPERTY_ADDRESSES` tenía llaves únicamente en mayúsculas (`ID-LACAR-01BOG`). Las solicitudes #1148 y #1149 traían `ID-lacar-01bog` y `ID-Lacar-01bog` respectivamente. La búsqueda exacta en el diccionario JS retornaba `undefined`, cayendo al fallback `"Dirección confirmada en La Carolina, Bogotá"`.
     - Falta de inferencia por nombre del inmueble (`Apartamento en la carolina`).
     - En `dmHandler.ts`, cuando Lincy preguntó *"No veo la dirección?"*, el bot la trató como consulta fría y soltó un mensaje sobre reserva de direcciones, en vez de percatarse de que el número telefónico tenía una cita activa confirmada.
  2. **Solución Doctrinal y Arquitectural Ejecutada:**
     - En `agendaWhatsAppService.ts`: Creada y exportada `resolvePropertyAddress(codigo, nombreInmueble, customAddress)`. Normaliza case-insensitively, remueve guiones y espacios, e inspecciona `nombreInmueble`, mapeando a `"KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá"`.
     - En `server/scripts/dispatch_address_emails_1148_1149.ts`: Despacho oficial inmediato vía Gmail SMTP de los correos a Lincy Hoyos (`lincyhoyosrealestate@gmail.com`) y Ana María Díaz (`anamdiazc04@gmail.com`) con dirección confirmada, recomendaciones notariales de portería, cliente registrado `Simon Ramirez Pineda` (Doc `1020823910`), enlace 1-clic a Google Calendar y copia a `vecybienesraices@gmail.com`.
     - En PostgreSQL VPS: Filas id 252 (#1148) e id 253 (#1149) actualizadas con `direccion_inmueble = 'KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá'` y `direccion_despachada = true`.
     - En `dmHandler.ts`: Inyectada directiva `contextActiveAppointmentDirective`. Si un usuario con cita activa escribe al privado, JanIA reconoce su cita de inmediato y responde con los datos del recorrido y dirección física, sin respuestas evasivas.
     - En `server/_core/index.ts`: Añadido endpoint administrativo `POST /api/admin/dispatch-address-email-direct`.
     - En `cronService.ts`: `checkAndDispatch24hAppointmentReminders` integrado con `resolvePropertyAddress`.
  3. **Gobernanza y Suite de Regresión 196:**
     - Semilla directiva `seed-homologacion-direcciones-inmuebles-multireserva-v34-10` en `founderKnowledgeService.ts`.
     - Suite 196 con 5 pruebas automatizadas pasando al 100% (687/687 tests en verde).
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 196 `vitest` (100% passing) | Build `npm run build` limpio en 23.85s.


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


