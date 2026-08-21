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
- `propArea < reqAreaMin * 0.95` → ❌ 0% (piso -5%, NUEVO v20.0 — antes -2%)
- `propertyType` incompatible → ❌ 0%
- Barrio incompatible → ❌ 0%
- Precio supera presupuesto máximo → ❌ 0%
- **Especificaciones Físicas Mínimas (REGLA DOCTRINAL v22.4)**:
  `Habitaciones`, `Baños`, `Parqueaderos`, `Depósitos`, `Balcones` y `Terrazas` **JAMÁS pueden ser menores en la Oferta que en lo Demandado (`prop < req` → ❌ 0% Match Inviable / Bloqueo Absoluto)**. Sin embargo, **SIEMPRE se aceptan cuando en la Oferta son IGUALES O MAYORES que en la Demanda (`prop >= req` → ✅ 100% Cumplimiento / Confort)**.

### Campana de Tolerancia de Área (v20.0)
- `< reqMin * 0.95`              → Bloqueo 0%
- `0.95 ≤ propArea ≤ 1.15`       → Zona confort — puntaje completo (10 pts)
- `> reqMin * 1.15`              → Pasa con advertencia "Inmueble significativamente más grande (+X%)"

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

## 🔖 VERSIÓN ACTUAL: v23.6 — Agosto 2026

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
