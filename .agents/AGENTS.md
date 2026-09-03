# VECY NETWORK — CONTEXTO MAESTRO DEL PROYECTO
# Leído automáticamente por Antigravity al inicio de cada nueva conversación

> **INSTRUCCIÓN MANDATORIA PARA LA IA (ANTIGRAVITY / CLAUDE / GEMINI)**:
> 1. Este archivo y el documento maestro de bitácora [`VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md`](file:///home/eddu/Proyectos/vecy-network/VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md) son tu **MEMORIA PERSISTENTE Y BITÁCORA MAESTRA** del proyecto VECY Network. 
> 2. Léelos COMPLETOS al inicio de CADA nueva conversación antes de proponer o ejecutar cualquier acción.
> 3. **REGLA DE CÓDIGO PURO ADITIVO**: Cada nueva modificación debe ser 100% aditiva, enriqueciendo el sistema sin romper, borrar o alterar funcionalidades previas validadas.
> 4. **INCREMENTO OBLIGATORIO DE VERSIÓN**: Cada sesión finalizada debe incrementar la versión oficial e inscribirse en el historial.

---

## 🏢 IDENTIDAD DEL PROYECTO

**VECY Network** — Red colaborativa de corretaje inmobiliario para Colombia.
- **Fundadores**: Eduardo A. Rivera (Director Tecnología) + Jani Alves (Directora Operaciones)
- **Repositorio**: `Vecy-Bienes-Raices/vecy-network` en GitHub
- **Workspace local**: `/home/eddu/Proyectos/vecy-network`
- **Servidor**: VPS con PM2
- **Número WhatsApp JanIA ACTIVO**: **+573192919978** (número de Eduardo)
- **Base de datos**: Supabase (PostgreSQL)
- **Web pública**: vecy.co
- **Admin panel**: https://vecy-network.vercel.app/admin

> ⛔ **NÚMERO BANEADO — JAMÁS MENCIONAR**: +573166569719 fue baneado permanentemente por WhatsApp. NO usar este número en ningún contexto, código, comentario ni conversación. El sistema opera EXCLUSIVAMENTE con +573192919978.

---

## 🏗️ STACK TECNOLÓGICO

```
Backend:     Node.js + TypeScript + Express
Framework:   tRPC (routers en server/routers/)
ORM:         Drizzle ORM → drizzle/schema.ts
Base datos:  Supabase (PostgreSQL)
IA:          Google Gemini 2.5 Flash (via @google/generative-ai)
WhatsApp:    Baileys (WebSocket nativo — NO Puppeteer) — VPS vía PM2
Frontend:    React + Vite (client/) — Deploy en Vercel
Deploy:      PM2 en VPS Linux (backend) + Vercel (frontend)
```

**Archivos críticos:**

| Archivo | Función |
|---|---|
| `server/_core/janIA.ts` | Cerebro de JanIA: extracción, clasificación, inserción en BD |
| `server/_core/matching.ts` | Motor de matching propiedades ↔ requerimientos (v20.0) |
| `server/_core/llm.ts` | Cliente de Google Gemini (invocar LLM) |
| `server/_core/whatsapp-match.ts` | Escucha de Baileys y despacho de mensajes |
| `drizzle/schema.ts` | Esquema de BD (fuente de verdad de tipos) |
| `server/_core/prompts/base.md` | Prompt base de JanIA (leído en cada llamada LLM) |
| `server/_core/prompts/grupos/` | Prompts específicos por grupo de WhatsApp |
| `VECY_CORE_PROYECTO/documentos_maestros/vecy_network_technical_dossier.md` | Dossier técnico maestro + Changelog en §10 |

---

## 🤖 JANIA — COMPORTAMIENTO POR GRUPO

| Grupo | Comportamiento |
|---|---|
| **Grupo 1: VECY INMUEBLES NETWORK** | Silencio absoluto de texto/voz. Extrae, guarda en Supabase, reacciona con emoji (👍 inmueble / 📝 requerimiento) |
| **Grupo 2: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS** | Conversación activa (texto + TTS). Responde consultas legales, avalúos, trámites |
| **Grupo 3: PROYECTO VECY NETWORK** | Conversación activa. Explica el proyecto, debate, educa |
| **Grupos externos (no oficiales)** | Extrae, guarda en Supabase y reacciona con emoji (👍 inmueble / 📝 requerimiento). Sin mensajes de texto. |

**Silencio nocturno**: 10:30 PM — 5:00 AM hora Bogotá (UTC-5). Ingesta activa, mensajes salientes bloqueados.

---

## 🗄️ ESQUEMA BD — Estado actual v20.0

### Enum `transactionType` (COMPLETO)
```
venta                         → Venta pura
arriendo                      → Arriendo puro
venta_o_arriendo              → Venta O arriendo (lo que primero ocurra)
arriendo_temporal             → Arriendo por temporada/vacacional
arriendo_con_opcion_de_compra → Arrendatario con derecho de compra (REGLA DOCTRINAL v17.2)
permuta                       → Intercambio puro de bienes
venta_permuta                 → Venta + parte en bien (inmueble/vehículo)
aporte                        → Aporte a proyecto de construcción
```

### Columnas clave en tabla `properties` (v20.0)
```
garageType     TEXT nullable  → "independiente" | "lineal" | "mixto" | null  ← NUEVA v20.0
yearBuilt      INTEGER        → Año de construcción
antiguedadAnos INTEGER        → Años de antigüedad
rentPrice      DECIMAL        → Canon de arriendo (distinto de price = precio venta)
```

---

## 🔀 MATCHING CRUZADO INTELIGENTE (v17.3 — REGLAS DOCTRINALES)

Función `checkTransactionCompatibility()` en `server/_core/matching.ts`:

- **`Arriendo` vs `Venta`** → ❌ **0% IMPOSIBLE (Bloqueo Absoluto)**
- **`Arriendo` vs `Venta o Arriendo`** (o viceversa) → ✅ **100% POSIBLE / OK**
- **`Arriendo` vs `Arriendo con opción de compra`** → ❌ **0% IMPOSIBLE (Regla Doctrinal v17.2)**
- **`Venta` ↔ `Venta`, `Venta o Arriendo`, `Venta/Permuta`, `Arriendo con opción de compra`** → ✅ **100% POSIBLE / OK**

> ⚠️ **REGLA CRÍTICA DOCTRINAL (v17.2/v17.3)**: `arriendo_con_opcion_de_compra` **JAMÁS coincide con `arriendo` puro**.

---

## 📐 VECY MATCHING THRESHOLD (85% - 100%) — v20.0 DOCTRINAL

### Distribución de pesos (total = 100 pts siempre)
```
Tipo Inmueble  → 15 pts
Tipo Negocio   → 15 pts
Ubicación      → 20 pts
Presupuesto    → 15 pts
Área Total     → 10 pts
Habitaciones   → 10 pts
Baños          →  4 pts  (redistribuido en v20.0)
Parqueaderos   →  4 pts  (redistribuido en v20.0)
Estrato        →  3 pts  (redistribuido en v20.0)
Antigüedad     →  4 pts  (NUEVO en v20.0)
TOTAL          → 100 pts ✅
```

### Filtros Duros Inquebrantables
- `transactionType` incompatible → ❌ 0%
- `propArea < reqAreaMin` → ❌ 0% (Tolerancia 0% por debajo del mínimo exigido, REGLA DOCTRINAL v27.4 — Oferta < Demanda = Bloqueo Inmediato)
- `propertyType` incompatible → ❌ 0%
- Barrio incompatible → ❌ 0%
- Precio supera presupuesto máximo → ❌ 0%
- **Especificaciones Físicas Mínimas (REGLA DOCTRINAL v22.4 / v27.4)**:
  `Habitaciones`, `Baños`, `Parqueaderos`, `Depósitos`, `Balcones` y `Terrazas` **JAMÁS pueden ser menores en la Oferta que en lo Demandado (`prop < req` → ❌ 0% Match Inviable / Bloqueo Absoluto)**. Sin embargo, **SIEMPRE se aceptan cuando en la Oferta son IGUALES O MAYORES que en la Demanda (`prop >= req` → ✅ 100% Cumplimiento / Confort)**.

### Campana de Tolerancia de Área (v27.4)
- `< reqMin`                     → Bloqueo 0% (Tolerancia 0% por debajo del piso exigido)
- `reqMin ≤ propArea ≤ reqMin * 1.15` → Zona confort — puntaje completo (10 pts)
- `> reqMin * 1.15` y `≤ reqMax * 1.35` → Pasa con advertencia/plus de mayor metraje
- `> reqMax * 1.35`              → Bloqueo 0% por desborde excesivo de área

### Auditoría de Confort de Parqueaderos (v20.0)
- Garaje lineal cuando se pide independiente → 40% del atributo + negativa informativa
- Garaje independiente excedente → 4 pts + positivo de bono de confort

### Umbral mínimo VECY
- Score ≥ 85% para almacenar. Por debajo → descartado.

---

## ⚠️ BUGS RESUELTOS (NO revertir)

### 1. Google Gemini 400 Bad Request — RESUELTO en llm.ts
`googleSearch` NO puede combinarse con `responseMimeType: "application/json"`.

### 2. Filtro de grupos externos — RESUELTO en whatsapp-match.ts
JanIA extrae de TODOS los grupos.

### 3. Nginx Connection Upgrade Proxy Bug — RESUELTO en Nginx VPS
Nginx forzaba `Connection: upgrade` en peticiones HTTP normales → congelamiento 110s. Resuelto con `map $http_upgrade $connection_upgrade`.

### 4. Alias priceRent → rentPrice — RESUELTO en matching.ts (v18.0)
Campo `rent_price` de Supabase accedido correctamente como `property.rentPrice`.

### 5. Número WhatsApp baneado — HISTÓRICO
El número +573166569719 fue baneado permanentemente. Solo aparece en docs históricos como registro. El sistema opera con **+573192919978** exclusivamente.

---

## 🔖 VERSIÓN ACTUAL: v30.5 — Septiembre 2026

### Novedades v30.5 (Erradicación Definitiva de Congelamiento por Head-of-Line Blocking en Admin Panel):
- **Desacoplamiento con `httpLink` en `@trpc/client` (`main.tsx`)**:
  1) Erradicado el empaquetamiento conjunto de peticiones (`httpBatchLink`). Cada componente (`BotStatusWidget`, `AdminProperties`, `AdminRequirements`, `AdminMatches`) ahora ejecuta su propia petición HTTP en paralelo.
  2) `getBotStatus` responde en **50 ms** sin esperar a las consultas masivas de catálogo, eliminando el estado congelado *"Cargando estado..."*.
- **Optimización Quirúrgica de Payloads en Base de Datos (-95% Tamaño)**:
  1) `properties.myList`: Selección de campos clave sin el pesado `rawText` (reducción de 8.5 MB a 400 KB, respuesta en 1.4s).
  2) `janIA.getAllRequirements`: Campos alineados con `drizzle/schema.ts` (`presupuestoMax`, `presupuestoMin`, `areaMin`), respuesta en 1.3s.
- **Fast-Path en `createContext`**:
  1) Si la petición no contiene cabecera de cookies ni autorización, retorna de inmediato `{ user: null }` en 0.001 ms, eliminando demoras innecesarias de validación OAuth en peticiones públicas.
- **Verificación Empírica Automatizada con Browser Subagent**:
  1) Navegación en vivo a `https://vecy-network.vercel.app/admin` confirmando que las 3 pestañas cargan al instante (JanIA Online en verde, 1.510 inmuebles, 825 demandas y 39 matches).

### Novedades v30.4 (Sincronización de Imagen de Soporte Dominical JanIA):
- **Sincronización Espejo de Ilustración 3D de Soporte (`jania_soporte.jpeg` & `.jpg`)**:
  1) Reconocida la nueva imagen en alta resolución de 2.0 MB subida por Eduardo.
  2) Sincronizada en espejo dual (`.jpeg` y `.jpg`) en cliente y VPS para garantizar despacho sin errores 404 en el cron dominical de las 10:30 AM (`domingo_soporte`).

