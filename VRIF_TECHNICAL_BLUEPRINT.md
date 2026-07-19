# VRIF: BLUEPRINT DE ARQUITECTURA TÉCNICA INTEGRAL (VRIF v2.0)
*Especificación de Software, Modelado de Datos y Diseño del Ecosistema de Razonamiento Transaccional*

---

## INTRODUCCIÓN

Este documento constituye la **Arquitectura Técnica Integral** (Blueprint) para la implementación de referencia del **VECY Real Estate Intelligence Framework (VRIF)**. Traduce los principios y axiomas de la Constitución v2.0 y las fichas analíticas de la Especificación Formal en una especificación de software estructurada en capas, DDD y desacoplada de la tecnología de bases de datos o de proveedores de modelos específicos.

---

## 1. ARQUITECTURA GENERAL DEL SISTEMA

El sistema se diseña bajo un patrón de **Arquitectura Hexagonal (Puertos y Adaptadores)** combinada con **CQRS (Command Query Responsibility Segregation)** para garantizar el desacoplamiento de la infraestructura y maximizar la escalabilidad.

### 1.1 Diagrama de Capas Lógicas

```
  [ CLIENT CLIENTS ] (WhatsApp B2B/B2C Gateway - Baileys WebSocket)
          │
          ▼ (HTTP / tRPC / WebSocket)
  ┌────────────────────────────────────────────────────────┐
  │ 1. ADAPTADORES DE INFRAESTRUCTURA (Capa de Ingesta)    │
  │    • WhatsApp Message Listener Router                  │
  │    • JSON Webhook Handler                              │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼ (Commands / Queries)
  ┌────────────────────────────────────────────────────────┐
  │ 2. SERVICIOS DE APLICACIÓN (Casos de Uso)              │
  │    • IngestChatMessageUseCase                          │
  │    • EvaluateMatchOpportunitiesUseCase                 │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼ (Domain Core Interface)
  ┌────────────────────────────────────────────────────────┐
  │ 3. CAPA DE DOMINIO (VRIF Core & Domain Entities)       │
  │    • Agregados: Operation, Asset, Broker               │
  │    • Servicios de Dominio: ViabilityAssessor (IVC)     │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼ (Ports Implementation)
  ┌────────────────────────────────────────────────────────┐
  │ 4. CAPA DE INFRAESTRUCTURA (Persistencia y Búsqueda)    │
  │    • PostgreSQL Drizzle Adapter (Dato Estructural)     │
  │    • Vector Database pgvector Adapter (Similitud)      │
  │    • BullMQ Task Queue (Mensajería Asíncrona)          │
  │    • Gemini LLM API Adapter (Cognición)                │
  └────────────────────────────────────────────────────────┘
```

---

## 2. ARQUITECTURA DDD (BOUNDED CONTEXTS)

El sistema se descompone en cinco Bounded Contexts independientes con sus respectivos agregados y modelos de persistencia:

```
  ┌─────────────────────────┐         ┌─────────────────────────┐
  │   CollaborationContext  │ ──────► │    NegotiationContext   │
  │   (Baileys, Ingesta)    │         │      (PCO, PCI, CVO)    │
  └─────────────────────────┘         └────────────┬────────────┘
                                                   │
                                                   ▼
  ┌─────────────────────────┐         ┌─────────────────────────┐
  │       TrustContext      │ ◄────── │     MatchingContext     │
  │   (Reputación Brokers)  │         │   (IVC Juicio, UAC)     │
  └─────────────────────────┘         └────────────┬────────────┘
                                                   │
                                                   ▼
                                      ┌─────────────────────────┐
                                      │     LearningContext     │
                                      │     (TACC, Memoria)     │
                                      │                         │
                                      └─────────────────────────┘
```

