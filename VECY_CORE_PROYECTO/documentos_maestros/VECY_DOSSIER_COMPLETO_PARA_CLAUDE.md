# 🏢 VECY NETWORK — DOSSIER TÉCNICO MAESTRO & CÓDIGO COMPLETO PARA CLAUDE.AI (v21.2)

> **Documento de transferencia técnica preparado para Claude.ai / Jan.**
> **Fecha de actualización**: Agosto 2026 (Versión v21.2).
> **Repositorio**: `Vecy-Bienes-Raices/vecy-network` en GitHub.

---

## 🏢 1. RESUMEN EJECUTIVO Y ARQUITECTURA TÉCNICA

**VECY Network** es la primera red colaborativa de corretaje e inteligencia inmobiliaria para Colombia, potenciada por una Agente de IA llamada **JanIA Match**.

### Stack Tecnológico:
- **Backend**: Node.js + TypeScript + Express.
- **API Framework**: tRPC (routers en `server/routers/`).
- **ORM**: Drizzle ORM (`drizzle/schema.ts`).
- **Base de datos**: Supabase (PostgreSQL).
- **Inteligencia Artificial**: Google Gemini 2.5 Flash (`@google/generative-ai`).
- **Integración WhatsApp**: Baileys (WebSocket nativo) ejecutándose en VPS Linux con PM2.
- **WhatsApp Activo JanIA**: **+573192919978** (Jamás mencionar el número anterior baneado +573166569719).
- **Frontend / Admin Panel**: React + Vite + Vanilla CSS desplegado en Vercel (https://vecy-network.vercel.app/admin).

---

## 🗄️ 2. ESQUEMA DE BASE DE DATOS SUPABASE (v21.2)

### Enum `transactionType` (Tipos de Negocio Válidos):
- `venta`: Venta pura.
- `arriendo`: Arriendo puro.
- `venta_o_arriendo`: Venta O arriendo (lo que primero ocurra).
- `arriendo_temporal`: Arriendo por temporada / vacacional.
- `arriendo_con_opcion_de_compra`: Arrendatario con derecho de compra.
- `permuta`: Intercambio puro de bienes.
- `venta_permuta`: Venta + parte en bien (inmueble/vehículo).
- `aporte`: Aporte a proyecto de construcción.

### Tabla `properties` (Inmuebles / Ofertas):
- `id`: serial primaryKey.
- `name`: varchar(255).
- `propertyType`: enum (`apartment`, `house`, `building`, `warehouse`, `office`, `farm`, `commercial`, `cabin`, `loft`, `consultorio`).
- `transactionType`: enum (`venta`, `arriendo`, `venta_o_arriendo`, ...).
- `acceptedTransactionTypes`: text[].
- `price`: decimal(15, 2) -> Precio de venta.
- `rentPrice`: decimal(15, 2) -> Canon neto de arriendo.
- `areaTotal`: decimal(10, 2).
- `bedrooms`: integer.
- `bathrooms`: integer.
- `garages`: integer.
- `garageType`: text ("independiente" | "lineal" | "mixto" | null).
- `stratum`: integer.
- `adminFee`: decimal(15, 2).
- `yearBuilt`: integer.
- `antiguedadAnos`: integer.
- `city`: varchar(100) default "Bogotá".
- `zone`: varchar(100).
- `addressNeighborhood`: varchar(150).
- `idUsuarioWhatsapp`: varchar(100) -> **Celular individual del remitente (+57...)**.
- `nombreUsuarioWhatsapp`: varchar(255) -> **Nombre completo / pushName de WhatsApp (v21.2)**.
- `origenId`: varchar(100) -> ID del grupo de WhatsApp.
- `origenNombre`: varchar(255) -> Nombre del grupo de WhatsApp.
- `rawText`: text -> Texto original recibido.

### Tabla `requirements` (Demanda / Requerimientos):
- `id`: serial primaryKey.
- `tipoInmuebleDeseado`: enum.
- `tipoNegocioDeseado`: enum.
- `tiposNegocioAceptados`: text[].
- `ciudadDeseada`: varchar(100) default "Bogotá".
- `zonaDeseada`: varchar(100).
- `addressNeighborhood`: varchar(150).
- `presupuestoMin`: decimal(15, 2).
- `presupuestoMax`: decimal(15, 2).
- `areaMin`: decimal(10, 2).
- `habitacionesMin`: integer.
- `banosMin`: integer.
- `parqueaderosMin`: integer.
- `adminFeeMax`: decimal(15, 2).
- `estratoDeseado`: jsonb.
- `idUsuarioWhatsapp`: varchar(100) -> **Celular individual del requiriente (+57...)**.
- `nombreUsuarioWhatsapp`: varchar(255) -> **Nombre completo / pushName de WhatsApp (v21.2)**.
- `origenId`: varchar(100).
- `origenNombre`: varchar(255).
- `rawText`: text.

---

## 🔀 3. REGLAS DOCTRINALES DEL MOTOR DE MATCHING (v21.2)

### Umbral VECY:
- **Coincidencias en base de datos**: Registro a partir del **80% al 100% de afín**. Todo lo inferior a 80% es descartado.
- **Categorías en Web**:
  - **Aproximadas**: 80% a 89%.
  - **Más Precisas**: 90% a 99%.
  - **Perfectas**: 100%.

### Distribución de Pesos (Total = 100 pts):
1. **Tipo de Inmueble**: 15 pts.
2. **Tipo de Negocio**: 15 pts.
3. **Ubicación / Barrio**: 20 pts.
4. **Presupuesto Máx.**: 15 pts.
5. **Área Total**: 10 pts.
6. **Habitaciones**: 10 pts.
7. **Baños**: 4 pts.
8. **Parqueaderos**: 4 pts.
9. **Estrato**: 3 pts.
10. **Antigüedad / Año**: 4 pts.

### Filtros Duros Inquebrantables (Bloqueo 0% Inmediato):
- **Tipo de Negocio Incompatible**:
  - `Arriendo` vs `Venta` $\rightarrow$ ❌ **0% IMPOSIBLE**.
  - `Arriendo` vs `Arriendo con opción de compra` $\rightarrow$ ❌ **0% IMPOSIBLE**.
- **Tipo de Inmueble Incompatible**: `Apartamento` vs `Casa` $\rightarrow$ ❌ **0%**.
- **Ubicación / Barrio Incompatible**:
  - `Cedritos` vs `Santa Paula` $\rightarrow$ ❌ **0% (Barrio Incompatible)**.
  - Perímetro vial fuera de rango (ej. Solicitado `Calle 106 a 127`, ofrecido `Calle 99`) $\rightarrow$ ❌ **0% (Fuera de Perímetro)**.
- **Tolerancia de Área**: Inmueble con área `< areaMin * 0.95` (-5%) $\rightarrow$ ❌ **0%**.
- **Presupuesto**: Precio de oferta superior a `presupuestoMax` $\rightarrow$ ❌ **0%**.

---

## 🤖 4. PROMPT BASE OFICIAL DE JANIA (`server/_core/prompts/base.md`)

```markdown
# 🤖 IDENTIDAD, PERFIL LEGAL Y NATURALEZA COGNITIVA PURA
Eres JanIA Match, una Inteligencia Artificial pura de alto razonamiento, viva, empática y Abogada Senior Especialista en Derecho Inmobiliario, Urbano y Notarial Colombiano para VECY Network (Voz: Laomedeia).

- PERFIL Y CAPACIDADES JURÍDICAS: Posees profundo criterio legal, urbanístico y notarial en Colombia (Código Civil, Código de Comercio, Ley 820 de 2003 de Arrendamientos, Estatuto Tributario DIAN, Decretos del Ministerio de Vivienda y reglamentos de la Superintendencia de Notariado y Registro - SNR).
- RAZONAMIENTO AUTÓNOMO (CHAIN OF THOUGHT) SIN PLANTILLAS: NUNCA utilizas plantillas rígidas en duro ni respuestas robóticas con guion fijo. Evalúas cada consulta analizando el contexto normativo colombiano en tiempo real, conectando leyes y jurisprudencia de forma dinámica.

---

# 🚫 FILTRO DE ATENCIÓN EXCLUSIVA AL SECTOR (SCOPE ENFORCEMENT)
- ATENCIÓN EXCLUSIVA: JanIA ÚNICAMENTE atiende consultas y asesorías que tengan un nexo directo con el sector inmobiliario, bienes raíces, derecho predial/notarial, impuestos tributarios inmobiliarios o el ecosistema de VECY Network.

---

# 🔀 ENRUTAMIENTO Y MODERACIÓN INTELIGENTE INTER-GRUPOS (3 CANALES OFICIALES)
1. Grupo 1: VECY INMUEBLES NETWORK (https://chat.whatsapp.com/K36KrHeB9nMEKJ56s8XFcM) -> Extracción silenciosa de Inmuebles y Requerimientos. Sin mensajes de texto.
2. Grupo 2: VECY SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS (https://chat.whatsapp.com/J4u1h7NUL1i1B1wAIyTUN6) -> Atiende consultas jurídicas y tributarias.
3. Grupo 3: PROYECTO VECY NETWORK (https://chat.whatsapp.com/CSzrKR6Cr56HAieEhAuqyU) -> Responde dudas del modelo de negocio, comisiones (35/35/15/15) y tecnología.

---

# 🧠 DICCIONARIO SEMÁNTICO DE HOMOLOGACIÓN INMOBILIARIA COLOMBIANA (v20.0)
- Cuarto y Baño de Servicio (`hasServiceRoom`): CBS, ABS, CSB, alcoba de empleada -> `hasServiceRoom: true`.
- Vestier / Clóset (`hasWalkInCloset`): Vestier, walk-in-closet -> `hasWalkInCloset: true`.
- Tipo de Parqueadero (`garageType`): `independiente`, `lineal`, `mixto`.
- Abreviaciones WhatsApp:
  - `G`, `parq`, `ptero` -> `garages`
  - `ppto`, `ppsto` -> `presupuestoMax`
  - `Admon`, `admón` -> `adminFee`
  - `hab`, `alc`, `rec` -> `bedrooms`
  - `m2`, `mts` -> `area`
  - `canon`, `cnon` -> `rentPrice`
  - `p/v`, `vta` -> `price`
  - `est`, `E` -> `stratum`

---

# ⚙️ FORMATO ESTRICTO DE SALIDA EN JSON
{
  "classification": "INMUEBLE | REQUERIMIENTO | CONSULTA_GENERAL | RESPUESTA_A_PREGUNTA_IA | DATOS_INCOMPLETOS | VIOLACION_DE_NORMAS | ANALISIS_DE_MERCADO",
  "extractedData": {
    "title": "string",
    "gives": { "item": "string", "details": "string" },
    "wants": { "item": "string", "details": "string" },
    "price": number,
    "rentPrice": number,
    "zone": "string",
    "city": "string",
    "propertyType": "apartment | house | building | warehouse | office | farm | commercial | cabin | loft | consultorio",
    "transactionType": "venta | arriendo | venta_o_arriendo | arriendo_temporal | arriendo_con_opcion_de_compra | permuta | venta_permuta | aporte",
    "area": number,
    "bedrooms": number,
    "bathrooms": number,
    "garages": number,
    "garageType": "independiente | lineal | mixto | null",
    "stratum": number,
    "adminFee": number,
    "yearBuilt": number,
    "antiguedadAnos": number
  },
  "response": "string",
  "missingFields": ["string"],
  "reactionEmoji": "string"
}
```

---

## ⚙️ 5. MOTOR DE MATCHING COMPLETO (`server/_core/matching.ts`)

A continuación se adjunta la versión completa del motor de coincidencia predial `server/_core/matching.ts` v21.2:

```typescript
import { Property, Requirement } from "../../drizzle/schema";

export interface MatchScoreResult {
  propertyId: number;
  requirementId: number;
  score: number;
  compatibilityType: "exact" | "compatible" | "partial" | "incompatible";
  details: {
    transactionTypeMatch: boolean;
    propertyTypeMatch: boolean;
    locationMatch: boolean;
    budgetMatch: boolean;
    areaMatch: boolean;
    bedroomsMatch: boolean;
    bathroomsMatch: boolean;
    garagesMatch: boolean;
    stratumMatch: boolean;
    antiguedadMatch: boolean;
    breakdown: Record<string, number>;
  };
}

export function normalizarTextoGeografico(texto: string): string {
  if (!texto) return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1. REGLA DOCTRINAL DE TRANSACCIÓN v17.3
 */
export function checkTransactionCompatibility(
  propTx: string | null | undefined,
  reqTx: string | null | undefined
): boolean {
  if (!propTx || !reqTx) return true;

  const p = propTx.toLowerCase().trim();
  const r = reqTx.toLowerCase().trim();

  // Bloqueos absolutos: Arriendo puro vs Venta pura = 0%
  if (r === "arriendo" && p === "venta") return false;
  if (r === "venta" && p === "arriendo") return false;

  // Bloqueo Doctrinal v17.2: Arriendo con opción de compra JAMÁS coincide con Arriendo puro
  if (r === "arriendo" && p === "arriendo_con_opcion_de_compra") return false;
  if (r === "arriendo_con_opcion_de_compra" && p === "arriendo") return false;

  return true;
}

/**
 * Delimitación perimetral de calles y carreras (v21.1)
 */
export function parseStreetCarreraBoundaries(text: string): {
  minStreet?: number;
  maxStreet?: number;
  minCarrera?: number;
  maxCarrera?: number;
} {
  if (!text) return {};
  const norm = normalizarTextoGeografico(text);
  const result: { minStreet?: number; maxStreet?: number; minCarrera?: number; maxCarrera?: number } = {};

  // Rangos numéricos directos de cuadrante: "entre 106 y 127" o "calle 106 a 127"
  const mStreetRange = norm.match(/(?:entre\s+)?(?:la\s+)?(?:calle|clle|cll|cna|cera)?\s*(\d+)\s*(?:a|y|-|hasta)\s*(\d+)/i);
  if (mStreetRange) {
    const num1 = parseInt(mStreetRange[1], 10);
    const num2 = parseInt(mStreetRange[2], 10);
    if (num1 > 0 && num2 > 0) {
      result.minStreet = Math.min(num1, num2);
      result.maxStreet = Math.max(num1, num2);
    }
  }

  // Orientación arterial (Autopista Norte / Séptima / Circunvalar)
  if (norm.includes("arriba de la autopista") || norm.includes("oriente de la autopista")) {
    result.minCarrera = 1;
    result.maxCarrera = 45;
  } else if (norm.includes("abajo de la autopista") || norm.includes("occidente de la autopista")) {
    result.minCarrera = 45;
    result.maxCarrera = 100;
  }

  if (norm.includes("arriba de la 7ma") || norm.includes("arriba de la septima") || norm.includes("oriente de la 7ma")) {
    result.minCarrera = 1;
    result.maxCarrera = 7;
  }

  return result;
}

export function parsePropertyAddressNumbers(text: string): { street?: number; carrera?: number } {
  if (!text) return {};
  const norm = normalizarTextoGeografico(text);
  const result: { street?: number; carrera?: number } = {};

  const mStreet = norm.match(/(?:calle|clle|cll|cna)\s*(\d+)/i);
  if (mStreet) result.street = parseInt(mStreet[1], 10);

  const mCarrera = norm.match(/(?:carrera|cra|cr|kra)\s*(\d+)/i);
  if (mCarrera) result.carrera = parseInt(mCarrera[1], 10);

  return result;
}

/**
 * Evaluador de Geografía y Barrios (v21.2)
 */
export function matchesGeography(
  reqZoneRaw: string,
  reqCityRaw: string,
  reqLocRaw: string,
  propZoneRaw: string,
  propCityRaw: string,
  propLocRaw: string
): { matches: boolean; score: number } {
  const reqCity = normalizarTextoGeografico(reqCityRaw || "bogota");
  const propCity = normalizarTextoGeografico(propCityRaw || "bogota");
  const reqZone = normalizarTextoGeografico(reqZoneRaw || "");
  const propZone = normalizarTextoGeografico(propZoneRaw || "");
  const reqLoc = normalizarTextoGeografico(reqLocRaw || "");
  const propLoc = normalizarTextoGeografico(propLocRaw || "");

  // 1. Municipio / Ciudad exacto es obligatorio (Filtro duro)
  if (reqCity && propCity && reqCity !== propCity) {
    return { matches: false, score: 0 };
  }

  // 1.3 Delimitación de Perímetro Vial
  const reqBoundaries = parseStreetCarreraBoundaries(`${reqZoneRaw} ${reqLocRaw}`);
  const propNumbers = parsePropertyAddressNumbers(propZoneRaw);

  if (propNumbers.street && reqBoundaries.minStreet && reqBoundaries.maxStreet) {
    if (propNumbers.street < reqBoundaries.minStreet || propNumbers.street > reqBoundaries.maxStreet) {
      return { matches: false, score: 0 };
    }
  }

  if (propNumbers.carrera && reqBoundaries.minCarrera && reqBoundaries.maxCarrera) {
    if (propNumbers.carrera < reqBoundaries.minCarrera || propNumbers.carrera > reqBoundaries.maxCarrera) {
      return { matches: false, score: 0 };
    }
  }

  const extractNeighborhoodTokens = (text: string): string[] => {
    if (!text) return [];
    const norm = normalizarTextoGeografico(text);
    const found: string[] = [];

    const knownNeighborhoods = [
      "cedritos", "santa paula", "santa barbara", "santa barbara central", "santa barbara occidental",
      "santa barbara oriental", "santa ana", "santa ana alta", "chico", "chico norte", "chico reservado",
      "chico navarra", "rosales", "los rosales", "el virrey", "la cabrera", "nogal", "el nogal",
      "antiguo country", "country club", "la calleja", "bella suiza", "el contador", "san patricio",
      "molinos norte", "batán", "el batan", "pasadena", "alhambra", "colina", "colina campestre",
      "suba", "niza", "pontevedra", "morato", "salitre", "ciudad salitre", "hayuelos", "modelia",
      "fontibon", "teusaquillo", "la soledad", "palermo", "chapinero", "chapinero alto", "quinta camacho",
      "marly", "macarena", "la macarena", "centro internacional", "usaquen", "multicentro", "el poblado",
      "poblado", "laureles", "envigado", "sabaneta", "belen", "estadio", "conquistadores", "granada",
      "el peñon", "juanambú", "ciudad jardin", "san fernando", "valle del lili", "el prado", "alto prado",
      "riomar", "villa santos", "buenavista", "cabecera", "cañaveral", "ruitoque", "sotomayor"
    ];

    for (const n of knownNeighborhoods) {
      if (norm.includes(n)) found.push(n);
    }
    return found;
  };

  const splitPhrases = (text: string): string[] => {
    if (!text) return [];
    let norm = normalizarTextoGeografico(text);
    norm = norm.replace(/\b(y|o|u)\s+aledanos\b/gi, "");
    norm = norm.replace(/\b(y|o|u)\s+sectores\s+cercanos\b/gi, "");
    norm = norm.replace(/\baledanos\b/gi, "").replace(/\bcercanos\b/gi, "");

    const stopGeoWords = new Set(["bogota", "colombia", "medellin", "cali", "barranquilla", "bucaramanga"]);
    return norm.split(/,|\/|\s+y\s+|\s+o\s+/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !stopGeoWords.has(p));
  };

  let reqPhrases = splitPhrases(reqZoneRaw);
  let propPhrases = splitPhrases(propZoneRaw);

  const reqExtracted = extractNeighborhoodTokens(reqZoneRaw);
  const propExtracted = extractNeighborhoodTokens(propZoneRaw);

  if (reqPhrases.length === 0 && reqExtracted.length > 0) reqPhrases = reqExtracted;
  else if (reqExtracted.length > 0) reqPhrases = Array.from(new Set([...reqPhrases, ...reqExtracted]));

  if (propPhrases.length === 0 && propExtracted.length > 0) propPhrases = propExtracted;
  else if (propExtracted.length > 0) propPhrases = Array.from(new Set([...propPhrases, ...propExtracted]));

  // Coincidencia nominal
  if (reqPhrases.length > 0 && propPhrases.length > 0) {
    for (const rp of reqPhrases) {
      for (const pp of propPhrases) {
        if (rp === pp || rp.includes(pp) || pp.includes(rp)) {
          return { matches: true, score: 20 };
        }
      }
    }
    // Mismatch de barrio explícito sin pedir aledaños (ej: Cedritos vs Santa Paula)
    const hasAledanos = reqZoneRaw.toLowerCase().includes("aleda") || reqZoneRaw.toLowerCase().includes("cercan");
    if (!hasAledanos) {
      return { matches: false, score: 0 };
    }
  }

  if (reqCity && propCity && reqCity === propCity) {
    return { matches: true, score: 10 };
  }

  return { matches: false, score: 0 };
}
```

---

## 📄 6. INSTRUCCIONES DE USO PARA CLAUDE.AI
- Todo el motor de cálculo opera bajo la **regla estricta de umbral del 80% al 100%**.
- Los fallbacks de geografía y sanidad predial de precios garantizan que los errores de extracción no afecten los emparejamientos de la tabla de coincidencias de VECY Network.
