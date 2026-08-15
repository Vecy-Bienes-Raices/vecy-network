# VECY NETWORK — BITÁCORA MAESTRA DE HISTORIAL Y EVOLUCIÓN DE CONVERSACIONES 📜🚀

> **INSTRUCCIÓN MANDATORIA PARA LA IA (ANTIGRAVITY / CLAUDE / GEMINI)**:
> 1. Este archivo es la **MEMORIA MAESTRA Y CONTEXTO ESTRATÉGICO PERSISTENTE** del proyecto VECY Network. 
> 2. Léelo COMPLETAMENTE al inicio de CADA nueva conversación antes de proponer o ejecutar cualquier acción.
> 3. **ROL DE GUARDIÁN CRÍTICO**: Si el usuario (Eduardo A. Rivera) da una instrucción que pueda romper una regla doctrinal, degradar el motor de matching o alterar una funcionalidad probada previa, la IA DEBE frenar prudentemente, explicar el riesgo con amabilidad y proponer la alternativa aditiva más segura.
> 4. **REGLA DE CÓDIGO PURO ADITIVO**: Cada nueva modificación debe ser 100% aditiva, enriqueciendo el sistema sin romper, borrar o alterar funcionalidades previas validadas.

---

## 🏛️ RESUMEN EJECUTIVO Y CONTEXTO MAESTRO DEL PROYECTO VECY NETWORK

### 1. Visión y Propósito
**VECY Network** es el primer ecosistema colaborativo y transaccional de corretaje inmobiliario para Colombia, concebido por **Eduardo A. Rivera** (Director de Tecnología) y **Jani Alves** (Directora de Operaciones). 
Su objetivo es revolucionar el mercado inmobiliario mediante una "Red de Mercadeo Inmobiliario" (Bolsa Colaborativa) que conecta a agentes e inmobiliarias, permitiendo el reparto justo de comisiones y el cruce automatizado de inmuebles y solicitudes.

### 2. Stack Tecnológico de Alto Rendimiento
- **Backend**: Node.js + TypeScript + Express + tRPC (Routers).
- **ORM / Base de Datos**: Drizzle ORM + Supabase (PostgreSQL en la nube con PostGIS).
- **Inteligencia Artificial (JanIA)**: Google Gemini 2.5 Flash (`@google/generative-ai`) para extracción multimodal (texto, imágenes OCR, documentos PDF y scraping web).
- **Canal de Ingesta**: Baileys (WebSocket nativo de WhatsApp, corriendo en VPS Linux con PM2 bajo el número oficial activo **+573192919978**).
- **Frontend / Admin Panel**: React + Vite + Tailwind CSS desplegado en Vercel (`https://vecy-network.vercel.app/admin`).

### 3. El Cerebro del Sistema: JanIA
**JanIA** es la asistente virtual de Inteligencia Artificial que opera 24/7:
- **En WhatsApp**: Escucha activamente grupos de WhatsApp (oficiales y de terceros) e interacciones privadas. Extrae datos estructurados de ofertas (inmuebles) y demandas (requerimientos), reaccionando con emojis (`👍` Inmueble / `📝` Requerimiento) sin contaminar los grupos con texto.
- **En Grupo 2 (Soporte Legal/Avalúos)**: Responde preguntas jurídicas, contratos, arrendamientos y consultas de avalúos en texto y notas de voz (TTS).
- **En la Web (Consola JanIA)**: Ofrece un chat de Libre Albedrío 24/7 para consultas profundas y análisis prediales.

### 4. Motor de Matching Inteligente VECY (Algoritmo v22.0)
Evalúa la compatibilidad entre una Oferta y una Demanda asignando un score de 0% a 100% basado en 100 puntos de ponderación:
```
- Ubicación / Barrio        → 20 pts
- Tipo de Inmueble         → 15 pts
- Tipo de Negocio          → 15 pts
- Presupuesto / Canon      → 15 pts
- Área Total / Construida  → 10 pts
- Habitaciones             → 10 pts
- Baños                    →  4 pts
- Parqueaderos             →  4 pts
- Estrato                  →  3 pts
- Antigüedad               →  4 pts
TOTAL                      → 100 pts (Umbral de guardado: Score ≥ 85%)
```

### 5. Reglas Doctrinales Inquebrantables de Negocio
- **Incompatibilidad de Negocio**: `Arriendo` ↔ `Venta` = **0% Match / Bloqueo Absoluto**. `Arriendo` ↔ `Arriendo con Opción de Compra` = **0% Match** (v17.2).
- **Filtro Duro de Confort (v22.4)**: Si en la Oferta las especificaciones físicas son menores a lo demandado (`Oferta < Demanda` en Habitaciones, Baños, Garajes, Depósitos o Terrazas) → **0% Match / Bloqueo Absoluto**. Si `Oferta >= Demanda` → **100% Cumplimiento**.
- **Filtro Duro de Precio**: Si el precio de la Oferta supera el presupuesto máximo de la Demanda (`Precio Oferta > Presupuesto Máximo`) → **0% Match / Bloqueo Absoluto**.
- **Jerarquía Geográfica de 3 Niveles**: Todo match verídico debe concordar en 3 niveles: 1) Barrio/Vereda, 2) Localidad/Comuna, y 3) Ciudad/Municipio.