### 2.1 Detalle de Contextos
*   **Collaboration Context**: Gestiona la escucha en grupos y DMs. Su agregado principal es `RawMessage`. Exporta eventos de tipo `ChatMessageReceived`.
*   **Negotiation Context**: El núcleo del estado de la transacción. Sus agregados principales son `Operation` (PCO) y `Asset` (PCI). Mantiene la invariante de la `Historia Cognitiva` y transiciona el `CVO`.
*   **Matching Context**: Orquesta la Facultad de Juicio. Consume perfiles `PCO` y `PCI` para calcular el `IVC` y verificar el `UAC`.
*   **Trust Context**: Monitorea el comportamiento observable del corredor para recalibrar el `Capital de Confianza`.
*   **Learning Context**: Almacena de forma asíncrona la retroalimentación de visitas e interacciones físicas, poblando la `Memoria Comercial` del sistema.

---

## 3. DISEÑO DEL DOMINIO (DOMAIN MODEL)

```
        ┌────────────────────────────────────────────────────────┐
        │                 Agregado: Operation                    │
        │  - id: UUID                                            │
        │  - client: ClientEntity                                │
        │  - broker: BrokerEntity                                │
        │  - status: CVOState (Enum)                             │
        │  - intent: TIOType (Enum)                              │
        │  - vdc: VDCCollection (Value Object)                   │
        │  - history: CognitiveHistoryCollection (Value Object)  │
        └────────────────────────────────────────────────────────┘
```

### 3.1 Clases y Objetos de Valor Principales
*   **AssetInstance (Entity)**: Subclase de la abstracción `Asset`. Para el dominio inmobiliario, expone atributos físicos y de linderos.
*   **VDCCollection (Value Object)**: Mapa inmutable de variables divididas por Nivel de Adaptabilidad.
*   **NCC (Value Object)**: `value: number` en el rango $[0, 1]$ asociado a un atributo.
*   **ECC (Value Object)**: `value: number` calculado mediante ponderación media de NCCs.
*   **IVCScore (Value Object)**: Representa el resultado cualitativo y cuantitativo del dictamen.

---

## 4. MODELO DE DATOS POSTGRESQL (DRIZZLE ORM SCHEMAS)

A continuación se detalla la especificación de tablas PostgreSQL utilizando la sintaxis exacta de TypeScript con **Drizzle ORM**:

```typescript
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

// 1. Tabla de Brokers (TrustContext)
export const brokers = pgTable('brokers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.80').notNull(),
  cooperationHistory: jsonb('cooperation_history').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. Tabla de Clientes (NegotiationContext)
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  contactInfo: varchar('contact_info', { length: 150 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 3. Tabla de Activos - Inmuebles (Domain Asset Instance)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // 'inmueble', 'vehiculo', etc.
  latitude: decimal('latitude', { precision: 9, scale: 6 }),
  longitude: decimal('longitude', { precision: 9, scale: 6 }),
  physicalAttributes: jsonb('physical_attributes').notNull(), // area, alcobas, baños
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 4. Tabla de Operaciones (PCO/PCI)
export const operations = pgTable('operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id),
  brokerId: uuid('broker_id').references(() => brokers.id).notNull(),
  assetId: uuid('asset_id').references(() => assets.id), // Nullable si es PCO de demanda
  role: varchar('role', { length: 10 }).notNull(), // 'PCO' (Demanda) o 'PCI' (Oferta)
  status: varchar('status', { length: 30 }).notNull(), // CVO State: 'Necesidad', 'Perfilado', etc.
  intent: varchar('intent', { length: 30 }).notNull(), // TIO: 'habitar', 'rentabilizar', etc.
  vdcData: jsonb('vdc_data').notNull(), // Variables Nivel 1 a 4 y sus respectivos NCC
  ecc: decimal('ecc', { precision: 3, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 5. Tabla de Evidencias (Core Evidence)
export const evidences = pgTable('evidences', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceType: varchar('source_type', { length: 30 }).notNull(), // 'whatsapp', 'escritura', 'pdf'
  fileUrl: varchar('file_url', { length: 255 }),
  textPayload: varchar('text_payload'),
  trustWeight: decimal('trust_weight', { precision: 3, scale: 2 }).notNull(),
  capturedAt: timestamp('captured_at').defaultNow().notNull()
});

// 6. Tabla de Negociaciones
export const negotiations = pgTable('negotiations', {
  id: uuid('id').primaryKey().defaultRandom(),
  operationId: uuid('operation_id').references(() => operations.id).notNull(),
  assetId: uuid('asset_id').references(() => assets.id).notNull(),
  status: varchar('status', { length: 30 }).notNull(), // 'Propuesta', 'Activa', 'Cerrada', etc.
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 7. Tabla de Historia Cognitiva (Inmutable)
export const cognitiveHistory = pgTable('cognitive_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: varchar('target_type', { length: 30 }).notNull(), // 'operation', 'asset'
  targetId: uuid('target_id').notNull(),
  fieldName: varchar('field_name', { length: 50 }).notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  evidenceId: uuid('evidence_id').references(() => evidences.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
```