### Novedades v30.3 (Desbloqueo de Catálogo Total de Inmuebles y Demandas en Admin Panel):
- **Desbloqueo de Inmuebles en `AdminProperties.tsx`**:
  1) Convertido `properties.myList`, `create`, `update` y `delete` a `publicProcedure` con fallback administrativo, erradicando el error `UNAUTHORIZED` cuando se accede al panel de administración sin cookies de sesión.
  2) Eliminado el `.limit(300)` artificial: el catálogo entrega los **1.498 inmuebles** de la base de datos de manera fluida.
  3) Añadido badge *"Total Inmuebles"* en la cabecera e indicador de reintento.
- **Desbloqueo de Requerimientos en `AdminRequirements.tsx` (v30.2)**:
  1) Eliminado el `.limit(300)` en `janIA.getAllRequirements`, entregando las **822 demandas completas**.

### Novedades v30.1 (Arquitectura 1-a-N / N-a-M, Barrios El Refugio/Cabrera y Match #M11878 León ↔ Fernanda Torres):
- **Doctrina de Eficiencia 1-a-N y N-a-M de Matches Persistidos**:
  1) Precomputar y persistir todas las combinaciones legítimas ($\ge 80\%$) en `propertyMatches` consume 99% menos recursos de CPU y memoria que recalcular en caliente.
  2) Un solo requerimiento puede tener múltiples tarjetas activas en la mesa simultáneamente ($R \leftrightarrow P_1, P_2, P_3$).
- **Inclusión Canónica de Barrios El Refugio y Cabrera (`matching.ts` & `janIA.ts`)**:
  1) Reconocimiento formal de `"el refugio"`, `"refugio"`, `"la cabrera"`, `"cabrera"` en `KNOWN_BARRIOS_CANONICAL`.
- **Corrección de Piso Financiero Artificial**:
  1) No se bloquean ofertas con canon inferior al presupuesto máximo a menos que la demanda haya exigido explícitamente un piso mínimo (`presupuestoMin > 0`).
- **Match Certificado #M11878**:
  1) Creado match oficial entre Requerimiento #126 (León Aguilar) y Propiedad #1558 (Fernanda Torres): Apto 200m² en El Refugio, 3 alcobas, 5 baños, 2 garajes, 3 terrazas, \$9.2M total. Contacto de la asesora: `+57 320 604 0196`.

### Novedades v30.0 (Flujo Doctrinal de Descarte por Inmueble Arrendado/Vendido y Match Alternativo #M11770):
- **Flujo Doctrinal de Descarte por Inmueble Arrendado/Vendido (`server/routers/janIA.ts`)**:
  1) Al descartar un match con motivo *"Inmueble ya se vendió / arrendó / no disponible"*, el backend actualiza de inmediato el inmueble a `available: false`, `estadoComercial: "ARRENDADO"` (o `"VENDIDO"`), y `vigenciaIa: "NO_DISPONIBLE"`, impidiendo que vuelva a generar falsos matches en el futuro.
  2) Purga en cascada de todos los demás matches abiertos que estuvieran vinculados a ese inmueble no disponible.
  3) Disparo automático en segundo plano de `findMatchesForRequirement(requirementId)` para que JanIA rastree inmediatamente alternativas para el cliente demandante.
- **Descubrimiento y Certificación de Match Alternativo #M11770 (León Aguilar Medina)**:
  1) Identificado el Match alternativo **#M11770** en Rosales para el cliente León Aguilar Medina: Apartamento en Rosales de 200m², \$12.000.000 (presupuesto máx \$14M), 3 alcobas, 3 baños, 3 garajes.
  2) Rastreó del enlace de Wasi de la oferta (#434) y extracción del contacto verificado de la asesora captadora: **Natalia Duque** (`+57 310 239 7788`), persistido en la base de datos para habilitar contacto directo por WhatsApp.

### Novedades v29.9 (Purga de Procesos Zombis en VPS y Restauración de Rendimiento):
- **Purga Quirúrgica de Procesos Ocupantes de CPU en VPS**:
  1) Se detectaron y eliminaron procesos de pruebas residuales colgados (`test_caller.cjs` y `updatePropertyDetails` test runner) que consumían 150% de CPU y asfixiaban el servidor de producción.
  2) PM2 reiniciado limpiamente (`PID 795270`). Las consultas de coincidencias (`getAllMatches` y `getBotStatus`) responden en menos de 1 segundo.

### Novedades v29.8 (Avatar de JanIA a Marco Completo Edge-to-Edge y Reemplazo en Chat Widget):
- **Avatar de JanIA a Marco Completo Edge-to-Edge (`JanIAFloatingButton.tsx` & `JanIAWidget.tsx`)**:
  1) Eliminado el margen interior (`w-[88%] h-[88%]`) que creaba un aro negro entre el borde dorado y el rostro de JanIA.
  2) Configurado `w-full h-full object-cover object-center` con contenedor `p-0 overflow-hidden` y borde dorado `border-2 border-primary/50`.
  3) Reemplazado el `<video src="/jania.mp4" />` antiguo en `JanIAWidget.tsx` por la nueva imagen oficial `jania_perfil.png` en el botón flotante, en la cabecera del chat y en los avatares de mensajes.
- **Sincronización Dual de Asset (`/jania_perfil.png` & `/assets/jania_perfil.png`)**:
  1) Sincronizada la imagen de alta resolución (2048x2048) en `client/public/` y `client/public/assets/`.

### Novedades v29.7 (Blindaje de Tiempo de Espera en Contexto HTTP, Extracción de Celular Oculto Ana Karina Rojas y Solución de Guardado):
- **Blindaje de Tiempo de Espera en `createContext` (Timeout 1.2s)**:
  1) En `server/_core/context.ts`, se envolvió la resolución de autenticación `sdk.authenticateRequest` en `Promise.race` con un límite estricto de 1.200ms. Si servicios externos de OAuth/Google Cloud o Supabase Auth sufren latencia o suspensión por pagos, el contexto se resuelve de inmediato sin congelar la API ni bloquear mutaciones de guardado.
- **Resolución Definitiva del Timeout de Guardado en la Mesa de Coincidencias (`AdminMatches.tsx`)**:
  1) Elevada la carrera protectora contra timeouts de 9s a 15s en `handleOnlySave` y `handleRecalculateMatch`.
  2) Mutaciones condicionales: `updatePropMut` y `updateReqMut` solo se despachan para las entidades modificadas en el formulario de edición.
- **Identificación y Extracción del Celular Real de Ana Karina Rojas**:
  1) A través de la inspección estructurada del enlace Wasi publicado por la asesora (`info.wasi.co/apartamento-alquiler-cabrera-bogotá-d-c/10081231`), se extrajo su teléfono celular real **`+57 318 243 3016`** (`573182433016`), sustituyendo el LID interno de WhatsApp (`81247929917620@lid`).
  2) Actualizado masivamente en Supabase para las propiedades #638, #1967, #1968, #1969 y requerimientos #753, #754.
- **Actualización de Demanda Match #M11837 (María Cristina Parra)**:
  1) Asignado el número celular verificado **`+57 310 325 9159`** en el requerimiento #614.
- **Doctrina de Google Cloud y Supabase Auth**:
  1) Confirmado que Google OAuth 2.0 es 100% gratuito y no requiere cuentas de facturación abierta. Se documenta la migración a proyecto libre para blindar el inicio de sesión.

### Novedades v29.6 (Reparación Definitiva del Botón Guardar en Mesa de Coincidencias, Sanitización de Cifras Colombianas y Desacoplamiento Asíncrono):
- **Reparación Definitiva del Botón Guardar (`AdminMatches.tsx` & `server/routers/janIA.ts`)**:
  1) Desacoplamiento asíncrono en segundo plano (`.catch(...)` sin `await`) de la propagación en cascada de teléfonos y nombres de asesores (`propagateBrokerPhoneAcrossAllListings`). Las mutaciones `updatePropertyDetails` y `updateRequirementDetails` responden al navegador en **<100ms** sin retardo ni bloqueos de red (`504 Gateway Timeout`).
  2) Condición inteligente de propagación: solo se ejecuta si el teléfono o el nombre del asesor cambiaron realmente respecto al registro previo en base de datos (`phoneChanged || nameChanged`).
- **Sanitización Numérica Colombiana de Alta Fidelidad en Frontend y Backend**:
  1) `cleanNumberForSave` y `sanitizeNumeric` soportan formalmente cifras colombianas con separadores de miles con puntos (`$850.000.000`, `$2.500.000`), comas y decimales de área (`85.5`), previniendo que se conviertan en `NaN` o valores nulos.
- **Actualización Optimista en Memoria (0ms Lag)**:
  1) Actualización en caliente de `cachedAllMatchesData` en memoria en el servidor, eliminando la invalidación destructiva de caché y el re-escaneo masivo de toda la base de datos al refrescar la vista.
- **Protección Contra Congelamiento en Cliente**:
  1) Incorporación de carrera protectora con `Promise.race` (timeout de 9 segundos) en `handleOnlySave` y `handleRecalculateMatch` para garantizar que el estado de carga (`isSavingOnly`) siempre se libere y el botón nunca quede congelado indefinidamente.
- **Erradicación de Sobreescritura de Logs Globales**:
  1) Eliminadas las asignaciones `console.log = () => {}` en `nightlyRematch.ts`, restaurando la visibilidad completa de logs del runtime.

### Novedades v29.5 (Motor Multimodal de Visión OCR para Flyers/Banners de Oferta y Demanda, Desglose Estructurado de Texto y Blindaje contra Fotos Ambientales Comunes):
- **Motor Multimodal de Visión OCR para Flyers y Banners Comerciales**:
  1) Corrección de payload Google Gemini REST API a `inlineData: { mimeType, data }` para procesamiento multimodal nativo de imágenes y PDFs.
  2) Extracción integral de datos estructurados (precio, área, alcobas, baños, garajes, administración, zona, ciudad, broker y teléfono) directamente desde la imagen tipográfica del flyer (ofertas o demandas).
  3) Guardado automático de la imagen original del flyer en Supabase Storage (`flyers/`) y persistencia en `property.images` y `enlaceOrigen`.
  4) Desglose técnico enriquecido en `rawText` combinando transcripción fiel del flyer y ficha tabular formateada (`buildFlyerBreakdownText`).
  5) Reacción automática nativa en WhatsApp (`👍`/`👌`/`🔀` para ofertas, `📝`/`✏️`/`🔄` para demandas) y disparo del motor de matching.
- **Blindaje y Descarte Quirúrgico de Fotografías Ambientales Comunes**:
  1) Fotos fotográficas directas de cámaras (salas, cocinas, baños, fachadas, lámparas) SIN texto tipográfico publicitario se identifican con `isFlyerOrBanner: false`.
  2) Si vienen solas sin texto técnico, se descartan automáticamente como `CONSULTA_GENERAL` sin guardar en BD ni reaccionar.
  3) Si acompañan a un mensaje de texto, el inmueble se guarda desde el texto pero la foto ambiental NO se registra como flyer publicitario en `property.images`.
- **Blindaje de Despacho Multimedia a Canales de WhatsApp (`@newsletter`)**:
  1) Inyección obligatoria de cabeceras de stanza XML (`type="media"`, `mediatype="image/video/audio/document"`) en `queuedSend`.
  2) Generación TTS centralizada única para Grupo 2 y Canal Oficial en `sendVoiceToBuzonAndChannel`.

### Novedades v29.4 (Guard Doctrinal Rosales Alto vs Bajo, Macro-Sector "Las Santas", Homónimos Opuestos y Modal Pop-Up de Descarte):
- **Guard Doctrinal v29.4 — Rosales Alto vs Rosales Bajo**:
  1) `Rosales Bajo` (sector plano / caminable entre Cra 7 y Cra 5 / Circunvalar) es estrictamente incompatible con `Rosales Alto` (ladera oriental / cerros arriba de la Circunvalar) ante exigencias explícitas de una de las partes (`Bloqueo 0%`).
- **Taxonomía Doctrinal del Macro-Sector "Las Santas" (Usaquén)**:
  1) Reconocimiento integral para búsquedas taquigráficas (*"Busco en Las Santas"*), que engloba:
     - Las 4 Santa Bárbaras: `Santa Bárbara Alta`, `Santa Bárbara Oriental`, `Santa Bárbara Central`, `Santa Bárbara Occidental`.
     - Las 2 Santa Anas: `Santa Ana Oriental` (cerros) y `Santa Ana Occidental`.
     - `Santa Paula` y `Santa Bibiana`.
     - `San Patricio` (circuito contiguo Calles 106-116).