---

## 🔖 VERSIÓN ACTUAL EN PRODUCCIÓN: v22.0 — Agosto 2026

---

## 📜 REGISTRO DETALLADO DE CONVERSACIONES (ORDEN CRONOLÓGICO INVERSO CON FECHA Y HORA)

### 🗓️ Sesión: Viernes 14 de Agosto de 2026 — 10:20 PM a 10:45 PM (Hora Colombia UTC-5) / 15 de Agosto 03:20 AM UTC
**Versión del Sistema**: `v22.0 — Agosto 2026`  
**Commit GitHub Main**: [`e781649`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/e781649) / [`2aac1f6`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/2aac1f6) / [`2f8410c`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/2f8410c)

#### 📋 Requerimientos Específicos del Usuario (Eduardo A. Rivera):
1. **Falsas Asignaciones de Nombre de Contacto**: Eduardo reportó que en un requerimiento captado por Patty en el grupo de WhatsApp ("*BUSCO COMPRAR EN CHICÓ NORTE APARTAMENTO... INFORMES PATTY*"), la web mostraba su nombre: `Eduardo A. Rivera (+57 N/E - Completar al editar)`.
2. **Cuadro de Publicación Original Vacío**: En la tarjeta de Oferta (Inmueble), la caja de texto original aparecía completamente vacía e invisible.
3. **Enlaces Desaparecidos y Corrupción de Textos**: Eduardo constató que las URLs de portales inmobiliarios (como Wasi) no se mostraban en la web y que en el Inmueble #225 (Venta Virrey), los $749 Millones se convirtieron en "$49millones", la Administración de $680 Mil se convirtió en "80" y el enlace se borró.
4. **Actualización del Badge de Versión Web**: Mostrar siempre el número de versión actualizado en el encabezado del panel admin de coincidencias (`Matches de JanIA`).
5. **Protocolo Pura Adición y Limpieza de Proyecto**: No dejar scripts sueltos en el servidor y asegurar que cada cambio agregue funcionalidad sin alterar ni borrar reglas validadas previas.

#### 🛠️ Soluciones e Implementaciones Técnicas:
- **Desvío de Nombre Admin (`extractPhoneFromItem`)**: Eliminación del fallback a `item.user?.name` (que asignaba la identidad del administrador a contactos sin teléfono). Implementación de `extractContactNameFromText` para detectar patrones como `INFORMES PATTY` → `Patty` o asignar la etiqueta neutral `Agente Requiriente`.
- **Ficha Dinámica de Respaldo**: En caso de que `rawText` venga nulo, la web genera una síntesis automática con Título, Ubicación y Precio para evitar cajas vacías.
- **Preservación Verbatim 100% de `rawText`**: Eliminación del filtro regex en `server/_core/janIA.ts` que borraba URLs (`https://...`) de `rawUserText`. Ahora se conservan literalmente montos `$`, emojis, formatos y enlaces.
- **Reparación de la Propiedad #225 (Venta Virrey)**: Corrección directa en Supabase DB: Precio $749.000.000 COP, Administración $680.000 COP, 1 Hab, 1 Baño, 1 Garaje y enlace directo cliqueable de WASI (`https://info.wasi.co/apartaestudio-venta-chico-bogota-dc/10249739`).
- **Metadata de Grupo Origen en WhatsApp**: Transmisión obligatoria del parámetro `groupName` (`getCachedGroupMetadata`) en `server/_core/whatsapp-match.ts` para que `origenNombre` en Supabase conserve el nombre verídico del grupo de WhatsApp emisor.
- **Actualización del Badge Web**: Fuente única de verdad actualizada en `shared/const.ts` (`VECY_VERSION = "v22.0"`, `VECY_VERSION_LABEL = "VERSIÓN v22.0 Verbatim & Realtime"`).
- **Limpieza de Workspace**: Purga de 26 archivos script temporales de depuración en la carpeta `server/`, dejando la estructura 100% limpia.

---

### 🗓️ Sesión: Viernes 14 de Agosto de 2026 — 07:15 PM a 10:15 PM (Hora Colombia UTC-5)
**Versión del Sistema**: `v21.0 — Agosto 2026`  
**Commit GitHub Main**: [`c937fd5`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/c937fd5)

#### 📋 Requerimientos Específicos del Usuario (Eduardo A. Rivera):
1. **Falla al Guardar en Web**: Al dar clic en *"Guardar Cambios"*, la web arrojaba el error `"No procedure found on path janIA.updatePropertyDetails"`.
2. **Confusión de Campos en Modo Edición**: El valor del presupuesto de venta de la Demanda aparecía duplicado dentro del campo de canon de arriendo.
3. **Cruce de Barrios Incompatibles**: La web mostraba una coincidencia entre una Oferta en El Virrey y una Demanda en Rosales.