---

## 5. ESQUEMAS DE ENTIDADES (PERFILES)

Para el almacenamiento flexible de datos no estructurados inferidos en los perfiles `PCO` y `PCI` dentro de `vdc_data`, se define la siguiente especificación JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VDCDataSchema",
  "type": "object",
  "properties": {
    "nivel1_bloqueantes": {
      "type": "object",
      "properties": {
        "ciudad": { "type": "string" },
        "tipo_negocio": { "type": "string", "enum": ["venta", "arriendo"] },
        "tipo_activo": { "type": "string" }
      },
      "required": ["ciudad", "tipo_negocio", "tipo_activo"]
    },
    "nivel2_preferentes": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z0-9_]+$": {
          "type": "object",
          "properties": {
            "valor": { "type": "any" },
            "ncc": { "type": "number", "minimum": 0, "maximum": 1 }
          },
          "required": ["valor", "ncc"]
        }
      }
    },
    "nivel3_adaptables": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z0-9_]+$": {
          "type": "object",
          "properties": {
            "valor": { "type": "any" },
            "ncc": { "type": "number", "minimum": 0, "maximum": 1 }
          },
          "required": ["valor", "ncc"]
        }
      }
    },
    "nivel4_emocionales": {
      "type": "object",
      "patternProperties": {
        "^[a-zA-Z0-9_]+$": {
          "type": "object",
          "properties": {
            "valor": { "type": "any" },
            "ncc": { "type": "number", "minimum": 0, "maximum": 1 }
          },
          "required": ["valor", "ncc"]
        }
      }
    }
  },
  "required": ["nivel1_bloqueantes", "nivel2_preferentes", "nivel3_adaptables", "nivel4_emocionales"]
}
```

---

## 6. EVENTOS DEL DOMINIO

La comunicación entre Bounded Contexts se realiza mediante coreografía basada en eventos. 

### 6.1 Catálogo de Eventos del Dominio
*   `EvidenceIngestedEvent`: Emitido por `CollaborationContext` al registrar y categorizar un nuevo mensaje de WhatsApp.
*   `ProfileMutatedEvent`: Emitido por `NegotiationContext` al actualizar variables de un PCO o PCI en la base de datos.
*   `ConflictDetectedEvent`: Emitido por `NegotiationContext` cuando el Algoritmo de Deliberación detecta discrepancias de fuerza equivalente.
*   `MatchEvaluatedEvent`: Emitido por `MatchingContext` tras calcular el IVC.
*   `NegotiationClosedEvent`: Emitido por `NegotiationContext` al finalizar la escrituración/firma de arras.

---

## 7. CASOS DE USO (APPLICATION SERVICES)

*   `IngestChatMessage`: Ingesta el mensaje de WhatsApp, extrae metadatos y crea la entidad `Evidencia`.
*   `ProcessProfileExtraction`: Ejecuta la Facultad de Inferencia mediante LLM y actualiza `Operations` (PCO/PCI).
*   `ResolveAttributeConflict`: Aplica el algoritmo de resolución de contradicciones y rebaja el NCC.
*   `EvaluateMatchOpportunities`: Ejecuta la colisión del MIC sobre la base de datos y calcula el IVC para pares potencialmente compatibles.
*   `LogNegotiationFeedback`: Recibe retroalimentación de visitas físicas para recalibrar los vectores del TACC.

---

## 8. SERVICIOS DE APLICACIÓN

Actúan como los orquestadores transaccionales. Ejemplo en TypeScript (Pseudo-implementación del Pipeline):

```typescript
export class MessageIngestApplicationService {
  constructor(
    private readonly evidenceRepo: IEvidenceRepository,
    private readonly operationRepo: IOperationRepository,
    private readonly commandBus: ICommandBus
  ) {}

