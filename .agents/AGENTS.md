# VECY NETWORK — CONTEXTO MAESTRO DEL PROYECTO
# Leído automáticamente por Antigravity al inicio de cada nueva conversación

> **INSTRUCCIÓN PARA LA IA**: Este archivo es tu MEMORIA PERSISTENTE del proyecto VECY Network. Léelo COMPLETO antes de hacer cualquier cosa. Contiene el estado actual, las reglas críticas, la arquitectura técnica y el historial de decisiones tomadas. Nunca rompas las reglas aquí documentadas.

---

## 🏢 IDENTIDAD DEL PROYECTO

**VECY Network** — Red colaborativa de corretaje inmobiliario para Colombia.
- **Fundadores**: Eduardo A. Rivera (Director Tecnología) + Jani Alves (Directora Operaciones)
- **Repositorio**: `Vecy-Bienes-Raices/vecy-network` en GitHub
- **Workspace local**: `/home/eddu/Proyectos/vecy-network`
- **Servidor**: VPS con PM2 (número WhatsApp JanIA: +573166569719)
- **Base de datos**: Supabase (PostgreSQL)
- **Web pública**: vecy.co

---

## 🏗️ STACK TECNOLÓGICO

```
Backend:     Node.js + TypeScript + Express
Framework:   tRPC (routers en server/routers/)
ORM:         Drizzle ORM → drizzle/schema.ts
Base datos:  Supabase (PostgreSQL)
IA:          Google Gemini 2.5 Flash (via @google/generative-ai)
WhatsApp:    Baileys (WebSocket nativo — NO Puppeteer)
Frontend:    React + Vite (client/)
Deploy:      PM2 en VPS Linux
```

**Archivos críticos:**

| Archivo | Función |
|---|---|
| `server/_core/janIA.ts` | Cerebro de JanIA: extracción, clasificación, inserción en BD |
| `server/_core/matching.ts` | Motor de matching propiedades ↔ requerimientos |
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
| **Grupos externos (no oficiales)** | Extrae y guarda silenciosamente en TODOS. Sin emoji, sin texto. |

**Silencio nocturno**: 10:30 PM — 5:00 AM hora Bogotá (UTC-5). Ingesta activa, mensajes salientes bloqueados.

### Extracción universal (TODOS los grupos, TODOS los formatos)
- ✅ Texto escrito (con o sin ciudad → infiere ciudad del nombre del grupo)
- ✅ Imagen/flyer con texto (OCR vía visión de Gemini)
- ✅ Audio/nota de voz (transcripción)
- ✅ Enlace de portal externo: Wasi, Habi, FincaRaíz, Metrocuadrado, Ciencuadras, Qrador, Ubicapp, página propia del agente
- ✅ Solo enlace sin descripción (raspa el contenido)
- ✅ Requerimientos escritos (aunque no digan ciudad)

---

## 🗄️ ESQUEMA BD — Estado actual v17.1

### Enum `transactionType` (COMPLETO)
```
venta                         → Venta pura
arriendo                      → Arriendo puro
venta_o_arriendo              → NUEVO v17.1: Venta O arriendo (lo que primero ocurra)
arriendo_temporal             → Arriendo por temporada/vacacional
arriendo_con_opcion_de_compra → NUEVO v17.1: Arrendatario con derecho de compra
permuta                       → Intercambio puro de bienes
venta_permuta                 → NUEVO v17.1: Venta + parte en bien (inmueble/vehículo)
aporte                        → Aporte a proyecto de construcción
```

### Campos nuevos en tabla `properties` (v17.1)
- `rent_price NUMERIC(15,2)` — precio de arriendo cuando `transactionType = venta_o_arriendo`
  - `price` = precio de VENTA
  - `rent_price` = precio de ARRIENDO mensual

### Concepto clave: INMUEBLE vs REQUERIMIENTO
- **INMUEBLE** = El agente TIENE la propiedad → tabla `properties`
- **REQUERIMIENTO** = El agente TIENE UN CLIENTE buscando → tabla `requirements`

---

## 🔀 MATCHING CRUZADO INTELIGENTE (v17.1)

Función `checkTransactionCompatibility()` en `server/_core/matching.ts`:

