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
| `server/_core/matching.ts` | Motor de matching propiedades ↔ requerimientos (v17.2) |
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

---

## 🗄️ ESQUEMA BD — Estado actual v17.2

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

---

## 🔀 MATCHING CRUZADO INTELIGENTE (v17.2 — REGLAS DOCTRINALES)

Función `checkTransactionCompatibility()` en `server/_core/matching.ts`:

```
venta                         ← compatible con → req: venta, venta_o_arriendo, venta_permuta
arriendo                      ← compatible con → req: arriendo, venta_o_arriendo
arriendo_con_opcion_de_compra ← compatible con → req: arriendo_con_opcion_de_compra, venta_o_arriendo
permuta                       ← compatible con → req: permuta, venta_permuta
```

> ⚠️ **REGLA CRÍTICA DOCTRINAL (v17.2)**: `arriendo_con_opcion_de_compra` **JAMÁS coincide con `arriendo` puro ni `venta` pura**.
> Un propietario o cliente que busca opción de compra no acepta un arriendo simple. Únicamente coincide con `arriendo_con_opcion_de_compra` o con `venta_o_arriendo`.

---

## 📐 VECY MATCHING THRESHOLD (85% - 100%)

- **Filtro Mínimo de Almacenamiento y Muestreo**: Todo Match DEBE tener un score igual o superior a **85%**. Cualquier par con score inferior a 85% es ignorado y eliminado de la BD.
- **Ventana de Opciones de Filtro UI**:
  - `85% — Mínimo VECY (85%+)`
  - `90% — Coincidencia Alta`
  - `95% — Casi Perfecto`
  - `100% — Match Perfecto`
- **Alineación Visual de la Tabla de Cotejo**:
  - Columna Izquierda: **Ofrecido (Oferta / Inmueble)**
  - Columna Derecha: **Buscado (Demanda / Requerimiento)**

---

## ⚠️ BUGS RESUELTOS (NO revertir)

### 1. Google Gemini 400 Bad Request — RESUELTO en llm.ts
`googleSearch` NO puede combinarse con `responseMimeType: "application/json"`.

### 2. Filtro de grupos externos — RESUELTO en whatsapp-match.ts
JanIA extrae de TODOS los grupos.

### 3. Proxy Vercel a VPS — RESUELTO en vercel.json
`vercel.json` apunta a `https://vecy-jania.serveousercontent.com` (Servidor VPS vivo).

---

## 🔖 VERSIÓN ACTUAL: v17.2 — Julio 2026