  async execute(command: IngestMessageCommand): Promise<void> {
    const evidence = new EvidenceEntity(command.payload);
    await this.evidenceRepo.save(evidence);

    // Despacha asíncronamente el procesamiento cognitivo
    await this.commandBus.dispatch(new ProcessExtractionCommand(evidence.id));
  }
}
```

---

## 9. SERVICIOS DE DOMINIO

### 9.1 ViabilityAssessorService (Facultad de Juicio)
Este servicio de dominio encapsula la lógica analítica abstracta para calcular el IVC entre una Operación de demanda ($PCO$) y una de oferta ($PCI$).
*   *Lógica*: Evalúa VDC de Nivel 1. Si no coinciden, retorna Dictamen E. Si coinciden, calcula afinidades cualitativas de VDC Nivel 2, 3 y 4, integra el Capital de Confianza e inyecta la atenuación por Incertidumbre Residual.

---

## 10. MOTOR DE MATCHING

El procesamiento del matching se segmenta en dos motores independientes para optimizar recursos:

### 10.1 Motor de Matching en Caliente (Real-time Delta)
*   **Frecuencia**: Síncrono al modificarse un PCO o PCI.
*   **Funcionamiento**: Evalúa únicamente el diferencial modificado contra una subconsulta indexada en memoria caché Redis de perfiles con VDC Nivel 1 compatibles. Es de baja latencia.

### 10.2 Motor de Matching Nocturno (Batch Execution)
*   **Frecuencia**: Cron programado diario (01:00 AM).
*   **Funcionamiento**: Cruza la matriz global de PCO y PCI activos, re-calcula el ECC basándose en la Vigencia Cognitiva depreciada de la jornada, y evalúa el comportamiento relacional de los brokers para actualizar el IVC global del ecosistema.

---

## 11. MOTOR DE EVIDENCIAS

### 11.1 Algoritmo de Degradación Temporal (Vigencia Cognitiva)
Calcula el NCC remanente de un atributo volátil $x_j$ transcurrido un tiempo $t$ (en días) desde su última confirmación:

$$NCC(x_j)_{t} = NCC(x_j)_{\text{inicial}} \times e^{-\lambda t}$$

*Donde el coeficiente de decaimiento temporal se calibra preliminarmente en $\lambda = 0.015$ (depreciación del 50% de la certeza a los 45 días sin confirmación).*

---

## 12. MOTOR DE APRENDIZAJE

*   **TACC Mercado**: Ejecuta análisis de regresión asíncrono sobre la tabla `cognitive_history` de operaciones cerradas exitosamente para actualizar los coeficientes $\beta_i$ de afinidad en el motor de juicio.
*   **TACC Relacional**: Escucha eventos `NegotiationClosedEvent` y actualiza la columna `trustScore` de la tabla `brokers` basándose en el historial de cancelaciones, demoras y veracidad de datos demostrada.

---

## 13. ARQUITECTURA DE PROMPTS PARA LOS LLM

Para garantizar la estructuración de la ingesta (Facultad de Comprensión) por parte de Gemini, se define la arquitectura de prompts mediante **Structured Outputs (JSON Schema)** de forma atemporal:

### 13.1 System Prompt Maestro de Inferencia
```
Estás actuando como la Facultad de Inferencia del VECY Real Estate Intelligence Framework.
Tu objetivo es realizar ingeniería inversa al mensaje B2B/B2C provisto para construir el perfil cognitivo de la operación (PCO o PCI).
Debes extraer estrictamente los datos físicos e inferir la intención TIO y las flexibilidades del cliente.
Si la información de un campo no es deducible, deja el campo nulo y asigna un NCC de 0.0. No asumas ni inventes.
Responde estrictamente utilizando el JSON schema provisto.
```

---

## 14. ARQUITECTURA RAG (RETRIEVAL-AUGMENTED GENERATION)

El subsistema RAG asiste en el soporte legal y la valoración predial catastral:
*   **Ingesta**: Documentos oficiales del POT de Bogotá y decretos de la Ley 820 de 2003 se segmentan en fragmentos de 512 tokens con solapamiento del 10%.
*   **Recuperación**: Ante consultas complejas, se realiza una búsqueda semántica de vectores, inyectando los fragmentos legales pertinentes en el contexto del modelo generativo.

---

## 15. ARQUITECTURA DE EMBEDDINGS

*   **Modelo de Referencia**: `text-embedding-004` (Google).
*   **Estrategia**: Normalización de vectores L2 previa a la persistencia. Se vectorizan descripciones de perfiles subjetivos, objeciones físicas y nombres de barrios colombianos para capturar equivalencias semánticas.

---

## 16. ARQUITECTURA VECTORIAL

*   **Tecnología**: Extensión `pgvector` en PostgreSQL.
*   **Índices**: Uso de índices **HNSW (Hierarchical Navigable Small World)** en la columna vectorial de descripciones funcionales para búsquedas rápidas con métrica de distancia de coseno.

---

## 17. API PÚBLICA (ADAPTADOR EXTERNO REST/GRAPHQL)

*   `POST /api/v1/operations`: Creación y publicación externa de perfiles.
*   `GET /api/v1/operations/:id/matches`: Consulta de oportunidades activas con dictamen superior a UAC.
*   `POST /api/v1/negotiations/:id/feedback`: Envío de retroalimentación de visitas.

---

## 18. API INTERNA (tRPC ROUTERS)

```typescript
import { procedure, router } from './trpc';
import { z } from 'zod';