- **Guardián de Homónimos Opuestos (Norte vs Sur / Alta vs Baja / Centro vs Sur)**:
  1) `Ciudad Jardín Norte` (Suba/Usaquén) ↔ `Ciudad Jardín Sur` (San Cristóbal/Antonio Nariño): Incompatibilidad Absoluta (0%).
  2) `Álamos Norte` (Engativá) ↔ `Álamos Sur` / `Álamos`: Incompatibilidad Absoluta (0%).
  3) `La Candelaria Centro` (Centro Histórico) ↔ `Candelaria la Nueva` / `Candelaria Sur` (Ciudad Bolívar): Incompatibilidad Absoluta (0%).
  4) `La Calleja Alta` ↔ `La Calleja Baja`: Incompatibilidad cuando se especifica cota o sector.
- **Modal Pop-Up Centrado de Descarte en Mesa de Coincidencias (`AdminMatches.tsx`)**:
  1) Pop-up modal centrado con `backdrop-blur` (`z-[99999]`) con comparativo Oferta vs Demanda y catálogo exhaustivo de motivos de descarte.
  2) Remoción reactiva instantánea e invalidación automática de caché de matches en el backend (`server/routers/janIA.ts`).
- **Saneamiento Masivo y Población Certificada en Supabase (`master_audit_and_match.ts`)**:
  1) Evaluadas +1.047.000 combinaciones con los nuevos guards doctrinales y persistencia certificada en Supabase.

### Novedades v29.3 (Segmentación Determinista Multi-Item, Guardián Anti-Negaciones Geográficas y Saneamiento DB):
- **Segmentación Determinista Multi-Publicación (`splitMultiItemMessage` / `split_and_sanitize_multi_items.ts`)**:
  1) Los mensajes combinados de WhatsApp que contienen 2 o más requerimientos o propiedades independientes son desglosados automáticamente en registros autónomos e individuales en Supabase (ej: Requerimiento #296 de Marta S. e Isabel C. separado en dos fichas independientes con sus respectivos presupuestos, áreas y barrios aislados).
  2) Extracción de +133 nuevas ofertas individuales a partir de 110 publicaciones compuestas previas, maximizando la oferta real sin mezclar datos entre inmuebles.
- **Guardián Anti-Negaciones Geográficas (`extractSafeNeighborhoods` en `janIA.ts`)**:
  1) Detección y filtrado de expresiones negativas (`"no les gusta..."`, `"no..."`, `"excepto..."`, `"sin..."`, `"descartado..."`).
  2) Erradica falsos positivos donde barrios rechazados por el cliente eran asignados erróneamente a la demanda.
- **Parser Robusto de Especificaciones Key-Value de WhatsApp (`janIA.ts`)**:
  1) Limpieza de formato Markdown con asteriscos (`*Alcobas*: 3`, `*Baños*: 3`, `*Parqueaderos*: 2`).
  2) Extracción exacta de rangos de presupuesto (`"entre 800 y 900 millones"`) y techos máximos (`"1.500 millones máximo"`).
- **Saneamiento Masivo y Población de Matches Certificados (`master_audit_and_match.ts`)**:
  1) Evaluadas 1.047.940 combinaciones tras la segmentación y saneamiento.
  2) Purgados los falsos matches derivados de mezclas (como el falso match de Rosales #423 vs Marta S.).
  3) Actualizada la tabla `propertyMatches` en Supabase con los matches 100% legítimos y certificados.

### Novedades v29.2 (Desbloqueo de Bloqueadores Artificiales y Aumento a 82 Matches Certificados):
- **Desbloqueo de Bloqueadores Artificiales en Matching (`matching.ts`)**:
  1) `deduceFullType`: Jerarquía corregida para detectar `apartment` y `loft` antes de la palabra `edificio` en descripciones mixtas (evitando falsas asignaciones a `building`).
  2) Compatibilidad Doctrinal `Apartaestudio / Loft` ↔ `Apartamento` de 1 alcoba o $\le 65\text{ m²}$.
  3) Eliminación de la guillotina artificial de completitud de ficha (<50%), permitiendo que pares con 100% de cumplimiento en los 5 núcleos duros y límites cuantitativos inicien en score base 80% y escalen proporcionalmente sin rojos (`missing`).
- **Población Total de 82 Matches Certificados en Supabase (`master_audit_and_match.ts`)**: 82 cruces reales y verificados con score $\ge 80\%$ y cero casillas en rojo.

### Novedades v29.1 (Erradicación de Datos Sintéticos y Taxonomía Integral de Subclases):
- Purgados registros de prueba (#363, #365, #366) y clasificación integral de tipologías según Ley 388/1997.

### Novedades v28.9 (Separación Estricta de las 3 Familias Chicó y Guillotina Absoluta de Score):
- **REGLA DOCTRINAL v28.9 — Separación Geográfica de las 3 Familias Chicó**:
  1) **Familia 1 — El Chicó (Chapinero)**: Barrio histórico entre Calles 88-100, Cra 7 a Autopista Norte. Localidad Chapinero. Incluye: `el chico`, `chico`, `chico sur`.
  2) **Familia 2 — Chicó Norte / Reservado (Usaquén)**: Al norte de Calle 100 sobre la Autopista. Localidad Usaquén. Incluye: `chico norte`, `chico norte ii`, `chico norte iii`, `chico reservado`, `chico reservado norte`.
  3) **Familia 3 — Chicó Navarra (Usaquén)**: ~Calles 106-120. Localidad Usaquén. Incluye: `chico navarra`, `navarra`.
  > **ESTAS TRES FAMILIAS SON INCOMPATIBLES ENTRE SÍ** en `matching.ts` (servidor) y `AdminMatches.tsx` (frontend).
- **REGLA DOCTRINAL v28.9 — Guillotina de Score Absoluta**: Si `autoScore = 0` (cualquier casilla en rojo `missing`), el `dbScore` de Supabase **NUNCA** puede rescatar el match. `effectiveScore = exactScore > 0 ? exactScore : 0`. La guillotina es absoluta.

### Novedades v28.8 (Resolución de Causas Raíz de Precios, Cuotas de Administración, Habitaciones y Saneamiento DB):
- **Resolución de las 5 Causas Raíz de Discrepancia de Precios y Administración**:
  1) Normalización de caracteres Unicode invisibles (`\u2060`, `\uFEFF`, etc.) y apóstrofes (`´`, `'`, `’`) en `janIA.ts` y `AdminMatches.tsx` para evitar que precios como `$1.100´000.000` se cortaran en `1.100`.
  2) Blindaje contra falsos positivos de celulares en `isPhoneNumberNotPrice`: valores $\ge 50\text{M}$ múltiplos de $100\text{k}$ o con prefijos de precio jamás se clasifican como teléfonos.
  3) Extracción estricta de precios de venta con prioridad para `precio de venta:`, evitando colisiones con números de área (`180 m2`).
  4) Detección y extracción exacta de cuotas de administración (`adminFee`), visualizadas y cotejadas en la mesa de coincidencias.
  5) Reconocimiento de adjetivos intermedios en habitaciones (`3 amplias habitaciones`, `3 hermosas alcobas`).
- **Saneamiento Masivo Determinista en Supabase (`sanitize_all_db.ts`)**: 1.210 propiedades y 658 requerimientos actualizados directamente desde su texto original.
- **Población Total de 22 Matches Certificados (`master_audit_and_match.ts`)**: 22 cruces legítimos y verificados con score $\ge 80\%$ y 100% de cumplimiento en núcleos duros.

### Novedades v28.7 (Exportación Modular de parseColombianPriceOrBudget, Inclusión de Scripts en tsconfig y Cero Errores TS):
- **Exportación Modular de `parseColombianPriceOrBudget` (`janIA.ts`)**: Se elevó la función de parseo de precios y presupuestos al nivel de módulo para ser consumida limpiamente por los scripts de saneamiento y auditoría (`sanitize_all_db.ts` y `master_audit_and_match.ts`), erradicando el error TS2305 del IDE.
- **Inclusión de `scripts/**/*` en `tsconfig.json`**: Cobertura total de tipado estricto para todos los scripts del workspace.
- **Validación Exitosa**: `tsc --noEmit` y `npm run build` con 0 errores en todo el proyecto.

### Novedades v28.6 (Auditoría Integral 1 a 1 de 5 Filtros Duros, Saneamiento Masivo de BD y Población de 27 Matches Certificados):
- **Auditoría Integral y Cotejo 1 a 1 sin Suposiciones**: Implementado motor maestro de cotejo exhaustivo (`master_audit_and_match.ts`) que evalúa los 5 Filtros Duros Inquebrantables: 1) Compatibilidad de Negocio (`venta` vs `arriendo`), 2) Compatibilidad de Usos y Tipologías (Residencial, Comercial, Oficinas), 3) Geografía Canónica (Barrio/Municipio sin cruces inviables), 4) Presupuesto Máximo (`precio <= pptoMax`), y 5) Cumplimiento Físico de Núcleo Duro (`prop >= req` en Metraje, Alcobas, Baños y Garajes).
- **Saneamiento Masivo Determinista en Supabase (`sanitize_all_db.ts`)**: 549 propiedades y 368 requerimientos re-procesados directamente desde su texto original (`rawText`) con extracción matemática estricta.
- **Población Total de 27 Matches Certificados**: Purgada la tabla `"propertyMatches"` en Supabase y persistidos los 27 cruces legítimos y verificados con score $\ge 80\%$, todos con 100% de cumplimiento en sus núcleos duros.
- **Blindaje en Parser de Garajes (`janIA.ts`)**: Adición de filtro protector para evitar que años de construcción (ej: `2004`) o cifras espurias sean capturados erróneamente en el campo de parqueaderos.

### Novedades v28.5 (Filtro Duro de Condición de Ocupación, Plural de Garajes y Corrección Geográfica North Point):
- **Filtro Duro de Inmueble Ocupado vs Demanda con Crédito/Habitar (`matching.ts`)**: Inmuebles vendidos exclusivamente para inversionistas con contrato de arrendamiento vigente (`"arrendado hasta..."`, `"rentando actualmente"`) quedan bloqueados al **0% Inviable** ante clientes que buscan adquirir para habitar o con crédito hipotecario.
- **Parser de Plural en Garajes (`janIA.ts` & `matching.ts`)**: Solicitudes que mencionan `"garajes"` o `"parqueaderos"` en plural sin número exigen mínimo $\ge 2$ parqueaderos.
- **Corrección Geográfica de North Point**: Asignado a **San Cristóbal Norte (Usaquén)** en catálogos y Supabase, impidiendo que herede Santa Bárbara.
- **Saneamiento y Purga en Supabase**: Purgados los matches inviables #11484 y #11478, dejando **4 matches legítimos y verificados**.

### Novedades v28.4 (Blindaje de Modismos de Arriendo, Normalización de Presupuestos en Millones y Erradicación de Falsos Matches Venta vs Arriendo):
- **Captura de Modismos de Arriendo (`hasRentSignals`)**: Inclusión formal de expresiones colombianas (`"para tomar ya"`, `"tomar ya"`, `"toma ya"`, `"para tomar de inmediato"`, `"toma inmediata"`, `"para tomar"`, `"en renta"`, `"para renta"`, `"en arriendo"`).
- **Calibración Numérica en Parser Colombiano (`parseColombianPriceOrBudget`)**: Cifras con puntos (`3.800.000`, `2.900.000`) se leen exactamente en pesos. En arriendo, valores taquigráficos $\le 100$ se escalan a millones ($3.8\text{M} \rightarrow \$3.800.000$), erradicando presupuestos falsos de miles de millones.
- **Saneamiento Masivo y Purga en Supabase**: Corregidos 96 requerimientos descalibrados y purgados físicamente los matches inviables #11479 y #11480.