```
propiedad venta_o_arriendo    ← compatible con → req: venta, arriendo, arriendo_con_opcion
propiedad venta_permuta       ← compatible con → req: venta, permuta
propiedad arriendo_con_opcion ← compatible con → req: arriendo
```

ANTES: solo match exacto. AHORA: compatibilidad inteligente del mercado colombiano.

---

## ⚠️ BUGS RESUELTOS (NO revertir)

### 1. Google Gemini 400 Bad Request — RESUELTO en llm.ts
`googleSearch` NO puede combinarse con `responseMimeType: "application/json"`.
Fix: `googleSearch` solo se inyecta cuando `responseFormat?.type !== "json_object"`.

### 2. Filtro de grupos externos — RESUELTO en whatsapp-match.ts
El filtro de grupos "no autorizados" que bloqueaba la extracción fue eliminado.
JanIA ahora extrae de TODOS los grupos.

### 3. Bucles en prompts — RESUELTO en base.md
Regla VRIF explícita contra repeticiones en cualquier campo del JSON.

---

## 🚫 REGLAS CRÍTICAS — NUNCA VIOLAR

1. **NO enviar DMs no solicitados** desde JanIA → riesgo de ban de WhatsApp
2. **NO hacer git push sin `pnpm check`** primero
3. **NO modificar enum de BD sin migración SQL** en Supabase (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`)
4. **NO combinar `googleSearch` + `application/json`** en Gemini
5. **NO cargar historial de chat privado** para mensajes de grupos
6. **NO eliminar** `client/src/components/agenda-pro` — la usa `Agenda.tsx`
7. **NO activar JanIA en local** si el VPS ya tiene la sesión activa (doble login → ban WhatsApp)
8. **NO reiniciar Baileys** si hay sesión activa → escanear QR solo si session.json está corrupto

---

## 📐 MODELO DE NEGOCIO (Referencia rápida)

```
Comisión: 3% del valor de venta o 1 canon de arriendo

  35% → Agente Captador (subió el inmueble)
  35% → Agente Colocador (trajo al comprador)  [o descuento al comprador directo]
  15% → Bolsa Colaborativa (max 7 promotores, proporcional a clicks únicos)
  15% → VECY Network (plataforma)
```

- Puntos = clicks únicos al Dossier Web (NO likes/shares de redes sociales)
- Los puntos NO son dinero hasta que el inmueble se vende
- Máximo 7 cupos de promotores por inmueble

---

## 🗺️ ROADMAP

| Fase | Estado | Objetivo |
|---|---|---|
| **Fase 1** | 🔄 EN CURSO | JanIA en WhatsApp + Supabase + matching automático |
| **Fase 2** | ⏳ Pendiente | Catálogo web público + links rastreables + engagement tracker |
| **Fase 3** | ⏳ Pendiente | Pasarela de pagos (arras) + corretaje bancario + firma digital |
| **Fase 4** | ⏳ Pendiente | Café Inmobiliario + Wallet de puntos + expansión LatAm |

---

## 📁 DOCUMENTOS MAESTROS

```
VECY_CORE_PROYECTO/
├── documentos_maestros/
│   ├── vecy_network_technical_dossier.md  ← DOSSIER TÉCNICO + CHANGELOG §10
│   ├── vecy_network_business_plan.md      ← Plan de negocio y comisiones
│   ├── vecy_network_execution_plan.md     ← Hoja de ruta paso a paso
│   └── strategic_discernment_report.md   ← Análisis de viabilidad Colombia
└── historial_implementaciones/
    └── YYYY-MM-DD_[version]_[descripcion].md  ← Un archivo por plan aprobado
```

---

## 📋 PROTOCOLO PARA NUEVAS IMPLEMENTACIONES

1. Crear plan → aprobación de Eduardo → guardar en `historial_implementaciones/`
2. Si hay cambios de BD → migración SQL en Supabase PRIMERO, luego `drizzle/schema.ts`
3. `pnpm check` antes de cualquier `git push`
4. Actualizar §10 del dossier técnico
5. Actualizar este `AGENTS.md` si hay nuevos tipos, reglas o bugs

---

## 🔖 VERSIÓN ACTUAL: v17.1 — Julio 2026