export const appRouter = router({
  getBrokerStatus: procedure
    .input(z.object({ brokerId: z.string().uuid() }))
    .query(async ({ input }) => {
      // Retorna Capital de Confianza de brokers
      return { trustScore: 0.85 };
    }),
  evaluateIVCOnDemand: procedure
    .input(z.object({ pcoId: z.string().uuid(), pciId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      // Dispara el MIC de forma interactiva
      return { dictamen: 'A', score: 0.81 };
    })
});
```

---

## 19. PIPELINE COMPLETO DE PROCESAMIENTO

```
  [ WhatsApp Chat ] 
         │
         ▼ (Escucha WebSocket - Baileys)
  [ IngestChatMessage ] ──► Registra [ Evidencia (Fuerza de la Fuente) ]
         │
         ▼ (BullMQ Job)
  [ ProcessProfileExtraction (LLM + Structured JSON Output) ]
         │
         ▼
  [ ResolveAttributeConflict (Deliberación) ] ──► Actualiza [ PCO / PCI ] e Historia
         │
         ▼ (Event: ProfileMutatedEvent)
  [ EvaluateMatchOpportunities (pgvector + IVC Math) ]
         │
         ▼ (Compare: IVC >= UAC)
  [ Double Opt-In Notification ] ──► Envía a brokers (B2B WhatsApp Gateway)
```

---

## 20. ESTRATEGIA DE ESCALABILIDAD

Para soportar miles de corredores colaborando simultáneamente en tiempo real:
1.  **BullMQ + Redis**: Procesamiento asíncrono y encolado de la ingesta de WhatsApp y las consultas del LLM para evitar bloqueos del backend Express.
2.  **Particionado de Tablas**: Particionado de la tabla `cognitive_history` por rangos de fecha mensual.
3.  **Índices de pgvector**: HNSW para evitar búsquedas secuenciales lentas en la matriz global de activos.
4.  **Caché en Caliente**: Indexado de perfiles PCO activos con VDC Nivel 1 en Redis para filtrado instantáneo en la Facultad de Juicio.