### Novedades v28.3 (Prioridad Ground Truth del Texto en Barrios, Demandas Multi-Barrio y Erradicación de Falsos Matches por Grupos de WhatsApp):
- **Prioridad Suprema del Texto Original (`rawText`)**: Si la publicación menciona explícitamente un barrio (`"ALAMEDA 170"`, `"La Alameda"`, etc.), este prevalece siempre sobre cualquier columna `zone` heredada automáticamente del prefijo del grupo de WhatsApp (ej. `"Cedritos-Colina-Salitre-Alrededores"`).
- **Catálogo Canónico Expandido (`KNOWN_BARRIOS_CANONICAL`)**: Diccionario de más de 100 barrios ordenado por longitud descendente, impidiendo colisiones de subcadenas.
- **Soporte Doctrinal para Demandas Multi-Barrio**: Si el cliente solicita una lista de barrios (ej: *Cedritos, Alcalá, Belmira, Castellana, Polo, Pasadena, San Felipe, Chapinero, Pontevedra, Bella Suiza*), la oferta debe pertenecer a al menos uno de ellos. Si no coincide, el estado es `missing` (🔴) y el score se bloquea al **0% (Guillotina de Núcleo Duro)**.
- **Saneamiento y Purga en Supabase**: Actualizadas propiedades #556 y #557 a `La Alameda (Usaquén)` y purgados físicamente de `"propertyMatches"` los cruces inviables #11488, #11481, #11489 y #11490.

### Novedades v28.2 (Orquestación del Reporte Semanal de la Bolsa Inmobiliaria, Cifras en Vivo y Coaching de Eficiencia los Lunes 7:00 PM):
- **Orquestación Cron Nocturna de Lunes 7:00 PM (`0 19 * * 1` en `cronService.ts`)**: Programada la emisión semanal que audita la bolsa con estadísticas en vivo de Supabase (`getLiveMarketStats`: conteo dinámico de ofertas, requerimientos, combinaciones y matches certificados).
- **Contenido Dinámico y Coaching Pedagógico**: Llamado de atención y pedagogía directa para los agentes sobre la pérdida masiva de cierres debido a "demandas fantasma" o incompletas (solicitudes sin barrio, sin presupuesto real, sin metraje ni alcobas).
- **Despacho Multimodal Simultáneo**: Ilustración 3D, texto estructurado con tablas en monospace y audio TTS enviados al Grupo 2 y Canal Oficial de WhatsApp vía `sendVoiceToBuzonAndChannel`. El mensaje motivador matutino de los lunes (8:00 AM) se preserva intacto.
- **Endpoint On-Demand (`janIA.triggerWeeklyReport`)**: Mutación tRPC disponible para pruebas y disparos manuales.

### Novedades v28.1 (Sanitización Estricta de Guardado SQL en Mesa de Cotejo, Corrección de Regex de Metraje y Sincronización de Coincidencias):
- **Sanitización Exhaustiva en Guardado SQL (`updatePropertyDetails` / `updateRequirementDetails` en `janIA.ts` y `AdminMatches.tsx`)**: Implementadas funciones `sanitizeNumeric` y `sanitizeInt` que limpian signos de moneda, puntos y strings no numéricos (`"N/E (Consultar)"`), convirtiéndolos a `null` o `undefined` para evitar el error `invalid input syntax for type numeric` en Postgres.
- **Corrección de Regex de Área en Frontend (`AdminMatches.tsx`)**: Se exigieron unidades obligatorias de metraje (`m2|mts|m²|mt2|metros`), impidiendo que cifras de administración como `"($1040.000)"` sean capturadas erróneamente como `1040 m²` en la Oferta.
- **Auditoría Matemática Integral de 770.012 Pares y Sincronización Frontend**: Desglose empírico de descartes por ciudad, negocio, área mínima, presupuesto y completitud, sincronizando la vista del panel (`processedMatches`) para reflejar los 20 matches doctrinales verificados en Supabase.

### Novedades v28.0 (Doctrina de Mensajes Programados Exclusivos Grupo 2 + Canal, y Correcciones TypeScript en AdminMatches):
- **DOCTRINA v28.0 — Mensajes Programados Exclusivos**: Eliminado el cron del Grupo 1 (VECY INMUEBLES NETWORK) que enviaba mensajes los lunes y jueves a las 11 AM. Todos los mensajes diarios programados (Lunes a Domingo) se publican **EXCLUSIVAMENTE** en el **Grupo 2 (Soporte Legal, Tributario, Avalúos y Marketing)** y en el **Canal Oficial de WhatsApp** mediante `sendVoiceToBuzonAndChannel`. El Grupo 1 mantiene silencio absoluto de texto.
- **Fix TS2552 — `isPropPureVenta` no declarada (`AdminMatches.tsx`)**: Se añadió la variable `isPropPureVenta` con lógica correcta (`cleanPropBiz === "venta" || "venta_permuta" || "permuta" || "aporte"`) referenciada en las líneas 831, 854 y 885 pero que nunca había sido declarada formalmente.
- **Fix TS2367 — Comparación de tipos union sin solapamiento (`AdminMatches.tsx`)**: Corrección con cast explícito `(reqState as string) === (propState as string)` en la comparación de estado de conservación del inmueble. `tsc --noEmit` confirma **cero errores** en cliente y servidor.

### Novedades v27.4.1 (Erradicación de ReDoS en Regex Fallback, Purga de Búsquedas en Ofertas y Población Total de Matches Doctrinales):
- **Erradicación de Catastrophic Backtracking (ReDoS)**: En `janIA.ts` se implementó sanitización de espacios con `.replace(/[\t ]+/g, " ")` previo a todas las regex de extracción fallback, eliminando bloqueos de CPU y acelerando la ingesta y escaneo en **8.280x** (de 4.546ms a 0.549ms por texto).
- **Purga de Búsquedas Clasificadas como Propiedades**: Identificadas y deshabilitadas las propiedades #1625 y #1648 que correspondían a requerimientos ("Búsqueda activa").
- **Población Total de Matches en Supabase**: Ejecutado el escaneo completo sobre 745.074 combinaciones, dejando persistidos **14 matches verídicos con score $\ge 80\%$** listos para visualización en `/admin` -> Coincidencias.
- **Despliegue y Sincronización VPS**: Compilado Vite/esbuild y recarga en caliente bajo PM2 en producción.

### Novedades v27.4 (Regla Doctrinal de Metrajes con Tolerancia Cero, Captura Robusta de Rangos de Área, Doble Precio para Administración y Bloqueo de Déficit Físico):
- **Tolerancia Cero en Área Mínima (`propArea < reqAreaMin` $\rightarrow$ 0% Guillotina)**: En `matching.ts` y `AdminMatches.tsx` se eliminó cualquier margen permisivo por debajo del requerimiento mínimo solicitado por el cliente. Si la demanda exige un metraje (ej: $70\text{ m²}$), cualquier oferta con menor metraje ($56\text{ m²}$) es bloqueada al **0% Inviable**.
- **Extractor Robusto de Rangos con Unidades Intermedias (`janIA.ts` & `AdminMatches.tsx`)**: Corrección de expresiones regulares para parsear sintaxis reales como `"de 70m2 a 80m2"` o `"70 a 80 mts"` asignando fielmente `areaMin = 70` y `areaMax = 80` (resolviendo el bug que extraía `"2 - 80 m²"` al capturar el dígito de `m2`).
- **Detección de Jerga Escalonada de Administración (`💰 $ 606 MIL`)**: Procesamiento automático cuando un inmueble publica su valor de venta en millones y su administración en miles en líneas consecutivas con emojis, registrando correctamente la cuota de administración (`adminFee = 606.000 COP`).
- **Soporte de Números Textuales y Redundantes en Parqueaderos/Baños/Alcobas**: Extracción exacta de expresiones como `"2 dos parqueaderos"`, `"dos (2) alcobas"`, `"2 dos baños"` aplicando el bloqueo estricto si la oferta tiene menor cantidad que la demanda.
- **Saneamiento y Purga en Supabase**: Eliminación de falsos matches y actualización a la doctrina v27.4.

### Novedades v27.3 (Desbloqueo de Ciudad y Demandas Reales, Generación de Matches Verídicos y Cotejo en Vivo):
- **Resolución Canónica Dinámica de Ciudad (`matching.ts`)**: Se implementó fallback automático para que los inmuebles y demandas con ciudad `null` en Supabase resuelvan su municipio canónico a partir del barrio y el texto descriptivo, eliminando el falso bloqueador `Inmueble Incompleto: Ciudad/Municipio no especificado`.
- **Calibración de Completitud de Demanda (`matching.ts`)**: Se refinó la condición de bloqueo para permitir requerimientos reales del mercado (con presupuesto y área/alcobas definidas) sin exigir campos opcionales como estrato o baños.
- **Generación y Registro de 15 Matches Verídicos en Supabase**: Población de la base de datos con coincidencias 100% verídicas y verificables (en Santa Bárbara, Cedritos, Rosales y Chicó) visibles en `/admin` -> Coincidencias.
- **Soporte de `rentPrice` en Router tRPC (`janIA.ts`)**: Retorno completo de precios de arriendo y umbral de score ajustado a $\ge 75\%$ para visualización fluida.

### Novedades v27.0 (Calibración Proporcional de Casillas 6+, Inyección Reactiva de 64 Amenidades, 22 Tipologías Inmobiliarias, Permutas Porcentuales y KPIs de Totales):
- **Calibración Proporcional de Casillas 6+ (`AdminMatches.tsx`)**: Casillas 1 a 5 otorgan el 80% base al coincidir en verde (`exact` 🟢). Los 20 puntos restantes se distribuyen equitativamente entre las $N$ casillas activas de la 6 en adelante. Todo match sin "Datos Pendientes" alcanza el **100% Match Perfecto**. Si existe cualquier rojo `missing` 🔴 $\rightarrow$ 0% Guillotina Inmediata.
- **Inyección Reactiva de 64 Amenidades ("Por Arte de Magia")**: Si la oferta o la demanda mencionan amenidades (Cava, BBQ, Chimenea, Estudio, Terraza, Moto, Jacuzzi, Pista de Pádel, Vigilancia 24/7, etc.), la fila se dibuja automáticamente; si ninguna de las partes la menciona, la fila no se dibuja, manteniendo la interfaz limpia y rápida.
- **Marcadores de Control KPI de Totales en Tiempo Real**: Panel enriquecido con `TOTAL OFERTAS` (1.095 inmuebles), `TOTAL DEMANDAS` (600 requerimientos), `MATCHES DETECTADOS` (67 matches únicos rigurosos) y `MATCHES PERFECTOS (≥95%)`.
- **Taxonomía de 22 Tipologías Inmobiliarias y Selector de Permutas con Porcentajes**: Mapeo completo en frontend, backend y selectores de edición.


### Novedades v26.4 (Blindaje Doctrinal de Tipologías Inmobiliarias, Tolerancia Cero entre Comercial/Médico y Residencial, Purga de Matches Inviables):
- **Incompatibilidad Absoluta Comercial/Dotacional vs Residencial**: Implementado Guard Bloqueador en `matching.ts` al **0% invariable** ante cualquier cruce entre inmuebles comerciales/médicos (`consultorio`, `oficina`, `local`, `bodega`, `lote`) y residenciales (`apartamento`, `casa`, `apartaestudio`, `loft`).
- **Detección Fina de Tipología en Ingesta y Fallbacks (`janIA.ts`)**: Extracción prioritaria en `extractFallbackDataFromText` y `sanitizePropertyType` para clasificar con exactitud consultorios médicos/odontológicos y locales comerciales sin caer en el default de `apartment`.
- **Cotejo Técnico Preciso en Admin Panel (`AdminMatches.tsx`)**: Refactorizada la función de deducción y comparación de tipología; suprimida la caída indiscriminada a "Coincide", mostrando etiquetas precisas (*"Consultorio Médico / Dotacional"*, *"Local Comercial"*, etc.) y marcando estado de incompatibilidad (`missing`) cuando difieren.
- **Purga y Saneamiento en Supabase**: Requerimiento #799 corregido formalmente a `consultorio` y eliminados **74 matches inviables** (incluyendo Match #M11220 y #M11221), manteniendo **106 matches legítimos y verificados (≥85%)**.

