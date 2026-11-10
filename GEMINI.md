### 🚀 ESTADO ACTIVO DEL SISTEMA (v34.07.0 — 2026-11-10)
- **JanIA Server:** `v34.07` (`34.07.0`) consolidado y validado en local y listo para despliegue en Contabo VPS (`13.140.149.144`).
- **Precisión Doctrinal en Gastos Notariales y Retención en la Fuente 1% (Homologación Notaría 19 de Bogotá y Habi — Doctrina Eduardo A. Rivera):**
  1. **Diagnóstico Técnico y Causa Raíz en Liquidación Notarial:**
     - En la captura aportada por Eduardo (`media_1794324406743_7651a298.jpg`), JanIA liquidó la venta de una casa en Morato de $1.400.198.000 con una retención en la fuente del 2.5% ($35.004.950 COP), inflando el subtotal del vendedor a $38.123.175 y el total escrituración a $68.539.966 COP.
     - Causa: Una condición errónea `precioVenta > limite20kUvt ? 2.5 : 1.0` en `notarialExpenseService.ts` y `taxEngine.ts` que aplicaba la tarifa corporativa del Art. 401 E.T. sobre la totalidad del valor a personas naturales.
  2. **Solución Doctrinal Homologada con Notaría 19 de Bogotá y Habi:**
     - Conforme al Art. 398 del Estatuto Tributario y el código fuente extraído de la calculadora oficial de la Notaría 19 de Bogotá y Habi, la retención en la fuente ante Notaría para persona natural que enajena activos fijos es EXCLUSIVAMENTE del **1.0%** (`precioVenta * 0.01`), sin importar si supera 20.000 UVT.
     - Para la Casa Morato ($1.400.198.000): La retención real del vendedor es **$14.001.980 COP**, el subtotal vendedor es **$17.120.205 COP** (¡ahorro de $21.002.970 COP frente al error previo!), el subtotal comprador es **$30.416.791 COP** y el total escrituración es **$47.536.996 COP** (en lugar de los $68.5 millones incoherentes).
     - Si el vendedor es persona jurídica, la retención en notaría es **$0 COP** por autorretención (Art. 401 E.T.).
     - Desglose de hipotecas bancarias homologado con Notaría 19 (Derechos notaría con IVA + 0.70% ORIP).
  3. **Gobernanza y Suite de Regresión 193:**
     - Semilla de conocimiento directivo `seed-precision-doctrinal-gastos-notariales-retencion-1pct-notaria19-habi-v34-07` en `founderKnowledgeService.ts`.
     - Suite 193 con 7 pruebas automatizadas pasando al 100% (673/673 tests totales en verde).
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 193 `vitest` (100% passing) | Build `npm run build` limpio en 25.81s.


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


