# 🏢 VECY Network (v31.79)

> **Red colaborativa e inteligente de corretaje inmobiliario para Colombia.**

VECY Network es una plataforma que integra inteligencia artificial (JanIA - Google Gemini 2.5 Flash), automatización de WhatsApp (Baileys WebSocket) y un motor de matching cruzado con escala continua decimal (80.00% - 100.00%), tolerancia cero a no-coincidencias, tablas de cotejo dinámicas con persistencia permanente en base de datos y enrutamiento a Inmuebles StandBy para protección de comisión 50/50.

---

## 🏗️ STACK TECNOLÓGICO

- **Frontend:** React 19 + Vite 7 + Tailwind CSS + Lucide Icons + Wouter
- **Backend:** Node.js + Express + tRPC v11
- **Base de Datos:** PostgreSQL 17.11 + PostGIS 3.6.4 (Nativo en VPS) + Drizzle ORM (`drizzle/schema.ts`)
- **Inteligencia Artificial:** Google Gemini 2.5 Flash (`@google/generative-ai`)
- **WhatsApp Bot:** Baileys WebSocket Nativo (`@whiskeysockets/baileys`) en VPS vía PM2 (`+573192919978`)
- **Deploy:** PM2 en VPS Linux (`vecy.co` / `13.140.149.144`) + Vercel (Frontend Estático / SPA Routing)

---

## 📁 ESTRUCTURA DEL PROYECTO

```
vecy-network/
├── client/                     # Aplicación Frontend React + Vite
│   ├── src/
│   │   ├── components/         # Componentes UI (Navbar, Footer, Admin, etc.)
│   │   ├── pages/              # Páginas de la aplicación (Home, Login, Admin, etc.)
│   │   ├── lib/                # Conectores (Supabase, tRPC, utilidades)
│   │   └── main.tsx            # Punto de entrada y proveedor de tRPC/React Query
├── server/                     # Servidor Backend Node.js + Express
│   ├── _core/                  # Núcleo del servidor
│   │   ├── janIA.ts            # Cerebro de JanIA (extracción LLM, almacenamiento)
│   │   ├── matching.ts         # Motor de matching VECY (v17.9H)
│   │   ├── whatsapp-match.ts   # Bot de WhatsApp Baileys y despacho de mensajes
│   │   └── index.ts            # Servidor HTTP / tRPC / Express
│   └── routers/                # Enrutadores tRPC
├── drizzle/                    # Esquemas y migraciones de BD
│   └── schema.ts               # Fuente de verdad del esquema Supabase (PostgreSQL)
├── shared/                     # Esquemas Zod y tipos compartidos (Frontend <-> Backend)
├── VECY_CORE_PROYECTO/         # Documentos maestros del proyecto
│   └── documentos_maestros/    # Dossier Técnico Maestro v17.9H
└── vercel.json                 # Configuración de despliegue SPA & API Proxy para Vercel
```

---

## ⚡ INSTALACIÓN Y CONFIGURACIÓN

### 1. Requisitos Previos
- Node.js >= 20.x
- pnpm / npm

### 2. Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz tomando como referencia `.env.example`:

```env
DATABASE_URL="postgresql://user:password@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://user:password@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

GEMINI_API_KEY=tu-gemini-api-key
JWT_SECRET=tu-jwt-secret
```

### 3. Comandos Útiles

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (Frontend + Backend)
npm run dev

# Validar tipos TypeScript en todo el proyecto
npx tsc --noEmit

# Compilar para producción
npm run build

# Iniciar servidor compilado en producción
npm start
```

---

## 🤖 REGLAS DE COMPORTAMIENTO DE JANIA POR GRUPO DE WHATSAPP (v17.9H)

| Grupo | Comportamiento |
|---|---|
| **Grupo 1: VECY INMUEBLES NETWORK** | Silencio absoluto de texto. Extrae, guarda en Supabase, reacciona con emoji (`👍` oferta / `📝` requerimiento / `❓` datos incompletos). |
| **Grupo 2: SOPORTE LEGAL, TRIBUTARIO Y AVALÚOS** | Conversación activa (texto + notas de voz). Asesoría jurídica, impuestos DIAN y avalúos comercial/catastral. |
| **Grupo 3: PROYECTO VECY NETWORK** | Conversación activa. Explicación del modelo de negocio, comisiones (35/35/15/15) y bonos. |
| **Grupos Externos (No Oficiales)** | Extracción silenciosa, almacenamiento en Supabase y reacción con emoji (`👍` / `📝` / `❓`). Sin mensajes de texto. |

---

## 🔖 MOTOR DE MATCHING VECY (v17.9H)

- **Filtro Duro:** Transacciones incompatibles (Arriendo vs Venta) resultan en **Score 0%**.
- **Regla Doctrinal:** `arriendo_con_opcion_de_compra` **NUNCA** coincide con `arriendo` puro.
- **Filtro de Metraje:** `propArea >= reqAreaMin * 0.98`.
- **Filtro de Teléfono (0B):** Ambas partes (`properties` y `requirements`) deben tener teléfono registrado.
- **Umbral Mínimo:** Todos los matches guardados o visualizados deben ser **$\ge 85\%$**.

---

## 📝 LICENCIA & DERECHOS

**VECY Network © 2026** — Todos los derechos reservados. Eduardo A. Rivera & Jani Alves.