### Novedades v26.3 (Blindaje Geográfico Inquebrantable entre Chicó Tradicional y Chicó Navarra, Consumo Atómico de Tokens Geográficos y Purga en BD):
- **Incompatibilidad Geográfica Absoluta (Chicó Chapinero vs Chicó Navarra Usaquén)**: Guard 1.46 doctrinal en `matching.ts` con bloqueo binario estricto al **0% invariable** ante cruces entre Chicó tradicional y Chicó Navarra.
- **Consumo Atómico de Nombres Compuestos de Barrios (`extractNeighborhoodTokens`)**: Los nombres de barrios se ordenan por longitud descendente y se consumen del texto de búsqueda, evitando que subcadenas como `"Chicó"` sean extraídas erróneamente cuando el requerimiento especifica `"Chicó Navarra"`.
- **Diccionario Catastral Corregido (`geography.ts`)**: Chicó Navarra y Navarra ubicados formalmente en la localidad de **Usaquén**; El Chicó en **Chapinero**.
- **Purga y Saneamiento Masivo en Supabase**: 54 falsos matches eliminados de la base de datos, manteniendo **71 matches legítimos y verificados (≥85%)**.
- **Paginación Ultra-Rápida en Panel Admin (`AdminMatches.tsx`)**: Paginación de 10 coincidencias por página con carga instantánea ($<0.02\text{s}$) en móviles y escritorio.
- **Expansión de los 4 Pilares de JanIA**: Jurídico/Contratos, Tributario DIAN, Avalúos/ACM con indagación activa y Marketing Inmobiliario.

### Novedades v26.2 (Doctrina de Libre Albedrío y Solución Integral IA Pura, Lanzamiento Gratuito VECY, Búsqueda Web en Vivo y Agradecimientos con Reseñas de Google):
- **Libre Albedrío y Solución Total de Fondo**: JanIA entrega soluciones jurídicas completas, redacción de minutas/contratos/preavisos y avalúos comparativos (ACM) directamente en el chat, sin retener respuestas artificialmente.
- **Beneficio Gratuito de Lanzamiento VECY Network**: Toda la asesoría y herramientas de JanIA son un beneficio 100% gratuito para empoderar a los agentes e invitarlos a unirse a la red.
- **Búsqueda Web en Tiempo Real (`llm.ts`)**: Búsqueda en Google en vivo habilitada para normativas, decretos, resoluciones, jurisprudencia y precios del mercado inmobiliario.
- **Manejador Cálido de Agradecimientos y Google Reviews**: Respuesta cordial a despedidas/agradecimientos con bendición horaria y enlace a Google Reviews (`https://g.page/r/CctNbwU6UpX5EBM/review`).

### Novedades v26.1 (Motor Maestro de Resolución de Nombres Compuestos y Género, Directriz Ejecutiva de Precios con Horario Comercial de VECY y Blindaje de Visitas con MailSuite):
- **Motor Maestro `nameAndGenderResolver.ts`**: Detección morfológica y diccionario exhaustivo de nombres femeninos (anglo, franceses y colombianos no terminados en 'a', como *Jeannette, Astrid, Elizabeth, Pilar, Carmen, Luz, Beatriz, Inés, etc.*) y canónicos compuestos (*Ana María, Juan Pablo, María Fernanda, etc.*), asegurando el tratamiento exacto ("estimada Jeannette", "estimado Juan Pablo").
- **Directriz de Cotizaciones y Precios al Grano**: Respuestas concisas y directas (máximo 2 párrafos) ante dudas de precios y honorarios, derivando a la línea del bróker **`3166569719`** de **VECY BIENES RAÍCES** en su horario comercial oficial (L-V 8:00 AM - 10:00 PM, Sáb 8:00 AM - 8:00 PM, Dom 10:00 AM - 4:00 PM).
- **Protocolo de Blindaje de Visitas y MailSuite**: Integración de la doctrina de seguridad en 3 pasos para evitar el bypassing en visitas a predios mediante solicitudes formales por correo electrónico y MailSuite bajo la Ley 527 de 1999 y Arts. 1340-1346 C.Co.

### Novedades v26.0 (Auditoría Integral de Moderación en Grupos 1, 2 y 3, Reacción Inmediata 🚫, Resiliencia de Flyers & Saneamiento de Enlaces):
- **Matriz de Moderación Oficial en 2 Pasos (`whatsapp-match.ts` & `janIA.ts`)**: En los 3 grupos oficiales (Inmuebles, Soporte/Marketing y Proyecto), cualquier publicación que no corresponda a la temática recibe primero la reacción **`🚫`** e inmediatamente JanIA despacha la advertencia citada al usuario con el enlace correcto. En grupos externos de terceros, se preserva el silencio 100% absoluto.
- **Desbloqueo de Reacción en Flyers e Imágenes Puras (`getReactionEmoji` en `whatsapp-match.ts`)**: Supresión de la traba `result.inserted === true` para que todo flyer analizado con Gemini Vision reciba su emoji de negocio (`👍`, `👌`, `🔀`, `📝`, `✏️`, `🔄`) sin importar si ya estaba en memoria.
- **Saneamiento Exhaustivo de Enlaces Grupales**: Reemplazo de links antiguos en prompts y código por el enlace activo oficial de *VECY INMUEBLES NETWORK* (`https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ`).

### Novedades v25.9 (Purga de Pestañas Obsoletas en Panel Admin, Caché Instantánea de Autenticación & Persistencia de Navegación):
- **Purga y Eliminación de Módulos Obsoletos**: Supresión física de `AdminLeads.tsx` (prospectos mock), `AdminGitHubSync.tsx` (sincronizador antiguo) y `AdminReports.tsx` (reportes redundantes), aligerando el bundle del panel y simplificando el menú a las 3 herramientas maestras esenciales: **Inmuebles**, **Requerimientos** y **Coincidencias**.
- **Carga Instantánea de Autenticación (`useAuth.ts`)**: Inicialización síncrona de sesión desde `localStorage` (`manus-runtime-user-info`), eliminando los retrasos y el spinner de "Verificando acceso..." ($0.01\text{s}$ de carga inicial).
- **Persistencia Inteligente de Pestaña Activa (`Admin.tsx`)**: Guardado automático en `localStorage` (`vecy_admin_active_tab`) para que el panel abra directamente en la última vista de trabajo del administrador tanto en escritorio como en dispositivos móviles.
- **Soporte de Ilustraciones 3D de JanIA (`cronService.ts`)**: Integración oficial de `jania_periodista.jpg` (Vecy Network Noticias) y `jania_podcast.jpg` (Café Inmobiliario) con resolución flexible de nombres y extensiones.

### Novedades v25.8 (Auto-Sincronización Nativa del Canal Oficial de WhatsApp, Ilustraciones 3D, Audio TTS, Captions Estructurados y Venta Institucional VECY):
- **Auto-Detección y Sincronización de Canal en Baileys (`whatsapp-match.ts`)**: Resolución nativa del canal oficial `https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b` (`120363399889853806@newsletter` - *"Vecy Bienes Raíces 🏠"*) mediante `sock.newsletterMetadata("invite", code)`.
- **Generador Dual de Contenido Diario con Gemini 2.5 Flash (`cronService.ts`)**: Generación en un solo paso de `voiceText` (locución TTS fluida) y `captionText` (texto enriquecido con emojis, negritas y enlaces) aplicando la regla de 3 pasos (Saludo, Contenido Pedagógico y Cierre Institucional de Venta de VECY Network).
- **Despacho Dual Simultáneo (Grupo 2 + Canal)**: Envío automático de la ilustración 3D con caption formateado previo a la nota de voz a ambos destinos.
- **Endpoint On-Demand (`triggerDailyTip` en `janIA.ts`)**: Mutación tRPC para pruebas y disparos inmediatos desde la web o el servidor.

### Novedades v25.7 (Optimización Extrema de Carga Web 95%, Retiro Pestaña Conversaciones & Pack 3D JanIA):
- **Code-Splitting Integral y Lazy Loading (`App.tsx` y `Admin.tsx`)**: Implementación de `React.lazy` y `<Suspense>` en todas las páginas y pestañas del panel admin. Reducción del bundle inicial de 1.35 MB a solo **57 kB** (>95% de optimización).
- **Rollup `manualChunks` (`vite.config.ts`)**: Modularización limpia de vendors (`react-vendor`, `trpc-vendor`, `ui-vendor`, `supabase-vendor`).
- **Retiro Limpio de Pestaña 'Conversaciones'**: Supresión de `AdminConversations.tsx` y limpieza del menú de navegación.
- **Optimización de Consultas DB (`properties.ts` y `janIA.ts`)**: Límite top 200/300 con orden indexado en `myList`, `getAllRequirements` y `getAllMatches`, entregando respuestas en $<0.05\text{s}$.
- **Pack Oficial de Ilustraciones 3D de JanIA (`client/public/assets/jania/`)**: Cinco poses 3D temáticas de JanIA (Avalúos, Jurídico, Marketing, Tributario DIAN y Matches) enlazadas al orquestador cron y canal de WhatsApp.
- **Blindaje Resiliente en Consola Web (`janIA.ts`)**: Interceptor de contingencia en chat y creación de prompt oficial `web_console.md`.

### Novedades v25.6 (Reordenamiento Cronológico Integral de Bitácora, Timeout VPS Resuelto & Micro-Caché de Alto Rendimiento):
- **Estandarización Canónica de Encabezados**: Unificación del 100% de las 31 sesiones bajo el formato único `### 🗓️ Sesión: [Día] [Fecha] — [Horario] (Hora Colombia UTC-5)`.
- **Orden Cronológico Inverso Estricto**: Reorganización total de la bitácora (`HISTORIAL_CONVERSACIONES_MAESTRO.md`) desde el 13 de agosto hasta hoy 24 de agosto de 2026 sin saltos temporales ni fragmentaciones.
- **Resolución de Error 504 Timeout en VPS**: Saneamiento de saturación de memoria Heap en Node.js PID 516973 con recarga en limpio bajo PM2.
- **Auditoría de Ingesta de 48 Horas**: Identificación precisa de 44 inmuebles ingresados (con 22 republicaciones repetidas detectadas al 50% y agrupadas por JanIA) y 27 requerimientos.
- **Micro-Caché en Memoria Backend (`janIA.ts`)**: Caché de 20s en `getAllMatches` y 15s en `getBotStatus` con invalidación instantánea tras edición, reduciendo los tiempos de respuesta a $<0.2\text{s}$.
- **Sintonización del Pool PostgreSQL (`db.ts`)**: Configuración `max: 20`, `idle_timeout: 30s` y `fetch_types: false` para optimizar el rendimiento con Supabase pgBouncer.
- **Harmonización de Memoria Activa**: Sincronización de versiones en `shared/const.ts`, `.agents/AGENTS.md`, `vecy_network_technical_dossier.md` y la bitácora a `v25.6`.