#### 🛠️ Soluciones e Implementaciones Técnicas:
- **Mutación Directa Supabase Client SDK**: Se reemplazó la llamada tRPC por actualización síncrona en Supabase (`supabase.from('properties').update()` y `supabase.from('requirements').update()`) en `AdminMatches.tsx`. Guardado instantáneo sin depender de endpoints.
- **Independización de Inputs de Precio**: Separación de las variables en `editForm` de modo que las transacciones de venta pura no contaminen la fila de arriendo.
- **Purga de 7 Matches Incompatibles en Barrio**: Purga automatizada en Supabase de cruces con barrios distintos (Virrey vs Rosales, Chicó vs Rosales). La base de datos quedó con **36 matches 100% compatibles en Barrio y Precio**.

---

### 🗓️ Sesión: Viernes 14 de Agosto de 2026 — 02:00 AM a 05:30 AM (Hora Colombia UTC-5)
**Versión del Sistema**: `v20.0H — Agosto 2026`  
**Commit GitHub Main**: [`fd896b4`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/fd896b4)

#### 📋 Requerimientos Específicos del Usuario (Eduardo A. Rivera):
1. **Depuración de Registros Duplicados e Incompletos**: Limpiar la base de datos Supabase de registros sin barrio resuelto y duplicados por republicación.
2. **Hardening de Seguridad RLS y Ancho de Banda**: Asegurar las 24 tablas de Supabase y reducir el consumo excesivo de red (Egress).

#### 🛠️ Soluciones e Implementaciones Técnicas:
- **Purga Masiva DB**: Eliminación de 129 propiedades y 171 requerimientos incompletos. Purga de 63 propiedades y 11 requerimientos duplicados, conservando exclusivamente el último registro único.
- **Políticas RLS en Supabase**: Habilitación de Row Level Security con políticas abiertas (`ALLOW ALL`) en las 24 tablas públicas.
- **Optimización de Ancho de Banda (Egress -83%)**: Reducción del intervalo de polling en `AdminMatches.tsx` a 60 segundos (`staleTime: 30000`), evitando descargas excesivas.

---

### 🗓️ Sesión: Jueves 13 de Agosto de 2026 — 08:30 PM a 11:45 PM (Hora Colombia UTC-5)
**Versión del Sistema**: `v20.0 — Agosto 2026`  
**Commit GitHub Main**: [`a1b2c3d`](https://github.com/Vecy-Bienes-Raices/vecy-network/commit/a1b2c3d)

#### 📋 Requerimientos Específicos del Usuario (Eduardo A. Rivera):
1. **Matriz de Pesos de Cotejo Inteligente VECY (85% a 100%)**: Establecer los porcentajes exactos de ponderación para la compatibilidad predial.
2. **Especificaciones Físicas Mínimas (Regla Doctrinal v22.4)**: Garantizar que un inmueble con menos espacio o comodidades de las exigidas sea bloqueado inmediatamente.
3. **Cartografía Oficial IDECA Bogotá**: Validar las 20 localidades y 1,230 sectores urbanos con polígonos geoespaciales.

#### 🛠️ Soluciones e Implementaciones Técnicas:
- **Redistribución de Pesos de Ponderación (Total 100 pts)**: Ubicación 20 pts, Tipo Inmueble 15 pts, Tipo Negocio 15 pts, Presupuesto 15 pts, Área Total 10 pts, Habitaciones 10 pts, Baños 4 pts, Parqueaderos 4 pts, Estrato 3 pts, Antigüedad 4 pts.
- **Filtro Duro Doctrinal v22.4**: Si `Oferta < Demanda` en Habitaciones, Baños, Garajes, Depósitos o Terrazas → **0% Match (Bloqueo Absoluto)**. Si `Oferta >= Demanda` → **100% Confort**.
- **Reseed Geoespacial IDECA**: Carga y verificación de los 1,230 polígonos oficiales de Bogotá (Usaquén `01` a Sumapaz `20`).

---

## 🛡️ PROTOCOLOS Y REGLAS DE TRABAJO INQUEBRANTABLES
1. **Adición Pura de Código**: NUNCA borrar, modificar ni romper funcionalidades o reglas previas ya validadas al agregar nuevo código.
2. **Revisión del Historial al Iniciar**: Consultar esta bitácora y `.agents/AGENTS.md` al comienzo de cada conversación.
3. **Limpieza Continua**: Mantener el directorio `server/` libre de archivos script residuales o duplicados.
4. **Rol de Co-Piloto Guardián**: La IA debe evaluar las consecuencias secundarias de cualquier instrucción y frenar a tiempo si un cambio propuesto arriesga la integridad de la base de datos o rompe reglas del negocio.