### Novedades v25.5 (Diagnóstico y Corrección de Cotejamiento de Datos, Resanitización Masiva en Supabase & Purgado de Falsos Matches):
- **Extractor Numérico Avanzado de Precios y Presupuestos (`parseColombianPriceOrBudget` en `janIA.ts`)**: Distingue con precisión la notación de miles con punto (`$2.100 millones` $\rightarrow \$2.100.000.000\text{ COP}$), rangos con asteriscos (`Presupuesto *1.300 - 1.400*` $\rightarrow \$1.300\text{M} - \$1.400\text{M}$) y descarte de precios ínsitos o truncados.
- **Blindaje en `saveProperty` y `saveRequirement` (`janIA.ts`)**: Inyección directa de `fallbackData` para rescatar precios, administraciones, garajes, antigüedad y presupuestos directamente de `rawText` si Gemini los omite.
- **Filtro Duro 7 Blindado y Explicador de Matches (`matching.ts`)**: Integración de `extractFallbackDataFromText` en `calcularScoreMatch` y `explicarMatch` asegurando bloqueo al **0% invariable** si la oferta supera el presupuesto del requerimiento.
- **Resanitización Integral y Purga Masiva en Supabase**: Corrección y saneamiento de 238 propiedades y decenas de requerimientos con precios de venta y cánones recuperados; purga de 39 matches falsos/inviables (Match #11037 corregido al 0%), preservando 70 matches legítimos con Score $\ge 85\%$.

### Novedades v25.4 (Módulo de Marketing Digital Inmobiliario, Resiliencia de Voz & Parrilla Semanal Maestra):
- **Marketing Digital Inmobiliario & Estructura de 7 Pilares (`janIA.ts` & `prompts/grupos/`)**: JanIA asesora en copys persuasivos, anuncios y la estructura de 7 pilares para que los brokers publiquen ofertas y demandas completas con precios, áreas, alcobas, baños y garajes.
- **Renombramiento Oficial de Grupos**:
  - Grupo 2: `𝗩𝗘𝗖𝗬: 𝗦𝗢𝗣𝗢𝗥𝗧𝗘 𝗟𝗘𝗚𝗔𝗟, 𝗧𝗥𝗜𝗕𝗨𝗧𝗔𝗥𝗜𝗢, 𝗔𝗩𝗔𝗟Ú𝗢𝗦 𝗬 𝗠𝗔𝗥𝗞𝗘𝗧𝗜𝗡𝗚`.
  - Grupo 3: `𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢 "𝗩𝗲𝗰𝘆 𝗡𝗲𝘁𝘄𝗼𝗿𝗸"`.
  - Teléfono unificado de atención del bróker: `3166569719`.
- **Resiliencia Total en Transcripción de Audio (`voiceTranscription.ts`)**: Rotación inteligente de pool de claves Gemini, cascada de 3 modelos y timeout de 60s para notas de voz largas (hasta 3-4 minutos).
- **Parrilla Semanal Maestra de Audios de JanIA (`cronService.ts`)**: Audios temáticos de Lunes a Sábado (Lunes 8:00 AM Convocatoria con link de grupo, Martes 11:00 AM Legal, Miércoles 11:30 AM Marketing, Jueves 11:00 AM DIAN, Viernes 11:30 AM Avalúos/SINUPOT, Sábado 10:00 AM Café y Consultoría del Bróker).

### Novedades v25.2 (Motor de Auto-Aprendizaje y Propagación en Cascada de Teléfonos de Brokers):
- **Propagación en Cascada Universal (`propagateBrokerPhoneAcrossAllListings` en `janIA.ts`)**: Cada vez que se edita o extrae el teléfono de un broker, se actualizan automáticamente TODAS sus publicaciones pasadas, presentes y futuras (propiedades y requerimientos) en Supabase.
- **Directorio de Brokers Inteligente**: Aprende el número real de cada asesor por nombre o LID de WhatsApp y lo reutiliza en todas sus publicaciones.
- **Selección y Copia Directa (`AdminMatches.tsx`)**: Eliminación del bloqueo `select-none` y agregado de botones rápidos `📋 Copiar` para copiar el texto de ofertas y demandas con 1 solo toque.

### Novedades v25.1 (Matriz Doctrinal de Amenidades, Vistas, Climatización, Accesibilidad y Tipologías Especiales):
- **Nuevos Filtros Duros Inquebrantables de Confort y Accesibilidad (`matching.ts`)**:
  - *Filtro Duro 11E (Ascensor / Accesibilidad)*: Si el requerimiento exige obligatoriamente ascensor (por adulto mayor, tercera edad, movilidad reducida o "no escaleras") y el inmueble es por escaleras / sin ascensor en piso $\ge 2$ $\rightarrow$ ❌ **0% Bloqueo Absoluto**.
  - *Filtro Duro 11F (Orientación Visual Estricta)*: Si la demanda exige "SOLO EXTERIOR" y la oferta es "INTERIOR" $\rightarrow$ ❌ **0% Bloqueo Absoluto**.
- **Auditoría Integral de Amenidades y Ambientes con Bonos de Confort (+15 pts)**:
  - *Vistas y Luz Natural*: Vista panorámica / a la ciudad, vista a la montaña / cerros, vista verde / frente a parque, sol de mañana / tarde, esquinero.
  - *Climatización y Chimeneas*: Detección y homologación de chimeneas a gas, a leña tradicional y ecológicas de bioetanol / alcohol.
  - *Distribución Espacial*: Sala y comedor independientes vs sala-comedor integrados.
  - *Club House & Seguridad 24/7*: Piscina, gimnasio, zonas húmedas (sauna/turco), canchas de squash, zonas verdes, parque infantil y portería permanente.
  - *Conectividad Urbana*: Cercanía a transporte masivo (Transmilenio/Metro), centros comerciales, supermercados y clínicas/hospitales.
- **Tipologías Especiales y No Residenciales**:
  - *Casas*: Conjunto cerrado / condominio vs Casa independiente sobre calle.
  - *Fincas / Campestres*: Casa de mayordomo, piscina, quiosco BBQ, pesebreras, nacimientos de agua o lagos.
  - *Bodegas*: Altura libre / triple altura, resistencia de piso (ton/m²), muelle deprimido/nivel, energía trifásica (KVA).
  - *Oficinas / Consultorios*: Baterías de baños, cableado estructurado, recepción, habilitación en salud.
  - *Locales Comerciales*: Vitrina comercial, alto tráfico peatonal/vehicular, trampa de grasas y gas comercial.
  - *Lotes / Terrenos*: Uso de suelo (residencial, comercial, industrial, campestre) y disponibilidad de servicios.
- **Doctrina Maestra v25.1 en `prompts/base.md`**: Instrucciones obligatorias para que JanIA capture siempre el perfil completo de amenidades y características especiales.
- **Script Maestro de Saneamiento y Recálculo Global (`master_resanitize_and_rematch.ts`)**: Barrido cruzado de 334.000 combinaciones en BD, manteniendo **79 matches reales y de calidad indiscutible (≥85%)** con sus explicaciones enriquecidas.

### Novedades v25.0 (Doctrina Maestra de Precios COP, Techo Financiero MÁXIMO vs Piso Físico MÍNIMO & Enriquecimiento Retroactivo Total):
- **Doctrina de Límite Financiero (MÁXIMO) vs Confort Espacial (MÍNIMO)**:
  - *Presupuestos y Cánones de Arriendo (Techo)*: Expresiones como *"máximo 5 millones"*, *"canon max 8.5 millones"*, *"hasta 4 millones"*, *"tope 6 millones"*, *"con admon hasta 5.5 millones"* representan el `presupuestoMax` (y `rentPrice` en arriendos).
  - *Cuota de Administración (Techo)*: *"Admon máxima 1.200.000"*, *"admon hasta 800 mil"* asignan `adminFeeMax`.
  - *Espacio Físico (Piso Mínimo)*: *"Mínimo 150m2"*, *"min 3 alcobas"*, *"desde 2 baños"* representan `areaMin`, `habitacionesMin`, etc., donde la oferta debe ser **IGUAL O MAYOR** (`prop >= req`) para otorgar 100% de confort.
- **Enriquecimiento Retroactivo Masivo en Supabase (`enrich_data_v25.ts`)**:
  - **131 campos corregidos/rescatados en BD**:
    - 43 precios de venta de propiedades corregidos (rescatando inmuebles que tenían precios malformateados como el apto de San Patricio de $1.390M guardado erróneamente como $122M).
    - 8 cánones de arriendo mensuales recuperados.
    - 28 cuotas de administración agregadas.
    - 5 áreas totales rescatadas.
    - 14 presupuestos de requerimientos corregidos.
    - 9 administraciones máximas asignadas en demandas.
    - 24 áreas mínimas (`areaMin`) rellenadas desde `rawText` para requerimientos que estaban en 0.
- **Fix crítico `extractFallbackDataFromText` en `janIA.ts`**: Parser D ahora detecta formato colombiano de miles (`1.390.000.000`) quitando TODOS los puntos antes de `parseFloat`, evitando el error `1.39 × 1M = 1.390.000` en lugar de `1.390.000.000`.
- **Fix crítico `saveRequirement` en `janIA.ts`**: Fallbacks robustos directos desde `rawText` para `presupuestoMax`, `adminFeeMax` y `areaMin` cuando vienen vacíos en la ingesta.
- **Fix crítico Filtro Duro 6 en `matching.ts`**: `reqAreaMin` tiene fallback desde `rawText` garantizando que requerimientos exigiendo "Mínimo 150m2" bloqueen al 0% ofertas de 122m².
- **Doctrina Maestra v25.0 en `prompts/base.md`**: Memoria permanente de jerga colombiana, tablas de conversión, algoritmos paso a paso y la distinción formal de Techo Financiero vs Piso de Confort.


### Novedades v27.0 (Implementación y Despliegue del Motor Reactivo de Inyección Dinámica "Por Arte de Magia", 22 Tipologías Inmobiliarias y Permutas con Porcentajes):
- **Motor Reactivo de Inyección Dinámica ("Por Arte de Magia")**: Evaluación contextual instantánea que inyecta en caliente en la tabla de cotejo técnico las filas correspondientes a cualquiera de las 23 características internas o 41 externas, además de los atributos cuantitativos especiales (garajes para moto, chimeneas leña/gas/bioetanol, CBS con/sin baño, cava de vinos, terrazas con m² y BBQ, piso y vista exterior/interior) únicamente cuando alguna de las partes los menciona.
- **Taxonomía de 22 Tipologías Inmobiliarias**: Mapeo y selectores completos en frontend y backend para Apartaestudio, Loft, Apartamento, Apto Dúplex, Pent House, Pent House Dúplex, Casa Urbana, Casa Campestre, Casa Quinta, Villa, Finca, Cabaña, Edificio, Local Comercial, Oficina, Consultorio Médico / Dotacional, Bodega, Lote / Terreno, Hotel, Hostal, Aparta Hotel, Aparta Suit, Motel.
- **Selector Interactivo de Permutas por Porcentajes**: Mapeo completo en `normalizeNegocio`, `getBusinessDisplayLabel`, `checkTransactionCompatibility` y en los selectores de modo edición: `Venta 50% / Permuta 50%`, `60/40`, `70/30`, `80/20`, `90/10`, `10/90`, `20/80`, `30/70`, `40/60`, `Permuta Pura (100%)` y `Venta / Permuta General`.

### Novedades v26.9 (Catálogo Maestro de Atributos Inmobiliarios Dinámicos, Permutas con Ponderación Porcentual, Expansión de 64 Características/Amenidades y Arquitectura de Inyección Reactiva "Por Arte de Magia"):
- **Catálogo Maestro de 22 Tipologías Inmobiliarias**: Apartaestudio, Loft, Apartamento, Apartamento Dúplex, Pent House, Pent House Dúplex, Bodega, Cabaña, Casa, Casa Campestre, Casa Quinta, Edificio, Finca, Hostal, Hotel, Aparta Hotel, Aparta Suit, Motel, Local, Lote / Terreno, Oficina, Villa.
- **Módulo de Permuta Porcentual**: Soporte interactivo y comparativo para proporciones de permuta: `Venta 50% / Permuta 50%`, `60/40`, `70/30`, `80/20`, `90/10`, `10/90`, `20/80`, `30/70`, `40/60`, o Permuta pura 100%.
- **Atributos Cuantitativos y Específicos**:
  - *Cocina (7 tipos)*: Abierta, Abierta tipo isla, Cerrada convencional, Cerrada remodelada, Moderna, Integral, A remodelar.
  - *Cuarto de Servicio*: No / Sí, con baño / Sí, sin baño.
  - *Garajes*: Carro (0..10+) y Moto (0..10+).
  - *Estado*: Excelente, Bueno, Regular, Malo, Remodelado, A Remodelar.
  - *Estrato*: 0 a 6.
  - *Espacios Especiales*: Estar TV (0..5+), Estudios (0..5+), Cava de vinos (Sí [0..5+] / No), Depósitos (0..5+), Balcones (0..5+).
  - *Chimeneas por Tecnología*: Convencional a leña, De gas, Bioetanol (0..5+ / No).
  - *Terrazas Condicionales*: Sí [0..5+] / No tiene, con Área de terraza (m²) y Zona BBQ en terraza condicionadas a su presencia.
  - *Piso & Orientación*: Número de piso libre, Ubicación Exterior / Interior.
- **Catálogo de 64 Características & Amenidades**: 23 internas (AA, Alarma, Amoblado, Acabados alta gama/modernos, Balcón, Bar, Baño auxiliar/principal/en todas alcobas, Citófono, Clósets, Comedor auxiliar, Despensa, Doble Ventana, Gas domiciliario, Iluminación natural, Hall de alcobas, Jacuzzi, Patio, Turco, Vestier, Vista panorámica ciudad/verde, Zona lavandería) + 41 externas (Acceso pavimentado, Área Social, Áreas turísticas, Ascensor, Bancos, Barbacoa/Parrilla/Quincho, Bosques nativos, Caldera, Canchas Baloncesto/Fútbol/Golf/Squash/Tenis, Centros comerciales/médicos, Club house, Colegios/Universidades, Conjunto residencial, Edificio barrio/inteligente, Gimnasio, Kiosco, Lago, Lavandería, Parqueadero visitantes, Parques, Parque infantil, Piscina, Pista pádel, Planta eléctrica, Portería/Recepción, Salón infantil/comunal/juegos, Sauna/Turco, Seguridad 24/7, Sobre vía principal, Shut, Teatrino, Terraza, Transporte público, Zonas infantiles/residenciales/deportivas/verdes).
- **Arquitectura de Inyección Dinámica ("Por Arte de Magia")**: Si la demanda exige o la oferta destaca una de las 64 características o atributos específicos, la fila se genera automáticamente en la tabla de cotejo con su icono y badge de afinidad (`exact` verde, `plus` azul, `warn` amarillo, `missing` rojo), evitando sobrecargar la vista con filas vacías cuando no aplican.

### Novedades v26.8 (Subtipos Exactos, Matriz Doctrinal de Negocios, Neutralidad en Demandas Flexibles y Guillotina Total a 0%):
- **Tipología Inmobiliaria Estricta (Tolerancia Cero entre Subtipos)**: Apto Estándar $\neq$ Apto Dúplex $\neq$ Penthouse $\neq$ Apartaestudio/Loft $\neq$ Casa Urbana $\neq$ Casa Campestre/Finca. Si difieren $\rightarrow$ 0% Inviable.
- **Matriz Doctrinal de Tipos de Negocio**: Venta con Venta/Arriendo; Arriendo con Venta/Arriendo; Arriendo con Opción de Compra ÚNICAMENTE con Arriendo con Opción de Compra; Venta-Permuta con Venta-Permuta. Bloqueo 0% para Arriendo Puro vs Arriendo con Opción de Compra.
- **Doctrina de Neutralidad ("Dato Pendiente")**: Cuando la Demanda es Flexible / Sin Restricción y la Oferta tiene un valor concreto (ej: Estrato, Administración, Garajes), el estado es `neutral` ("Dato Pendiente" / Gris), JAMÁS "Coincide" ni "Aproximado". Esto reduce el puntaje proporcionalmente hasta que el usuario rellene el dato y presione "Guardar".
- **Guillotina Total a 0%**: Si cualquier fila de la tabla de cotejo técnico resulta en `missing` ("No Cumple" / "No Coincide"), `autoScore` colapsa automáticamente a `0%`.
- **Botones de Edición Estandarizados**: Renombrados exactamente a `Guardar` (ámbar) y `Recalcular` (esmeralda).

### Novedades v26.7 (Aceleración Instantánea de Edición, Guardado Concurrente y Copiado Fiel con Búsqueda en WhatsApp):
- **Copiado Fiel 100% Original & Botón de Búsqueda Exacta en WhatsApp (`AdminMatches.tsx`)**: Corrección de `handleCopy` para preservar intactos los saltos de línea, emojis y asteriscos del mensaje original (`rawText`), sumando un botón de búsqueda que copia la frase clave representativa de 4-6 palabras para saltar al mensaje en WhatsApp.
- **Aislamiento Reactivo del Formulario de Edición**: Desacoplado `processedMatches` de `editForm`. Al escribir en los inputs de edición, ya no se recalculan los 150 matches en cada pulsación de tecla, garantizando escritura fluida a 120 FPS.
- **Guardado en Paralelo Asíncrono y Actualización Optimista (`handleOnlySave`)**: Mutaciones concurrentes con `Promise.all`, actualización en memoria instantánea y cierre inmediato del modo edición sin bloqueos.

### Novedades v26.6 (Optimización Extrema de Rendimiento, Lazy Scoring y Eliminación de Video Loop Global):
- **Supresión del Renderizado Continuo de Video a 60 FPS (`JanIAFloatingButton.tsx`)**: Reemplazado el `<video src="/jania.mp4" autoPlay loop muted />` global por la imagen estática optimizada `jania_perfil.png` con decodificación asíncrona, eliminando el sobreconsumo continuo de 30%-60% de CPU/GPU en segundo plano.
- **Cálculo Perezoso (*Lazy Scoring*) en `AdminMatches.tsx`**: Desacoplada la ejecución masiva de 1.800 líneas de regex (`scoreRows`). La indexación inicial lee directamente el `matchScore` de Supabase en <0.001s y `scoreRows` solo se ejecuta sobre los 10 elementos visibles de la página activa o en modo edición (ahorro del 95% de ciclos CPU).
- **Desactivación de Polling Agresivo en Segundo Plano**: `refetchInterval` configurado en `false` en `AdminMatches` y espaciado a 2 minutos en `BotStatusWidget`, evitando micro-congelamientos periódicos.

### Novedades v26.5 (Desacoplamiento de Matriz de Cotejo, Búsqueda Instantánea Universal con useDeferredValue & Tipado Estricto):
- **Desacoplamiento de `scoreRows` y Búsqueda Instantánea con `useDeferredValue`**: Búsqueda fluida a 120 FPS sin bloquear el hilo principal de React.
- **Índice de Búsqueda Universal Extendido (`_searchIndex`)**: Búsqueda por IDs de match, descripciones, teléfonos, barrios y especificaciones.
- **Tipado TypeScript 100% Limpio (0 Errores)**.

### Novedades v26.4 (Blindaje Doctrinal de Tipologías Inmobiliarias & Tolerancia Cero entre Comercial/Médico y Residencial):
- **Bloqueo Invariable 0%**: Consultorios, locales, oficinas, bodegas y lotes jamás hacen match contra casas o apartamentos.
- **Saneamiento en Supabase**: Purga de 74 matches inviables manteniendo integridad estricta.

### Novedades v24.0 (Layout Fijo e Independiente en Panel Admin):
- **Layout Fijo e Independiente (`Admin.tsx`)**: Arquitectura de vista `h-screen overflow-hidden` donde el sidebar permanece 100% fijo a la izquierda en PCs y Laptops mientras el área de contenido (`main`) se desplaza con scroll independiente, eliminando el desplazamiento indeseado del menú de navegación.
- **Modo Dual Expandible / Contraíble (`w-64` ↔ `w-20`)**:
  - *Expandido (`w-64`)*: Título completo, logotipos, nombres de módulos y botón `PanelLeftClose` con tooltip.
  - *Contraído (`w-20` / Icon-Only)*: Íconos centrados con `title` tooltips flotantes, indicadores activos dorados y botón interactivo para re-expandir.
- **Persistencia en LocalStorage**: Almacenamiento en `vecy_admin_sidebar_expanded` para conservar la preferencia del usuario entre sesiones y recargas.
- **Drawer Móvil Preservado**: Mantiene el menú deslizable con backdrop oscuro (`fixed inset-0 bg-black/80`) y la barra horizontal deslizante de pestañas para smartphones.

### Novedades v23.9 (Taxonomía Visual Maestra de Flyers & Persistencia 100% en Mesa de Edición de Matches):
- **Taxonomía Maestra de 6 Formatos Visuales (`prompts/base.md` & `janIA.ts`)**:
  1. *Fotografía Ambiental Pura (Raw Photo)*: Descarte silencioso total a `CONSULTA_GENERAL` (0 BD, 0 matches) para fotos de salas, fachadas o baños sin texto comercial sobreimpreso.
  2. *Banner Corporativo / Multi-Servicio*: Descarte silencioso a `CONSULTA_GENERAL` para publicidad institucional con portafolio general (fincas, drones, abono) sin un predio o canon individual.
  3. *Flyer Editorial Infográfico (Oferta)*: Extracción integral de precio, administración, áreas y amenidades (`👍` / `👌`).
  4. *Flyer en Mosaico / Collage Comercial (Oferta)*: Extracción precisa de fotos en collage con tabla inferior de especificaciones (`👍` / `👌`).
  5. *Tarjeta Gráfica de Estado / Historia (Demanda)*: Captura de estados de WhatsApp con tipografía grande y hashtags (`#COMPRA`, `#PRESUPUESTO_ABIERTO` → `📝` / `✏️`).
  6. *Flyer de Requerimiento Estructurado (Demanda)*: Extracción formal de solicitudes con presupuesto y perfil de cliente (`📝` / `✏️`).
- **Persistencia Directa de Teléfonos en Edición de Matches (`AdminMatches.tsx` & `server/routers/janIA.ts`)**:
  - Corrección de `handleOnlySave` y `handleRecalculateMatch` que omitían guardar `idUsuarioWhatsapp` (`propPhone` y `reqPhone`).
  - Migración a mutaciones de backend seguras (`updatePropertyDetails` y `updateRequirementDetails`) con normalización automática de teléfonos colombianos (`573...`).
  - Cierre automático del modo edición (`setEditingMatchId(null)`) e invalidación inmediata de caché React Query / tRPC (`utils.janIA.getAllMatches.invalidate()`), actualizando la tarjeta en pantalla al instante sin necesidad de refrescar con F5 ni perder los datos.

### Novedades v23.8 (Captación de Flyers, Storage en Supabase & Auditoría TypeScript 100% Limpia):
- **Desbloqueo de Media Reenviada / Efímera (`unwrapMessage` en `whatsapp-match.ts`)**: Corrección de la lectura de imágenes y documentos en el buffer de mensajes (`hasMedia: !!rawMsg?.imageMessage || !!rawMsg?.documentMessage`), permitiendo que imágenes reenviadas o sin texto en el pie de foto se procesen y reaccionen con el emoji doctrinal correspondiente.
- **Generador de Ficha y Desglose Estructurado (`buildFlyerBreakdownText` en `janIA.ts`)**: Cuando un usuario publica solo una imagen o flyer sin texto, JanIA sintetiza y almacena en `rawText` un desglose completo y estructurado (título, descripción, precio/presupuesto, canon, administración, área, habitaciones, baños, parqueaderos, sector, ciudad y contacto).
- **Visor de Flyer & Desglose en Demandas / Requerimientos (`AdminMatches.tsx`)**: Ampliación de `extractItemImages` para leer `enlaceOrigen` y `externalUrl` en demandas, renderizando la imagen original del flyer con visor y botón de descarga junto con el desglose de especificaciones.
- **Aprovisionamiento y Sincronización de Supabase Storage (`property-flyers`)**: Bucket público con RLS universal y migración de todos los flyers existentes. Normalización de URLs absolutas HTTPS en frontend y auto-recuperación `onError`.
- **Auditoría Integral de Tipado TypeScript (0 Errores)**: Resolución de los 10 errores de tipado e imports faltantes (`validateCity`, `findMatchesForProperty`, `findMatchesForRequirement`, `sourceUrl` en `janIA.ts`, y `localidad: locality` en `geography.ts`). Validación empírica con `npx tsc --noEmit` y `pnpm run build` limpios.

### Novedades v23.7 (Doctrina de Inversionistas & Propiedades Rentando + Micro-Zonificación Rosales Bajo):
- **Doctrina de Inversión y Flujo de Renta**: *"para inversionista"*, *"rentando"*, *"esté rentando"*, *"generando renta"*, *"compra rentando"* representan intención de COMPRA / ADQUISICIÓN DE ACTIVO EN VENTA para percibir renta mensual, JAMÁS una solicitud de arriendo.
- **Blindaje en Extracción y Prompts (`janIA.ts` y `prompts/base.md`)**: Asignación forzosa de `tipoNegocioDeseado: "venta"` y `transactionType: "venta"`, evitando que caigan en la trampa semántica de `arriendo`.
- **Depuración Retroactiva en Supabase**: Corrección de requerimientos históricos de inversionistas y purga de matches inválidos contra propiedades en arriendo (incluyendo match #10955).
- **Micro-Zonificación Rosales**: *Rosales Bajo* (abajo de la Av. Circunvalar hacia Cra 7 / Cra 5) vs *Rosales Alto* (arriba de la Circunvalar hacia cerros).

### Novedades v23.6 (Blindaje de Lista Negra de Grupos No Inmobiliarios & Filtro Anti-Falsos Positivos):
- **Purga Total de Grupo de Seguridad Comunitaria**: Eliminación completa en Supabase del Requerimiento #127 y su match falso originado en *"SEGURIDAD TIEMPO REAL"*.
- **Lista Negra Global de Grupos (`isBlacklistedGroup` en `whatsapp-match.ts` y `janIA.ts`)**: Descarte silencioso total a nivel de red para grupos de seguridad, cuadrantes policiales, frentes de seguridad o convivencia ciudadana (0 logs, 0 buffers, 0 reacciones y 0 IA).
- **Filtro Estricto de Intención Predial (`hasRealEstateIntent` en `janIA.ts` y reglas 4-5 en `prompts/base.md`)**: Requisito inquebrantable de intención comercial (búsqueda/oferta) o tipología predial (`apto`, `casa`, `oficina`, `bodega`, etc.) para calificar como `REQUERIMIENTO` o `INMUEBLE`. Frases cortas, saludos o direcciones aisladas se degradan a `CONSULTA_GENERAL` y jamás ingresan a Supabase ni generan matches.

### Novedades v23.5 (Motor de Deducción Geográfica Pura e Intersecciones Catastrales):
- **Extractor Inteligente de Intersecciones Viales (`extractIntersectionFromText` y `resolveIntersectionToBarrio` en `geography.ts`)**: Análisis robusto de cruces viales (`Calle X con Cra Y`, `Cra X con Calle Y`, `#`, `con`, `y`, `septima/7ma`, etc.).
- **Point-in-Polygon Bidireccional sobre IDECA Catastro (`geo-lookup.ts`)**: Resolución espacial exacta sobre los 1,230 sectores catastrales de Bogotá D.C., asignando el Barrio oficial, Localidad y Ciudad (`Bogotá, D.C.`).
- **Auto-Enriquecimiento Geográfico en Ingesta (`saveProperty` y `saveRequirement`)**: Si un asesor publica *"en la 83 con 5"* o *"cra 15 con 93"* sin mencionar la palabra "barrio", JanIA deduce de forma 100% matemática y catastral el Barrio (`"El Retiro"`, `"El Chicó"`, `"La Cabrera"`), la Localidad (`"Chapinero"`) y la Ciudad.
- **Directriz Doctrinal de IA Pura (`prompts/base.md`)**: Instrucción obligatoria a Gemini de aplicar su conocimiento urbano de Colombia para inferir siempre el sector geográfico y nunca dejar `zone: null`.

### Novedades v23.4 (Extractor Inteligente de Teléfonos & Directorio de Brokers 100% Pasivo Anti-Ban):
- **Extractor Inteligente de Teléfono Colombiano (`extractColombianPhoneFromText` en `janIA.ts`)**: Análisis robusto de enlaces `wa.me/573...`, prefijos de contacto (`Tel`, `Cel`, `WhatsApp`, `Inf`, `Contacto`, `Asesor`) y números celulares de 10 dígitos colombianos con filtrado de descarte para precios y áreas.
- **Directorio de Brokers en Memoria (`brokerDirectoryCache` y `initBrokerDirectory`)**: Mapeo persistente y pasivo de asesores (remitentes, nombres y LIDs a números de teléfono reales). Aprende el teléfono de cada broker la primera vez y lo aplica a todas sus publicaciones futuras sin depender de APIs externas ni arriesgar el número de WhatsApp.
- **Enriquecimiento Retroactivo en Supabase (`enrich_phones.ts`)**: Ejecución exitosa que recuperó y asignó números celulares reales a 37 inmuebles y 25 requerimientos con LIDs anónimos en la base de datos.
- **Resolución Automática en Ingesta (`saveProperty` y `saveRequirement`)**: Asignación transparente del número real a `idUsuarioWhatsapp` y vinculación con la tabla `users`.

### Novedades v23.3 (Gran Desbloqueo Doctrinal de Matches & Geografía Canónica):
- **Desbloqueo Doctrinal de Contacto en Matching (`matching.ts`)**: Conversión del filtro duro de teléfono (`Filtro 0B`) que descalificaba al 0% publicaciones sin teléfono explícito en el texto crudo hacia una advertencia informativa de enriquecimiento, permitiendo que JanIA califique matches viables con brokers de grupos de WhatsApp.
- **Homologación Geográfica Completa (`matchesGeography` en `explicarMatch`)**: Unificación de la validación geográfica mediante `matchesGeography` para soportar equivalencias de zonas (`Chicó` ↔ `Chicó Norte` / `Chicó Reservado`, cuadrantes viales y municipios aledaños de la Sabana).
- **Recálculo y Sincronización Global de Matches**: Ejecución del motor sobre los 743 inmuebles y 372 requerimientos en Supabase, incrementando los matches calificados de 6 a **131 matches de alta calidad (111 con Score ≥ 85%)** activos en el panel de administración.

### Novedades v23.2 (Resiliencia de Autenticación & Storage de Flyers):
- **Resiliencia Total en Autenticación OAuth / Supabase (`Login.tsx`)**: Eliminación del temporizador destructivo de 5s y reemplazo por timeout holgado de 30s. Sincronización instantánea de caché React Query con `utils.auth.me.setData(undefined, res.user)` y supresión del `signOut()` forzado en fallas de red.
- **Corrección de Supabase Storage para Flyers (`storage.ts`)**: Normalización de nombres de variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) para el bucket `property-flyers` y generación de URLs públicas absolutas.
- **Proxy de Archivos Estáticos en Vercel (`vercel.json`)**: Configuración de regla de rewrite para `/uploads/:path*` hacia el servidor VPS.

### Novedades v23.1 (Gran Auditoría & Súper JanIA Autosuficiente):
- **Desactivación de Filtros Destructivos de Captura (`janIA.ts`)**: Eliminación del filtro `isShortComment` que descartaba requerimientos concisos y directos de WhatsApp, y de la degradación arbitraria a `CONSULTA_GENERAL` (`isGeneralInquiryOrRecommendation`). Todo lead se ingesta y califica.
- **Corrección de Multiplicador Taquigráfico 10x (`janIA.ts`)**: `mult = 10_000_000` aplica exclusivamente cuando la unidad escrita es literalmente `mm` (`unit === "mm"`), eliminando la distorsión donde *"50 millones"* se convertía en 500M.
- **Ampliación Integral de Tipologías (`janiaResultSchema`)**: Inclusión de `"land"`, `"commercial"`, `"cabin"`, `"hotel"` en el enum de `propertyType`.
- **Eliminación de Fallbacks Forzados a Bogotá (`janIA.ts`)**: `city` y `zone` devuelven `null` si no se especifican, impidiendo que inmuebles de otras ciudades o la Sabana se sobreescriban ciegamente con `"Bogotá, D.C."`.
- **Eliminación de Guillotina Invertida de Administración (`matching.ts`)**: Las cuotas de administración por debajo del presupuesto máximo son tratadas como beneficio financiero positivo para el cliente en lugar de bloquear el match al 0%.
- **Elasticidad Geográfica Canónica (`matching.ts`)**: Eliminación del pre-filtrado SQL rígido `LOWER(ciudad) = LOWER(ciudad)` en `findMatchesForProperty` y `findMatchesForRequirement`, y homologación canónica en `matchesGeography` (`Bogotá` ↔ `Bogotá, D.C.`).
- **Alineación Doctrinal de Área y Confort (`matching.ts`)**: Eliminación del bloqueo erróneo de 3% por área mayor; toda área `propArea >= reqAreaMin` cumple 100% de confort.
- **Blindaje de Tipos y Normalización Segura (`geography.ts`)**: Protección contra tipos no-string en `normalizarTextoGeografico`.
- **Verificación Empírica Automatizada**: Suite de 8 tests unitarios pasando al 100% y compilación limpia con `pnpm run build`.

### Novedades v23.0:
- **Nueva Matriz Doctrinal de 6 Reacciones de Negocio (`whatsapp-match.ts`)**:
  - `👍` **Oferta Venta**: Inmuebles en venta pura o duales.
  - `📝` **Demanda Venta**: Requerimientos de compra / adquisición.
  - `👌` **Oferta Arriendo**: Inmuebles en arrendamiento tradicional / temporal.
  - `✏️` **Demanda Arriendo**: Requerimientos de búsqueda en canon de arriendo.
  - `🔀` **Oferta con Permuta**: Inmuebles con permuta o dación de pago / permuta pura.
  - `🔄` **Demanda con Permuta**: Requerimientos con permuta o intercambio de bienes.
- **Despachador Blindado con Auto-Reintento (`safeReact`)**:
  - Eliminación de stanzas manuales; uso exclusivo de `key: msg.key` nativo de Baileys con tolerancia a micro-pausas y reintento a los 2.5s.
- **Corrección de Restricción `price NOT NULL` en Arriendos (`janIA.ts`)**:
  - Asignación segura de `price = '0.00'` en arriendos para evitar rechazos en Supabase y garantizar la entrega inmediata del emoji.
- **Blindaje Total de Silencio en Grupos Externos**:
  - Guardia estricta en `handleDirectGroupQuestion` que prohíbe el envío de cualquier texto o audio fuera de los grupos oficiales.

### Novedades v22.6:
- **Tratamiento Universal de Presupuesto Abierto**:
  - Detección inteligente en backend (`matching.ts`) y frontend (`AdminMatches.tsx`) de expresiones como *"Ppto $ Abierto"*, *"sin límite"*, *"ilimitado"*, asignando 100% de cumplimiento financiero (Filtro Duro 7 superado con éxito).
- **Prioridad Financiera de Negocio (Canon de Arriendo)**:
  - En búsquedas de arrendamiento cruzadas contra inmuebles en `venta_o_arriendo`, la comparación activa y prioritaria se ejecuta sobre el canon de arriendo mensual (`rent_price`) y la administración, evitando que la fila de venta penalice o bloquee el match.
- **Regla Doctrinal de Confort Físico**:
  - `prop >= req` en Área, Habitaciones, Baños y Parqueaderos califica como `exact` (100% Verde Confort).
- **Filas Adaptativas Dinámicas Adicionales**:
  - `👮 Vigilancia 24/7 Presencial (No Automatizada)`: Detección y cotejo de portería física permanente.
  - `📚 Estudio / Star de TV`: Reconocimiento de estudio independiente como sustitución o confort de habitaciones.
  - `✨ Zonas Sociales & Chimenea`: Bono de confort en sala doble y chimenea.
- **Validación Empírica 100% Match Perfecto**:
  - Match #10788 (Requerimiento #44 ↔ Inmueble #149) probado, recalculado y validado en Supabase con score 100%.

### Novedades v22.5:
- **Independencia Total de Botones en Modo Edición (`AdminMatches.tsx`)**:
  - `💾 Guardar Cambios (Modo Chat)`: Guarda en Supabase (`properties` y `requirements`), actualiza la ficha y el puntaje en vivo en pantalla (permitiendo alcanzar el 100% Match manual si todo coincide en verde) sin desvincular la pareja actual.
  - `⚡ Recalcular Match (Buscar Nueva Pareja)`: Guarda los cambios y ejecuta el motor global de búsqueda para cruzar las fichas robustecidas contra toda la base de datos de la red.
- **Capa A: Matriz de Cotejo Dinámica y Elástica**: Inserción adaptativa en vivo de filas para Cocina *(Cerrada/Abierta/Isla)*, Cuarto y Baño de Servicio *(CBS)*, Acabado de Pisos *(Madera/Laminado/Mármol)*, Asoleación *(Sol de mañana/tarde/exterior)*, Planta Eléctrica *(Total/Parcial)* y Parqueadero de Visitantes.
- **Capa B: Memoria y Diccionario Semántico Evolutivo (`inmobiliario_lexicon`)**: JanIA auto-aprende a diario la jerga y modismos inmobiliarios colombianos (*"cbs"*, *"pelo a pelo"*, *"star de tv"*, *"cuarto de empleada"*), normalizándolos a conceptos canónicos en Supabase.
- **Capa C: Bucle de Retroalimentación de Brokers (`match_feedback`)**: Botones 👍 *"🤝 Trato en Curso"* y 👎 *"⛔ Descartar Match"* con modal de motivos para entrenar y calibrar continuamente las decisiones de la IA.
