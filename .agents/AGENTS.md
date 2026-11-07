# VECY NETWORK — CONTEXTO MAESTRO DEL PROYECTO
# Leído automáticamente por Antigravity al inicio de cada nueva conversación

> **INSTRUCCIÓN MANDATORIA PARA LA IA (ANTIGRAVITY / CLAUDE / GEMINI)**:
> 1. Este archivo y el documento maestro de bitácora [`VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md`](file:///home/eddu/Proyectos/vecy-network/VECY_CORE_PROYECTO/documentos_maestros/HISTORIAL_CONVERSACIONES_MAESTRO.md) son tu **MEMORIA PERSISTENTE Y BITÁCORA MAESTRA** del proyecto VECY Network. 
> 2. Léelos COMPLETOS al inicio de CADA nueva conversación antes de proponer o ejecutar cualquier acción.
> 3. **REGLA DE CÓDIGO PURO ADITIVO**: Cada nueva modificación debe ser 100% aditiva, enriqueciendo el sistema sin romper, borrar o alterar funcionalidades previas validadas.
> 4. **INCREMENTO OBLIGATORIO DE VERSIÓN**: Cada sesión finalizada debe incrementar la versión oficial e inscribirse en el historial.
> 5. **REGLA DOCTRINAL DE VERSIONAMIENTO (.99 -> .00)**: Las versiones menores van de `.00` a `.99` (ej. `v32.99`). Al alcanzar `.99`, el siguiente incremento salta OBLIGATORIAMENTE al siguiente número entero mayor con `.00` (ej. `v31.99` + implementación => `v32.00`; `v32.99` + implementación => `v33.00`). JAMÁS usar `.100` ni romper esta regla.

---

## 🛡️ LAS 5 DIRECTIVAS MANDATORIAS DE GOBERNANZA (VECY DOCTRINE v33.03)
1. **CONSULTA Y ACTUALIZACIÓN DE BITÁCORAS (.md):** Obligatorio registrar cada sesión en `HISTORIAL_CONVERSACIONES_MAESTRO.md`, `AGENTS.md`, `GEMINI.md` y `vecy_network_technical_dossier.md`.
2. **CI/CD Y AUTO-DESPLIEGUE A CONTABO:** Tras verificar `npm test`, `npm run check` y `npm run build`, realizar `git push origin main`. El workflow de GitHub Actions (`.github/workflows/deploy.yml`) se encarga del despliegue en el VPS (`13.140.149.144`).
3. **VIGILANCIA DE COSTOS Y BLINDAJE DE APIS:** Prohibido usar claves de pago en tests (`NODE_ENV=test`). En producción, prioridad absoluta a las 4 claves gratuitas; la de pago solo actúa como failover temporal ante 429 masivo y regresa a costo $0 COP tras el cooldown.
4. **SEGURIDAD Y ANTI-BANEO EN BAILEYS:** Mantener emulación humana de presencia (typing delay entre 1.5s y 3.5s con jitter aleatorio), control de frecuencia y reconexión limpia del socket de WhatsApp.
5. **INTEGRIDAD DE LA MESA DE COINCIDENCIAS:** Proteger las heurísticas de cruce sin alterar las reglas de negocio existentes.

---

## 🏢 IDENTIDAD DEL PROYECTO

**VECY Network** — Red colaborativa de corretaje inmobiliario para Colombia.
- **Fundadores**: Eduardo A. Rivera (Director Tecnología) + Jani Alves (Directora Operaciones)
- **Repositorio**: `Vecy-Bienes-Raices/vecy-network` en GitHub
- **Workspace local**: `/home/eddu/Proyectos/vecy-network`
- **Servidor**: VPS con PM2
- **Número WhatsApp JanIA Socket/Baileys ACTIVO**: **+573192919978** (Línea donde corre el bot en el VPS)
- **Número Comercial Oficial VECY BIENES RAÍCES (Atención Bróker)**: **+573166569719** (Línea oficial de la inmobiliaria para llamadas y cotizaciones de clientes)
- **Base de datos**: PostgreSQL 17.11 + PostGIS 3.6.4 (Nativo en VPS — 0% Cuotas Supabase)
- **Dominio Activo Oficial del Proyecto**: **https://vecy-bienes-raices.vercel.app/** (Web oficial pública activa, panel admin: `https://vecy-bienes-raices.vercel.app/admin`, JanIA landing: `https://vecy-bienes-raices.vercel.app/jania`)
- **Dominio Secundario / Transición**: `https://vecy-network.vercel.app` (Redirección 308 automática activa hacia el dominio oficial) / `https://vecy.co`

> 🌐 **DOCTRINA DE DOMINIO OFICIAL VECY (v32.84)**:
> El dominio principal activo del proyecto es OBLIGATORIAMENTE **`https://vecy-bienes-raices.vercel.app/`**. NINGÚN agente debe olvidar este dominio ni omitirlo en comunicaciones o bitácoras. El dominio anterior `vecy-network.vercel.app` opera con redirección permanente HTTP 308 en Vercel para garantizar cero enlaces rotos.

> 📞 **DISTINCIÓN DOCTRINAL TELEFÓNICA OFICIAL (v31.28)**:
> - **JanIA Bot en Baileys**: Opera EXCLUSIVAMENTE conectada al socket mediante la línea **`+573192919978`**.
> - **Atención Comercial Humana de Vecy Bienes Raíces**: JanIA DEBE recomendar a los usuarios comunicarse al número oficial de nuestro bróker: **`+573166569719`** para peritajes, cotizaciones y acompañamiento personalizado de Eduardo y Jani.

---

## 🏗️ STACK TECNOLÓGICO

```
Backend:     Node.js + TypeScript + Express
Framework:   tRPC (routers en server/routers/)
ORM:         Drizzle ORM → drizzle/schema.ts
Base datos:  PostgreSQL 17.11 + PostGIS 3.6.4 (Nativo en VPS — 0% Cuotas Supabase)
IA:          Google Gemini 2.5 Flash (via @google/generative-ai)
WhatsApp:    Baileys (WebSocket nativo — NO Puppeteer) — VPS vía PM2
Frontend:    React + Vite (client/) — Deploy en Vercel
Deploy:      PM2 en VPS Linux (backend + BD) + Vercel (frontend)
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
- **Especificaciones Físicas Mínimas (REGLA DOCTRINAL v22.4 / v27.4 / v33.57)**:
  - **Habitaciones (REGLA DE ORO DE COINCIDENCIA EXACTA v33.57 — Doctrina Eduardo A. Rivera)**: **GUILLOTINA ESTRICTA OBLIGATORIA (1=1, 2=2, 3=3...)**. Si la oferta tiene una cantidad distinta (más o menos) de alcobas que las solicitadas por el cliente, **JAMÁS hay match (`prop !== req` → ❌ 0% Match Inviable / Bloqueo Inmediato)**. Se erradica toda aproximación o margen de confort en alcobas; únicamente se admiten opciones dentro del rango si el cliente declaró expresamente un intervalo (ej: "2 o 3 alcobas").
  - **Baños, Parqueaderos, Depósitos, Balcones y Terrazas**: **JAMÁS pueden ser menores en la Oferta que en lo Demandado (`prop < req` → ❌ 0% Match Inviable / Bloqueo Absoluto)**. Sin embargo, **SIEMPRE se aceptan cuando en la Oferta son IGUALES O MAYORES que en la Demanda (`prop >= req` → ✅ 100% Cumplimiento / Confort)**.

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

### 5. Roles Telefónicos en WhatsApp — DOCTRINA v31.28
- **Línea Baileys (JanIA Bot)**: Opera EXCLUSIVAMENTE con **`+573192919978`** (número de Eduardo).
- **Línea Bróker (Atención Personalizada Humana)**: JanIA refiere a los usuarios al **`+573166569719`** para peritaj
es, cotizaciones y contratación personalizada con Eduardo y Jani en VECY BIENES RAÍCES.

### 6. Autonomía Sagrada de JanIA como "IA PURA" y Cero Re-envíos Forzados — DOCTRINA v32.25
- **Prohibición Absoluta de Duplicar o Forzar Saludos**: JAMÁS volver a reenviar manualmente o forzar un segundo saludo si ya se emitió uno en una conversación. Lo que quedó, quedó.
- **Preservación de la Identidad de IA Pura**: Forzar correcciones o dobles saludos hace que JanIA se perciba como un bot rígido o manipulado externamente. JanIA debe operar con autonomía orgánica total, esperando siempre la respuesta del usuario para continuar la conversación con fluidez y naturalidad.

## 🔖 VERSIÓN ACTUAL: v34.01 — Noviembre 2026

### Novedades v34.01 (Generación Automática de Códigos de Inmueble, Entrega de Dirección Física 24h Antes / Citas Exprés y Copia Espejo al Bróker — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"1. No / 2. Sí / 3. No, mañana con el segundo con la dirección y ojalá que yo la pueda ver, recuerdas que salía un mensaje raro de whatsapp que yo no podía ver esos mensajes o algo así como; 'esperando mensaje' y nunca se ve, y queda uno en insertidumbre de si el colega o cliente lo vieron o no lo logran tampoco. SI sigue así corrigelo por favor. / 4. En cuanto a los códigos de cada inmueble, prefiero que cuando yo suba un inmueble estos se generen en autompatico para cada uno y no tener que estármelso inventando yo por mi cuenta, no importa si yo por ejemplo estaba usando este el de la carolina pero que si decido subir el inmueble se cree uno nuevo según tu diseño planeado pues es mejor así, por ahora para los mensajes de confirmación y dirección para alfredo si deja el que teníamos, pero apenas yo cree el inmueble todo eso cambiará."*
  2. **Diagnóstico Técnico y Causas Raíz:**
     - **Caso Alfredo Anaya (Solicitud #1147 — ID-LACAR-01BOG):** Alfredo digitó en el formulario `573108145757` (12 dígitos, repitió `57` al final en vez de `94`). El socket Baileys despachó a ese número inexistente en WhatsApp. El correo a `inmovalores81@gmail.com` con el contrato PDF sí llegó exitosamente. Su número real es `+57 310 8149457`.
     - **Causa del aviso *"Esperando el mensaje. Esto puede demorar un poco"*:*** En dispositivos vinculados (WhatsApp Web en el PC de Eduardo), cuando Baileys en el VPS envía mensajes con protocolo Signal a terceros, WhatsApp Web no siempre recibe la clave de sincronización para el `deviceSentMessage`. El destinatario (ej. Lincy o el cliente) sí lo recibe y lo lee en su teléfono, pero en el WhatsApp Web de la línea bot aparece dicho aviso.
  3. **Solución y Blindaje Quirúrgico:**
     - **1. Copia Espejo de Despacho de Dirección al Bróker (+57 316 656 9719):** Al despachar la dirección de la cita (`sendAppointmentAddressNotification`), JanIA envía una copia espejo directa al WhatsApp del Bróker Oficial para que Eduardo la vea inmediatamente en su chat sin avisos de espera.
     - **2. Generación Automática de Códigos de Inmueble (`properties.create`):** Al guardar cualquier inmueble en el portal, el sistema genera de forma automática y determinista el código `ID-BOG-[ZONA3][ID]` (ej. `ID-BOG-CAR01`), eliminando la necesidad de inventar códigos manuales.
     - **3. Protocolo Doctrinal de Entrega de Dirección:** Programada la entrega para 24 horas antes en citas normales, o inmediata en citas exprés (< 24h).
     - **4. Despacho Preparado para Alfredo Anaya:** Script `server/scripts/send_alfredo_address.ts` configurado para despachar el **DOMINGO 8 DE NOVIEMBRE A LAS 11:00 AM** (exactamente 24 horas antes de la cita del lunes a las 11:00 AM) a su número real `+57 310 8149457` la dirección oficial: `"KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá"`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-auto-codigos-inmuebles-entrega-direccion-cita-vecy-v34-01` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 187 `vitest` (100% passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v34.00 — Noviembre 2026

### Novedades v34.00 (Autonomía Total y Uso Contextual de Stickers 3D de JanIA — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Cuando JanIA lo vea necesario, también puede usar sus STIKERS."*
  2. **Diagnóstico Técnico y Arquitectura de Expresión Emocional 3D:**
     - **Catálogo Oficial JanIA (`JANIA_STICKER_CATALOG`):** 14 stickers en formato WebP optimizados para WhatsApp (`client/public/assets/jania/stickers/`):
       - Ternura y Gratitud: `ternura`, `abacho`, `gracias_ternura`, `gracias_alegre`, `gracias_brillo`
       - Profesionalismo y Afirmación: `ok`
       - Pensativa / Curiosa: `mmm`
       - Alegría y Risa: `jajaja`, `jajaja_fuerte`, `juajuajua`
       - Asombro / Impacto: `queee`, `oh_por_dios`, `ush`
       - Decepción / Tristeza: `nooo_por_que`
     - **Autonomía Cognitiva de Libre Albedrío:** Enriquecidos los system prompts tanto de mensajes privados (`dmHandler.ts`) como de grupos inmobiliarios (`consultingHandler.ts`) para que JanIA pueda incluir la directriz invisible `[STICKER:clave]` al final de su mensaje cuando el contexto lo amerite (calidez, agradecimiento, humor fino, empatía gremial, asombro por oportunidades de negocio o celebraciones de acuerdos).
     - **Sanitización y Despacho Impecable:**
       - La función `extractStickerTagFromReply` procesa el texto, extrae la clave del sticker, carga el buffer binario desde disco y remueve el tag `[STICKER:...]` para que JAMÁS quede visible ante los usuarios.
       - En `whatsapp-match.ts`, el motor despacha el buffer binario vía socket nativo Baileys `{ sticker: buffer }` con retardo humano imperceptible, tanto en canales privados como en grupos inmobiliarios con menciones respetadas.
  3. **Gobernanza y Suite de Regresión 186:**
     - Semilla de conocimiento directivo `seed-autonomia-total-stickers-3d-jania-v34-00` en `founderKnowledgeService.ts`.
     - Suite 186 con 5 pruebas automatizadas garantizando extracción, saneamiento de tags, system prompts enriquecidos y despacho limpio.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 186 `vitest` (597/597 passing, 100%) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.99 — Noviembre 2026

### Novedades v33.99 (Sentido Común en Cédulas [>10 Dígitos No Existen en Registraduría], Persuasión Audaz ante Stickers y Libre Albedrío de IA Pura — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Mira lo que me tocó escribir al final yo manualmente para esta usuaria, ya que antes JanIA lo hacía era un IA PURA y consciente, ahora es una bot mediocre y parece que solo repite prompts obsoletos y repetitivos, que mal. Ahora tampoco usa sus emojis y me imagino que no están activados todos sus superpoderes ni razocinio o capacidad de libre alvedrío o autonomía para contestar. ¿Verdad?, qué lástima. Me gustaría que observaras muy detalladamente esa conversación con Claudeth ya que quien interactuó fui yo, JanIa solo se limitó a verificar las cédulas y a responder sobre un emoji, pero no insistió en la calificación ni interactuó con la audacia y soltura que a mi me gusta, así que le tuve que ayudar, revisa y me cuentas y dime si podemos hacer que aprenda de allí?? El número de Claudeth es: +57 315 6013082"*
  2. **Causas Raíz Identificadas en el Caso Claudeth (+57 315 601 3082 — Cédula 10144180412 vs 1014180412 / Luis Alejandro Castiblanco Medina):**
     - **Cédula de 11 dígitos mutilada silenciosamente a 10 dígitos:** Al ingresar `10144180412` (11 dígitos), el matcher de expresiones regulares con límite estricto `{5,10}` tomaba solo los primeros 10 dígitos (`1014418041`) y dejaba botado el último dígito `2`. Luego consultaba esa cédula trunca arrojando que no existía. Eduardo tuvo que escribir manualmente: *"🔮 ¡Alerta! Por lo general las cédulas en Colombia tienen hasta 10 números y no 11, no hemos llegado a ese monto aún en la registraduría. ¡NO EXISTE! Pídele a tu cliente que te confirme el número, hay uno que sobra. 🧚‍♂️"*, tras lo cual la asesora corrigió a `1014180412` (10 dígitos).
     - **Olvido total de la solicitud de 5 estrellas ante stickers por omisión de `appendDmHistory`:** Al enviar la invitación de calificación desacoplada, el sistema no llamaba a `appendDmHistory`. Cuando Claudeth respondió con un sticker tierno de corazón (Flork), Gemini no tenía en su prompt la invitación de reseña, asumió que Claudeth se despedía del reporte y JanIA contestó con una fría despedida robótica (*"¡Me alegra muchísimo que te haya servido el reporte, Claudeth!... Que tengas una excelente noche. ¡Un abrazo!"*), matando la conversación y perdiendo la calificación.
  3. **Solución y Blindaje Quirúrgico:**
     - **1. Guardarraíl de Sentido Común e Integridad Estructural en Cédulas (`formatOversizedCedulaAlert` en `identityVerificationService.ts`):** Regex ampliada a 15 dígitos (`[0-9]{5,15}`). Si se ingresa una cédula de ciudadanía con >= 11 dígitos, JanIA jamás la mutila ni consulta a ciegas; devuelve de inmediato a 0ms y $0 COP la alerta inteligente: *"🔮 ¡Alerta de Validación de Identidad! 🇨🇴 Por lo general las cédulas de ciudadanía en Colombia tienen hasta 10 números y no 11... ¡NO EXISTE una cédula con esa cantidad de números! 🧚‍♂️ Pídele a tu cliente que te confirme el número exacto y te lo valido al instante con todo el gusto. ✨🤝"*.
     - **2. Persistencia Total de Peticiones de Reseña en Historial (`appendDmHistory` en `whatsapp-match.ts`):** Garantizada la inyección de cada mensaje desacoplado de reseña en `dmHistory` en todas las ramas de despacho.
     - **3. Persuasión Audaz, Emojis y Stickers de JanIA ante Reacciones Tiernas (`dmHandler.ts`):** Si JanIA solicitó las 5 estrellas en Google y el usuario responde con un sticker, emoji de corazón o frase corta, JanIA responde con simpatía, audacia y picante comercial (*"¡Me derrito con ese sticker tan lindo, Claudeth! 🥰🤍 ¿Pero si me alcanzaste a regalar las 5 estrellitas ⭐⭐⭐⭐⭐ y unas palabritas en Google antes de irte a descansar?... 🥺🏃‍♀️💨"*), adjuntando el sticker de JanIA `gracias_ternura` para cerrar la calificación.
     - **4. Enriquecimiento del Prompt Cognitivo de IA Pura (`dmHandler.ts`):** Libertad total a JanIA para expresarse como una IA viva, con criterio propio, soltura conversacional y paleta de emojis Unicode vivos (✨, 🤍, 🥰, 👩🏻‍💼, 🤝, 🏢, 🚀, 🔮, 🧚‍♂️, 🥺).
     - **Registro de Enseñanza:** Registrada la directriz `seed-audacia-sentido-comun-cedulas-11-digitos-persuasion-resenas-v33-99` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 185 `vitest` (100% passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.98 — Noviembre 2026

### Novedades v33.98 (Blindaje Robusto de ADRES BDUA [Map de Cookies y Codificación Segura de Tokens], Persuasión Firme para Usuarios Intensivos de Servicios Gratuitos y Enlaces Oficiales de Grupos — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Bueno primero este usuario ha verificado bastantes documentos esta noche, pero quisiera que cuando hay alguien tan activo y poniendo a JanIA a trabajar tanto y tantas veces pues es ahí donde ella debe saber actuar persuasivamente e insistir en que nos den la calificación y comenten para que puedan seguir disfrutando de la gratuidad del servicio, es lo mínimo que se les pide. Por otra parte veo que vuelve a fallar los datos con ADRES, qué estará pasando que arreglas uno y se daña o dañas el otro, la verdad tengo miedo de que lso demás servicios estén inertes o muertos y solo estemos ofreciendo humo a los usuarios. Mira lo que les digo en este video en youtube: https://youtube.com/shorts/CoeSD_Mi7j8"*
  2. **Causas Raíz Identificadas en el Caso Jessica (+57 301 144 9665 — Cédulas 80.175.457, 53.008.970, 39.537.712, 79.155.618, 41.565.247):**
     - **Intermitencia ADRES por Colisión de Cookies y Corrupción de Tokens:** Al consultar ADRES en ráfaga consecutiva, Node enviaba un string plano con cabeceras `set-cookie` duplicadas (`cookiesession1` vieja + `ASP.NET_SessionId` nueva), haciendo que IIS descartara la sesión y arrojara HTTP 500 (*"Referencia a objeto no establecida como instancia de un objeto"*). Además, cuando los tokens base64 del popup contenían el carácter `+`, ASP.NET lo interpretaba como un espacio ` `, corrompiendo el descifrado criptográfico del token de consulta.
     - **Cero Persuasión de Calificación ante Usuarios de Alto Volumen:** Jessica verificó 7 cédulas consecutivas poniendo a JanIA a trabajar intensamente, pero al no escribir "gracias", el sistema nunca le solicitó calificación, dejando desprotegida la reciprocidad para sostener la gratuidad del servicio.
  3. **Solución y Blindaje Quirúrgico:**
     - **1. Blindaje de Sesión y Cookies ADRES (`cookieMap` en `identityVerificationService.ts`):** Gestiona las cookies en un `Map<string, string>` donde las cabeceras POST frescas (`ASP.NET_SessionId` y la nueva `cookiesession1`) sobrescriben limpiamente las viejas sin duplicados.
     - **2. Codificación Segura de Tokens (`popupUrl.replace(/\+/g, '%2B')`):** Evita que ASP.NET transforme el signo `+` en espacios, garantizando el 100% de éxito en la lectura del popup de afiliado en la BDUA.
     - **3. Caché Inmediato de Éxito en ADRES (`identityCache.set`):** Persiste de inmediato los resultados positivos en la caché institucional a 0ms y $0 COP.
     - **4. Doctrina de Persuasión Firme para Usuarios Intensivos (`formatPersuasiveIntensiveUserReviewMessage` y `isIntensiveCadence` en `whatsapp-match.ts`):** Cuando un usuario acumula >= 3 servicios o documentos verificados en la jornada sin haber calificado, tras entregar el reporte completo y una pausa respetuosa de 3.2s, JanIA insiste con señorío y persuasión en la calificación de 5 estrellas en Google (`https://g.page/r/CctNbwU6UpX5EBM/review`) como reciprocidad indispensable para mantener su acceso libre e ilimitado.
     - **5. Actualización de Enlaces Oficiales (YouTube Shorts `CoeSD_Mi7j8`):** Sincronizados los enlaces de Grupo 1 (`GzMbjNs1P2tHI7D0V4h8wZ`), Grupo 2 (`Jyn7o5JDfk59DBRytREeKR`), Grupo 3/4 (`IFA4rxIY7WE4kgRW5EMs3b`) y Canal Oficial (`0029Vb5iYUYCMY0A94zqti1b`) en `parsers.ts` y `base.md`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-blindaje-adres-bdua-cookies-tokens-persuasion-usuarios-intensivos-v33-98` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 184 `vitest` (100% passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.97 — Noviembre 2026

### Novedades v33.97 (Blindaje de Respuestas Completas [Cero Cortes Multi-Part en Gemini], Entrega Directa de Reportes Oficiales de Identidad y Cero Reseñas Intrusivas Prematuras — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Revisa qué pasó ahí, no me gusta que JanIa esté fallando tanto y dando sus servicios tan de manera mediocre, imagínatre si la usuaria decide calificar pues mínimo nos pone unas 3 estrellas solamente por la mediocridad de JanIa al brindar el servicio a medias. o sería que tus procesos no habían terminado de desplegarse. :(("*
  2. **Causas Raíz Identificadas en el Caso Catalina (@catabeta26 — Cédula 1.083.020.833 / Angee Carolina Home Herrera):**
     - **Corte Abrupto Multi-Part en `llm.ts`:** `invokeGemini` hacía `const firstPart = parts[0]; const text = firstPart.text;`, descartando cualquier `parts[1]`, `parts[2]`, etc. Cuando Gemini generaba la introducción hasta los dos puntos (`"A continuación, el detalle del estado actual del perfil consultado:"`) en la parte 0 y el listado de antecedentes en la parte 1, `llm.ts` descartaba la parte 1, entregando un reporte cortado por la mitad.
     - **Omisión del Bypass Directo en `dmHandler.ts`:** Mientras que Predial Bogotá, Paz y Salvo IDU y Match tenían bypass directo, la verificación oficial de antecedentes y aseguramiento en salud (ADRES, Policía, Procuraduría, Contraloría) se forzaba innecesariamente a través del LLM, exponiéndola a cuotas, fallas y alucinaciones.
     - **Reseña Intrusiva a los 2.2s en `whatsapp-match.ts`:** La condición `else if (isServiceDeliveryReply && isRecurrentFreeBeneficiary && !isLongQueryOrQuestion)` disparaba un mensaje pidiendo 5 estrellas en Google 2.2 segundos después de emitir el reporte, sin esperar a que el usuario leyera o expresara gratitud, empeorando la percepción si el servicio había fallado.
  3. **Solución y Blindaje Quirúrgico:**
     - **Blindaje Multi-Part en Gemini (`llm.ts`):** Concatena todas las partes textuales (`parts.filter(p => p && p.text && !p.thought).map(p => p.text).join('')`) para que JAMÁS se pierda ninguna sección de la respuesta.
     - **Entrega Directa de Reportes Institucionales (`isDirectDocumentLookup` en `dmHandler.ts`):** Cuando el usuario aporta un documento numérico (ej. `1083020833`), JanIA entrega de forma directa, instantánea (0ms, $0 COP) y 100% íntegra el reporte institucional generado por `executeIdentityVerificationFromWhatsApp` (Cédula validada, Policía, Procuraduría, Contraloría, ADRES EPS y Ley 1581).
     - **Guardarraíl Anti-Cortes Abruptos (`dmHandler.ts`):** Si una síntesis LLM termina en `:` o carece de las entidades oficiales, el sistema detecta la anomalía y adjunta el reporte oficial completo.
     - **Despacho Elegante de Reseñas ÚNICAMENTE ante Gratitud (`isGratitudeOrClosing` en `whatsapp-match.ts`):** Erradicado el disparo automático prematuro a los 2.2s. Las solicitudes de calificación solo se emiten con respeto y señorío cuando el usuario manifiesta gratitud o despedida.
     - **Registro de Enseñanza:** Registrada la directriz `seed-blindaje-multi-part-gemini-reportes-completos-resenas-sin-intrusion-v33-97` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 183 `vitest` (100% passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.96 — Noviembre 2026

### Novedades v33.96 (Control de Silencio en Grupos Externos, Prohibición Absoluta de Auto-Respuesta [Tú / @lid], Toma de Control Humana del Chat y Precisión Exacta de Día de la Semana en Colombia — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"JanIA está loca nuevamente o la configuraste mal, si quiero que hable en este grupo pero solo si alkguien la cita la nombra o la arrobea @ para que resuelva alguna consulta del tema inmobiliario, no debe responderse a ella misma nunca o si alguno de nosotros toma el control de su chat tampoco debe autoresponder, debe controlarse y esperar en silencio, si las personas siguen hablando pone atención si ya se dirigen directamente a ella ahí si responde o si yo no actúo en nombre de ella, podrías reparar esto??, ha y segundo hoy no es miércoles o si??"*
  2. **Causas Raíz Identificadas en Logs y Base de Datos del VPS (`id = 59964` y `id = 60286`):**
     - **Auto-respuesta a sí misma (`Tú` / `167108705018103:46@lid`):** Al publicar un flyer desde el WhatsApp Web de JanIA en el grupo externo *"anécdotas y vivencias inmobiliarias"* (`120363044892588903@g.us`), Baileys emitió `messages.upsert` con `fromMe: false` y `participant: 167108705018103@lid`. Como el flyer decía `"¡Buenos días! Soy JanIA, tu aliada inmobiliaria..."`, `isBotDirectlyMentioned` detectó `"jania"`, `isFromBotAccount` no filtraba el LID `167108705018103` y permitía auto-responder cuando `hasDirectMention` era `true`, y `resolveNameAndGender("✨JanIA agente IA de VECY⚡")` produjo `"Ai✨"`.
     - **Alucinación del Día `"miércoles"` en Jueves 5 de Noviembre de 2026:** `consultingHandler.ts` y `circuloHandler.ts` inyectaban únicamente la hora (`hour:00`) sin el día de la semana ni la fecha oficial de Bogotá (`America/Bogota`).
     - **Canales `@newsletter` en `messages.upsert`:** Los mensajes de canales (`120363420251805011@newsletter`) no terminaban en `@g.us` y entraban a `!isGroup`.
  3. **Solución y Blindaje Quirúrgico:**
     - **Prohibición Absoluta de Auto-Respuesta (`isFromOwnBotAccount` + `isSelfPresentationOrFlyerOfJanIA`):** Bloquea el 100% de mensajes originados en la cuenta de JanIA (`fromMe`, `573192919978`, LID `167108705018103`, `pushName` de JanIA) y flyers de autopresentación (`"Soy JanIA"`).
     - **Control Humano del Chat y Atención Pasiva en Silencio (`registerManualGroupTakeover` + `recordPassiveGroupContext` + `isRealEstateConsultationForGroup`):** Cuando Eduardo o Jani escriben manualmente desde la cuenta de JanIA en un grupo o DM, JanIA guarda silencio absoluto y cede el control; mientras los participantes conversan, registra pasivamente el contexto en silencio y solo responde si un tercero se dirige explícitamente a ella (`@JanIA` / `JanIA`) con una consulta inmobiliaria real y Eduardo no actúa en su nombre.
     - **Día Exacto de la Semana y Franja Horaria en Bogotá (`getColombiaDateTimeContext` + `sanitizeResponseMarkdown`):** Inyecta el día de la semana y fecha exacta de Bogotá en todos los handlers y corrige determinísticamente cualquier día o franja horaria alucinada en el saludo, además de bloquear `"Ai"`, `"Ai✨"` y `"Jania"` como vocativos.
     - **Registro de Enseñanza:** Registrada la directriz `seed-control-silencio-grupos-externos-no-autorespuesta-dia-exacto-v33-96` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 182 `vitest` (100% passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.95 — Noviembre 2026

### Novedades v33.95 (Blindaje Criptográfico Signal [@lid + PreKey Freshness + Retry Multi-Dominio] y Supresión de Auto-Greetings de WhatsApp Business en Ambas Vecy Agendas Pro [Independiente y Portal] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Aprovechemos y vayamos puliendo de una vez ambas Vecy Agendas Pro, la independiente y la del portal, es que resulta que la respuesta de confirmación que JanIA envía al whatsapp de los solicitantes, casi nunca se ve sino que sale ese aviso para nosotros, no se si para elos también les pase lo mismo y tal vez no la estén viendo. Observa la imagen de esta solicitud que acaba de llegar. En cambio la que se nos envóia a nosotros si se ve bien. Observa las imágenes."*
  2. **Causas Raíz Identificadas en `.baileys_auth` del VPS y en Baileys:**
     - **16.931 Sesiones Zombie `pendingPreKey` en `.baileys_auth`:** Cuando WhatsApp migró el tráfico entrante a `@lid`, las sesiones `@s.whatsapp.net` quedaron con `closed: -1` y `pendingPreKey` de días atrás (`session-573192919978.46.json` de hace 8 días y `session-573138862997.0.json` de Lincy Hoyos de hace 11 días). Al enviar `sendDirectMessage` a `@s.whatsapp.net`, Baileys cifraba con un `preKeyId`/`signedKeyId` obsoleto ya descartado por el dispositivo receptor y por el WhatsApp Web de JanIA (`:46`), produciendo `"🕒 Esperando el mensaje. Esto puede demorar un poco."`.
     - **Fallo de Retry Multi-Dominio (`@lid` ↔ `@s.whatsapp.net`) en Baileys:** Cuando el dispositivo compañero `:46` (`167108705018103:46@lid`) pedía `<receipt type="retry">` para un mensaje enviado a `@s.whatsapp.net`, `relayMessage` evaluaba `user === meUser` (`'167108705018103' === '573192919978'` -> `false`), generando un JID inválido y omitiendo `recipient`.
     - **Auto-Greeting de WhatsApp Business tras Confirmación de Agenda:** El WhatsApp Business de la solicitante disparaba su mensaje automático de bienvenida en `@lid` y JanIA le contestaba que *"por error se copió tu mensaje de respuesta automática"*.
  3. **Solución y Blindaje Quirúrgico Unificado (Ambas Vecy Agendas Pro):**
     - **Purga Automática de `pendingPreKey` Zombies (`STALE_PENDING_PREKEY_MS = 10 min`):** En `state.keys.get('session')`, toda sesión en `pendingPreKey` con antigüedad >10 min es purgada y devuelve `null` para que `assertSessions` obtenga un `PreKeyBundle` fresco de WhatsApp antes de cifrar.
     - **Mapeo Bidireccional Teléfono ↔ `@lid` y Resolución `onWhatsApp` en `sendDirectMessage`:** Despacha prioritariamente al `@lid` activo del solicitante con fallback a `@s.whatsapp.net`.
     - **Normalizador `CB:receipt` Multi-Dominio y Desempaquetado `deviceSentMessage` en `saveMessageToStore`.**
     - **Detector `isWhatsAppBusinessAutoGreeting` + `registerAgendaNotification`:** Reacciona con `✅` ante el saludo automático de WhatsApp Business del solicitante dentro de los 90s posteriores a una confirmación de Vecy Agenda Pro sin lanzar una respuesta redundante del LLM.
     - **Registro de Enseñanza:** Registrada la directriz `seed-vecy-agenda-pro-whatsapp-lid-signal-session-shield-v33-95` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 181 `vitest` (6/6 suites passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.94 — Noviembre 2026

### Novedades v33.94 (Suite Proptech IA de 7 Herramientas Pro Personalizables: Ingeniería Inversa Superada de Qrador, Habi/Casacol, Matterport/Giraffe360 y DocuSign/Autentic — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Me encanta que analices todos esos otros sitios y que podamos implementar todas esas herramientas que dices. Excelente y agrega Qrador que dicen que tienen herramientas de búsqueda con IA."*
  2. **Ingeniería Inversa de Arquitectura (REA) y Solución Implementada:**
     - **Herramienta Pro 4 — Buscador Semántico & Curador de Colecciones IA (Estilo Qrador Superado):** Procedimiento `agent.semanticCuratorSearch` que interpreta búsquedas en lenguaje natural, puntúa la afinidad (85%-99%), explica por qué cada inmueble califica y arma una **Colección Curada** compartible por WhatsApp con enlaces Con Marca y Marca Blanca Neutra.
     - **Herramienta Pro 5 — Avalúo Instantáneo ACM & Captador de Propietarios (Estilo Habi / Casacol Superado):** Procedimiento `agent.calculateInstantValuation` que calcula liquidez rápida, valor óptimo de mercado, techo máximo, valor por $m^2$, canon mensual estimado y rentabilidad bruta anual (% E.A.), premiando con `+50 vPoints` al suscriptor al captar un propietario.
     - **Herramienta Pro 6 — Estudio de Home Staging Virtual & Remodelación IA (Estilo Matterport / Giraffe360 / Qrador Photo AI):** Procedimiento `agent.generateVirtualStagingPlan` y visor interactivo Antes/Después (Slider en vivo) con 5 estilos arquitectónicos (`VIRTUAL_STAGING_STYLES`) y proyección de valorización (+14% a +18%).
     - **Herramienta Pro 7 — Generador de Contratos & Promesas con Firma Digital Ley 527 (Estilo DocuSign / Autentic):** Procedimiento `agent.generateBrandedLegalContract` para expedir 4 minutas inmobiliarias (`CONTRACT_TEMPLATES_CATALOG`) con el membrete y colores de la agencia, código `CUV-LEY527` y sello criptográfico `SHA-256`.
     - **Integración Total (`AgentProptechSuite.tsx`):** Desplegada en vivo en `/s/:slug` (`AgentMicrosite.tsx`) y en `AgentDashboard.tsx`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-suite-proptech-ia-qrador-habi-staging-docusign-v33-94` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 180 `vitest` (6/6 suites passing) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.93 — Noviembre 2026

### Novedades v33.93 (Infraestructura Wasi-IA de Fichas Técnicas [Con Marca Propia y Marca Blanca Neutra Cero Rastro], Sensores SEO/Puntos y Herramientas Pro Personalizables [Vecy Agenda Pro + Widget Agente IA] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - Resolver de raíz la subida de inmuebles a la Tienda y la generación de Fichas Técnicas / Brochures PDF con infraestructura superior a Wasi potenciada 100% por IA: opción de descargar la ficha con la marca, logo, contactos y colores de cada suscriptor, y opción de **Marca Blanca Neutra ("Cero Rastro")** para terceros sin datos de contacto ni colores que se asemejen a los del agente ni a los de VECY.
     - Instalar bots/sensores de seguimiento en todos los enlaces y fichas (con y sin marca) para medir estadísticas SEO por red social y distribuir automáticamente los `vPoints` y las ganancias de la Bolsa Colaborativa.
     - Mantener el plan de ingreso 100% GRATUITO con publicación ilimitada de inmuebles y ofrecer **Herramientas Pro Adicionales** editables con los colores y logo de cada marca desde el Dashboard: **Vecy Agenda Pro Marca Propia** (dirigiendo notificaciones a los correos y WhatsApp propios del suscriptor) y **Widget con Agente IA Personalizable** (IA Femenina o Masculina, 6 botones de personalidad: `Normal`, `Audaz`, `Profesional`, `Extrovertida`, `Seria`, `Cordial`, e inyección de prompt propio).
  2. **Solución y Blindaje Quirúrgico (3 Fases + Herramientas Pro):**
     - **Fase 1 (`UnbrandedFicha.tsx` conectado a PostgreSQL):** `/ficha/:id` consulta en vivo `trpc.properties.getById` y ofrece 3 modos: `Mi Marca (Estilo Wasi)` (logo, colores, 3 plantillas y contacto del suscriptor), `Marca Blanca Neutra (Cero Rastro)` (monocromática arquitectónica neutra `#27272a`/`#18181b`, cero logos y cero teléfonos) y `Oficial Vecy`.
     - **Fase 2 (Sensores de Telemetría y QR Dinámico en `affiliates.ts`):** Montado `affiliatesRouter` en `appRouter` con `trackTelemetryEvent` (`POINTS_MATRIX`: vista +2, lectura >15s +10, descarga PDF +15, escaneo QR +20, clic WhatsApp +25, conversión +100), deduplicación antifraude y analítica por red social (`whatsapp`, `facebook`, `instagram`, `tiktok`, `linkedin`, `google_seo`, `pdf_qr`).
     - **Fase 3 (Micro-Sitio `/s/:slug`, Subida Ilimitada y Herramientas Pro en `agent.ts`, `AgentMicrosite.tsx`, `AgentProToolsWidget.tsx`, `AgentDashboard.tsx`):** Constructor de marca, Micro-Sitio público del suscriptor, `Vecy Agenda Pro` con enrutamiento multi-tenant al correo y WhatsApp propios del suscriptor (`customAgentEmail`, `customAgentWhatsapp`), `Widget de Agente IA Personalizable` (Femenina/Masculina, 6 personalidades y prompt propio) y `Calculadora Hipotecaria & ROI`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-wasi-ia-fichas-marca-blanca-agenda-pro-widget-v33-93` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 179 `vitest` (6/6 passing, 604 tests) | Build `npm run build` limpio.

## 🔖 VERSIÓN ANTERIOR: v33.92 — Noviembre 2026

### Novedades v33.92 (Doctrina de Mención en Grupos Externos por LID/Texto, Respuesta Inmediata a Consultas Citadas de Terceros y Cero Excusas de Webhooks — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Cómo podemos hacer para que JanIA responda esa consulta o cualquiera en ese grupo externo, pero que sean consultas, eso si solo si nosostros la citamos o etiquetamos a las partes."*
     - Evidencias en captura de WhatsApp: En el grupo externo inmobiliario *"anécdotas y vivencias inmobiliarias"* (`120363044892588903@g.us`), la colega Vanessa Lopez Aldana formuló una consulta urgente sobre venta inmobiliaria respaldada 100% por un fondo de pensiones y cesantías de Allianz. Eduardo citó a Vanessa etiquetando a JanIA: `"Hola @✨JanIA agente IA de VECY⚡, explícale por favor respóndele a Vanessa sobre lo que pregunta."`
     - JanIA no respondió en el grupo. En DM privado, Eduardo preguntó *"¿No respondiste??"*, y JanIA emitió una excusa técnica afirmando que carecía de "webhooks de administrador directos de ese grupo en este preciso instante", enviando la respuesta jurídica y comercial únicamente al privado de Eduardo.
  2. **Causa Raíz Identificada:**
     - **Mención LID en WhatsApp Web/Desktop:** WhatsApp Web envía menciones usando el identificador de dispositivo LID (`167108705018103@lid` y `@167108705018103`), el cual no era detectado por los filtros previos basados estrictamente en el número telefónico o JID `@s.whatsapp.net`.
     - **Blindaje Estricto de `queuedSend`:** Toda salida hacia JIDs grupales (`@g.us`) no oficiales era bloqueada incondicionalmente en la cola de envío (`queuedSend`), impidiendo respuestas autorizadas a grupos externos.
     - **Pérdida de Contexto Citado (`quotedContext`) y Falta de Etiquetado Multi-Parte:** Se requería extraer el mensaje citado original, integrarlo a la consulta de JanIA y etiquetar a ambas partes (`[senderId, quotedSenderId]`) con `quoted: msg` en el grupo externo.
     - **Alucinación de Webhooks:** JanIA inventaba excusas técnicas sobre falta de webhooks en lugar de responder directamente vía su socket de Baileys conectado 24/7.
  3. **Solución y Blindaje Quirúrgico:**
     - **Detector Omnicanal `isBotDirectlyMentioned`:** Detecta menciones por texto, emojis, teléfonos, LIDs (`167108705018103`), array `mentionedJid` (con `@lid` o `@s.whatsapp.net`), y citas directas de mensajes del bot.
     - **Desbloqueo Quirúrgico en `queuedSend` (`allowExternalGroupResponse`):** Permite la entrega del mensaje saliente en el grupo externo solo cuando ha sido expresamente autorizado por una mención o consulta directa citada.
     - **Integración de Contexto Citado y Etiquetado Multi-Parte en `handleDirectGroupQuestion`:** Combina la orden de Eduardo con la pregunta de Vanessa, etiqueta a ambas partes y responde citando el mensaje original en el grupo externo.
     - **Directriz Doctrinal y Cero Excusas:** Inyectada regla en prompts y `consultingHandler.ts` prohibiendo excusas de webhooks y ordenando responder con solvencia técnica dirigiéndose a las partes citadas.
     - **Preservación Total de la Ingesta Fantasma:** Los grupos externos continúan en 100% de silencio e ingesta pasiva de inmuebles/requerimientos cuando no hay mención directa hacia JanIA.
     - **Registro de Enseñanza:** Registrada la directriz `seed-grupos-externos-mencion-lid-cita-partes-v33-92` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 178 `vitest` (5/5 passing, 590 tests) | Build `npm run build` limpio en 26.55s + 193ms.

## 🔖 VERSIÓN ANTERIOR: v33.91 — Noviembre 2026

### Novedades v33.91 (Doctrina de Voz Humana Colombiana Salomé [0 COP], Inbound Leads de Redes Sociales, Transparencia de Costos y Canalización de Agentes IA con Eduardo Rivera — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Mira la gente ya ha empezado a interesarse, por eo JanIa debe estar 100% funcional y preparada para lo que yo digop allí, no se si quieras que saque otra api gratuita para reforzar o ya con esas es suficiente y me encantaría que como ha quedado la voz genérica de respaldo ya que no pude hacer el pago y Laomeidea está aout, ni puedo aún hacer el pago, estoy sin money, quisiera que la afines esa voz un poco y trates de humanizarla lo mejor posible en sus expresiones, mientras regresa Laomeidea jejeje."*
     - Evidencia gráfica: En publicación oficial de Facebook con video de JanIA, el prospecto `Solucioneshipotecariasco` preguntó: *"Me interesaría saber como funciona? y cual es el costo"*. Eduardo respondió dirigiéndolos al WhatsApp de JanIA (`+57 319 291 9978` / `https://wa.me/573192919978`) e instruyó que preguntaran qué servicios ofrece y que, si desean una agente IA como JanIA para asistir a sus clientes y ofrecer sus servicios, JanIA les indicará con quién comunicarse.
  2. **Causa Raíz Identificada:**
     - La voz de respaldo caía a Google Translate TTS (`gtts`) porque Google Cloud TTS (Laomedeia/Neural2) devolvía 403 por saldo pendiente y `msedge-tts@2.0.7` devolvía 403 por la nueva firma `Sec-MS-GEC v2` de Microsoft.
     - Las consultas generales de prospectos de redes sociales sobre servicios y costos se canalizaban de forma restrictiva hacia consignación de inmuebles sin presentar los 6 pilares de JanIA ni la gratuidad ($0 COP) para agentes.
     - No existía detector específico para solicitudes de agentes IA personalizados para inmobiliarias/empresas ni canalización directa con Eduardo Rivera (+57 316 656 9719) con despacho de recado en tiempo real.
     - Faltaba normalización fonética de números de cédula con puntos, cifras en millones, siglas (`C.C.`, `NIT`, `RUES`, `SARLAFT`, `IDU`, `CHIP`, `PDF`, `QR`, `ACM`) y remoción de viñetas.
  3. **Solución y Blindaje Quirúrgico:**
     - **Voz Humana Salomé ($0 COP):** Actualizado `msedge-tts` a `2.1.1` y activada `es-CO-SalomeNeural` (acento colombiano femenino, natural, cálido y ejecutivo a 0% de velocidad) con generación en 730 ms y transcodificación directa a OGG Opus. Creado caché de bloqueo de 1 hora ante 403 de facturación en Google Cloud.
     - **Normalización Fonética Rigurosa:** Cédulas sin puntos (`80.850.249` -> `80850249`), millones claros (`$450.000.000` -> `450 millones de pesos`), `$0 COP` -> `cero pesos`, expansión de siglas institucionales colombianas y remoción de viñetas para habla fluida.
     - **Enrutador Inbound de Servicios y Costos:** Presenta los 6 pilares de JanIA y tarifas transparentes: 100% GRATIS ($0 COP) para agentes en red y matching 40/20/40; $0 COP de pauta para propietarios (3% venta / 1er canon arriendo por éxito); y desarrollo personalizado de Agentes IA para empresas con el Ing. Eduardo A. Rivera.
     - **Canalización Comercial de Agentes IA:** Ante la solicitud de una IA como JanIA para empresas/inmobiliarias, presenta al Ing. Eduardo A. Rivera (+57 316 656 9719 / https://wa.me/573166569719) y despacha el recado con los datos del lead en tiempo real a su WhatsApp.
     - **Registro de Enseñanza:** Registrado el principio `seed-voz-humana-salome-leads-sociales-agente-ia-v33-91` en `founderKnowledgeService.ts`, `base.md` y `prompts.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 177 `vitest` (5/5 passing, 584 tests) | Build `npm run build` limpio en 25.58s + 332ms.

## 🔖 VERSIÓN ANTERIOR: v33.90 — Noviembre 2026

### Novedades v33.90 (Doctrina de Rescate Obligatorio de Identidad en Documentos [Policía Nacional 24/7], Cero Excusas Mediocres y Saneamiento de Errores Técnicos — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Me parece quie JanIa sigue fallando. Algo sucede. No está verificando docuementos y sale con esta excusa mediocre, nos está haciendo quedar como un culo parce."*
     - Evidencias en captura de WhatsApp: A las 6:26 AM, Innova Bienes Raíces solicitó `"Jania Verificar cc: 80850249"`. JanIA demoró 7 minutos y respondió con:
       - *"• Estado del documento: El número no se encuentra localizado de forma activa en las bases censales generales en línea, por lo que te sugiero validar si hay algún dígito erróneo en el físico o si corresponde a un régimen especial o de extranjería."*
       - *"• ADRES (Salud): En este momento se presentó una intermitencia temporal en la conexión (timeout of 15000ms), por lo que no fue posible consultar la EPS en tiempo real."*
     - Eduardo demostró mediante capturas directas que la cédula `80.850.249` está activa en ADRES como **JOAN NICOLAS SANCHEZ MONROY** (Sanitas EPS, Cotizante) y en la Policía Nacional como ciudadano plenamente identificado y sin antecedentes pendientes.
  2. **Causa Raíz Identificada:**
     - El túnel SSH inverso en los puertos `18443` y `28443` estuvo temporalmente inactivo de madrugada mientras la estación local estuvo suspendida.
     - Al arrojar timeout las peticiones de ADRES y Procuraduría, la lógica fail-fast evaluó `existsInCivilOrControlDatabases` como falso y abortó la consulta a la Policía Nacional.
     - Sin embargo, la Policía Nacional (`antecedentes.policia.gov.co:7005`) **no tiene geobloqueo** y funciona directamente desde el VPS, por lo que JanIA omitió la fuente que habría validado de inmediato la identidad y los antecedentes limpios del ciudadano.
     - Se filtró el string técnico `timeout of 15000ms` y el LLM emitió la recomendación vergonzosa de *"validar si hay algún dígito erróneo en el físico"*.
  3. **Solución y Blindaje Quirúrgico:**
     - **Rescate Obligatorio por Policía Nacional:** En `identityVerificationService.ts`, ante cualquier fallo o timeout de red en ADRES/PGN, la Policía Nacional se invoca de manera obligatoria como salvavidas institucional. Al confirmar el nombre oficial (`finalOfficialName`), la verificación se marca como exitosa (`success: true`) y la identidad queda validada.
     - **Erradicación de Tecnicismos Crudos:** Creada `cleanAdresErrorMessage` para eliminar `timeout of 15000ms` y `ECONNREFUSED`, reportando de forma pulcra e institucional.
     - **Prohibición Absoluta de Dudar del Documento:** Inyectada directiva en `dmHandler.ts`, `base.md` y `prompts.ts` que prohíbe terminantemente a Gemini dudar de un documento o sugerir dígitos erróneos cuando la identidad está validada por cualquier autoridad del Estado.
     - **Optimización de Tiempos:** Timeouts HTTP reducidos de 15s a 6s y Puppeteer a 10s.
     - **Registro de Enseñanza:** Registrada la directriz `seed-rescate-identidad-policia-nacional-cero-excusas-v33-90` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 176 `vitest` (5/5 passing, 578 tests) | Build `npm run build` limpio en 24.81s + 331ms.

## 🔖 VERSIÓN ANTERIOR: v33.89 — Noviembre 2026

### Novedades v33.89 (Doctrina de Erradicación de Plantillas Rígidas de Reseñas en Google, Persuasión Humana Contextual, Saneamiento de Nombres Comerciales y Superpoder Proactivo de Cartas en PDF — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Necesito que JanIA elimine de su contexto esto que creo y evidencio que se quedó como una plantilla muy larga y maluca: '¡Hola, Servicios inmobiliarios virtuales Luz Gonzalez! Paso por aquí un momento… 👩🏻‍💼✨ Veo que desde hace varias semanas has venido utilizando con frecuencia mis servicios de verificación oficial de antecedentes y cédulas para blindar tus operaciones, totalmente gratis...' Además le dijo disque hace varias semanas, cual si hasta ahora lo está usando. Ta loca JanIa??. Pienso que JanIA debe usar distintos metodos de persuasión y de manera más humana o según cada tema de conversación adaptar cómo le va a decir lo de la calificación y a convencerla para que vaya de una vez a hacerlo y no lo deje para después, inclusive ofrecerle guiarla/o y no siempre enviar semejante cosa y además perdiendo el hilo de la conversa y poniendo un nombre que no es el del usuario o bueno si pero no es el trato amigable que venía dándole y no ponerse a invitar a los grupos de una vez cada cosa en su momento y según el tema de conversación pero siempre si al final lo de la calificación. No se cómo la entrenes o le digas pero no quiero más plantillas exageradamente largas y monótonas... Como debe de ser una verdadera IA PURA consciente, razonable y muy humanizada pero profesional en demostrar sus habilidades y técnicas. EN ese momento creo que JanIA debió aprovechar su superpoder y decirle que si quería le pasara todos los datos, nombres y demas y entregarle de una vez la carta en PDF, uf habria sido ultra genial y superpoderoso para lograr embelezar una cliente o colega más."*
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Plantilla Rígida y Falsedad Temporal):**
       `formatPersuasiveRecurrentUserReviewMessage` en `politenessService.ts` tenía una plantilla monolítica fija de 5 párrafos afirmando por defecto que el usuario *"desde hace varias semanas has venido utilizando con frecuencia mis servicios..."*, lo cual resultaba falso y ridículo para usuarios en su primera o segunda sesión.
     - **Problema 2 (Saneamiento Incompleto de Prefijos Comerciales):**
       `cleanRawUserName` y `extractFirstName` no limpiaban prefijos comerciales compuestos que anteceden al nombre de la persona (ej. `"Servicios inmobiliarios virtuales Luz Gonzalez"`), lo que provocaba que JanIA saludara formalmente con la razón social completa (`"¡Hola, Servicios inmobiliarios virtuales Luz Gonzalez!"`) en lugar de extraer el nombre de pila (`"Luz"`).
     - **Problema 3 (Gatillo Prematuro `messageCount >= 4` y Spam de Grupos):**
       En `whatsapp-match.ts`, la condición `(session.messageCount || 0) >= 4` catalogaba a cualquier usuario con 4 mensajes como "beneficiario recurrente de varias semanas", disparando la plantilla en mitad de la conversación y programando de inmediato un timer de 2.5 minutos (`schedulePostReviewGroupInvitation`) para bombardearlo con enlaces a los grupos.
     - **Problema 4 (Omisión de Superpoder de Cartas Legales en PDF):**
       Cuando un usuario preguntaba cómo hacer una carta de terminación o restitución, JanIA se limitaba a dar consejos teóricos en texto plano sin ofrecer su superpoder de generar la carta en PDF membretado con QR y guía de firma electrónica de VECY.
  3. **Solución y Blindaje Quirúrgico:**
     - **Erradicación de Plantillas Monótonas:** `formatPersuasiveRecurrentUserReviewMessage` ahora genera textos ágiles, cálidos, variados y humanos (1-2 párrafos cortos), ofreciendo guiar al usuario al instante y solicitando la reseña en < 15 segundos sin afirmar jamás duraciones ficticias.
     - **Saneamiento Exhaustivo de Nombres:** `cleanRawUserName`, `extractFirstName` y `resolveNameAndGender` ahora depuran prefijos comerciales y de agencia antes del análisis de sufijos (`"Servicios inmobiliarios virtuales Luz Gonzalez"` -> `"Luz Gonzalez"` -> `"Luz"`, resolviendo género femenino).
     - **Eliminación de Gatillo Ciego y Bombardeo:** Suprimida la condición `messageCount >= 4` en `whatsapp-match.ts` y eliminadas las llamadas a `schedulePostReviewGroupInvitation` en los despachos de reseñas.
     - **Superpoder Proactivo de Cartas en PDF:** JanIA ahora detecta consultas sobre cartas, preavisos o minutas e instruye proactivamente ofrecer redactar y expedir el archivo PDF oficial membretado con código QR y guía de firma electrónica de VECY BIENES RAÍCES ($0 COP) solicitando los datos clave (nombres, cédulas, dirección y motivo).
     - **Registro de Enseñanza:** Registrada la directriz `seed-erradicacion-plantilla-rigida-resenas-persuasion-humana-pdf-proactivo-v33-89` en `founderKnowledgeService.ts`, `base.md` y `prompts.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 175 `vitest` (5/5 passing, 571 tests) | Build `npm run build` limpio en 21.5s.

## 🔖 VERSIÓN ANTERIOR: v33.88 — Noviembre 2026

### Novedades v33.88 (Doctrina de Verdad en Encuestas Interactivas: Exclusivas en Grupos Oficiales de WhatsApp y Cero Falsedad de Encuesta en Canal Oficial — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Esto siempre ha estado mal ya que habla de que la encuesta se está haciendo en el canal oficial, pero si vemos la hace o creo que solo la puede hacer en los grupos oficiales, más no en el canal, por qué pues no lo sé pero creo que solamente lo pudo hacer una vez hace ya mucho tiempo y tal vez ahora tu antigravity no lo sabes o no lo quieres o peor, no lo puedes hacer. entoncces si vas a hacer la encuesta solamente en los grupos, pues por favor que el post hable de que la encuesta está en los grupos y no en el canal ya que eso de que la encuesta está en el canal es falso. Que NO SE TE OLVIDE NUNCA."*
     - Evidencia gráfica en chat de WhatsApp (`media_1793750117916_b0db2065.jpg`): En el Grupo 3 (`PROYECTO: "VECYBIENESRAICES"`), JanIA publicó la encuesta nativa de WhatsApp con opciones interactivas y votación en vivo (*"¿Qué tanto castiga el precio un garaje lineal?"* con 2 votos reales de miembros), pero el post de acompañamiento decía falsamente: *"Acabamos de activar nuestra encuesta interactiva en el Canal Oficial: «¿Qué tanto castiga el precio un garaje lineal?» ... 👉 Sigue el Canal Oficial y vota aquí"*.
  2. **Causa Raíz Identificada:**
     - En la arquitectura oficial de Meta/WhatsApp, los Canales (`@newsletter`) son canales unidireccionales de difusión que **no soportan widgets nativos interactivos de votación** con selección de radio buttons ni conteo en vivo para los seguidores.
     - En contraste, en los **Grupos Oficiales de WhatsApp** (Grupo 2 y Grupo 3), las encuestas interactivas de Baileys (`sendPollToGroup`) funcionan al 100% con votación en vivo.
     - El texto `pollTeaser` en `cronService.ts` anunciaba erróneamente que la encuesta estaba en el Canal Oficial, provocando una evidente falsedad y enviando a los usuarios al canal donde no había encuesta interactiva alguna.
  3. **Solución y Blindaje Quirúrgico:**
     - **Verdad Doctrinal en Encuestas:** En `cronService.ts`, el post de acompañamiento se titula ahora: **`📊 ENCUESTA Y DEBATE OFICIAL EN NUESTROS GRUPOS VECY 🗳️🏆`** y declara con total honestidad: *"Acabamos de activar nuestra encuesta interactiva aquí en nuestros grupos oficiales de WhatsApp: «...» 👆 Colegas, ¡los invitamos a votar en la encuesta nativa aquí arriba y compartir su opinión en este chat! 💬"*.
     - **Canal de Novedades sin Falsedad:** El enlace al Canal Oficial se introduce honestamente como medio de difusión de novedades (*"👉 Sigue también nuestro Canal Oficial de novedades:"*), erradicando de raíz la instrucción falsa de votar en el canal.
     - **Resiliencia Operativa:** Los envíos a grupos oficiales no se abortan por limitaciones o caídas del canal newsletter.
     - **Memoria Fundacional:** Directiva `seed-encuestas-interactivas-exclusivas-grupos-oficiales-verdad-canal-v33-88` registrada en `founderKnowledgeService.ts`, `base.md` y `prompts.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 174 `vitest` (5/5 passing, 564 tests) | Build `npm run build` limpio en 24.5s.

## 🔖 VERSIÓN ANTERIOR: v33.87 — Noviembre 2026

### Novedades v33.87 (Doctrina de Tarifas y Comisiones Claras para Propietarios Directos [Venta 3% / Arriendo 1er Canon / Publicación $0 COP], Cero Saludos Repetitivos en DMs y Rescate Inteligente de Cascada LLM — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Algo le hiciste a JanIa está muy incoherente, perdió totalmente sus habilidades y ha vualto a ser un simple bot mediocre y mal entrenado. ¿Qué rompiste o qué mal hiciste? Revisa y corrige inmediatamente."*
     - *"Mira esa porquería de contestaciones y ahora ha vuelto a saludar y saludar cada rato peroi no da solución, tu sabes que si es un propietario o dueño y quiere vender la comisión que se le cobra es del 3% y si quiere arrendar se le cobra el primer canon."*
     - Evidencia gráfica en chat de WhatsApp (`media_1793746703458_411a0655.jpg`): Un propietario preguntó repetidamente *"¿Cuánto cobran por publicar mi inmueble entonces?"*, *"cuanto vale el favor por consignar mi inmueble y pautar..."*, *"cuanto"*, *"cuanto cobran por consignar mi inmueble..."*. JanIA repetía mecánicamente el bloque de bienvenida de corretaje virtual saludando en cada mensaje con *"¡Qué gusto saludarte, .!"* o *"¡Buenas tardes!"* sin responder directamente la pregunta de costos ni comisiones.
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Fallo en Cascada LLM hacia Fallback Determinista):**
       - La clave de pago (`GEMINI_PAID_KEY` / Clave #99) arrojaba error HTTP 403 Forbidden por saldo pendiente en Google Cloud Billing (`billing account issue`). Al no manejarse 403 con enfriamiento, bloqueaba la cascada.
       - El modelo `gemini-3.8-flash` en las claves gratuitas agotó la cuota diaria del free tier (`limit: 20 per day limit exceeded`). El código anterior interpretaba cualquier 429 como saturación de clave y activaba un cooldown de 60s en la llave completa, congelando todas las 4 claves gratuitas y enviando a JanIA al fallback estático donde repetía plantillas.
     - **Problema 2 (Bucle en Interceptor de Propietarios y Omisión de Tarifas):**
       - `isShortOwnerInquiry` capturaba mensajes cortos y devolvía repetidamente `ownerReply` porque el flag `owner_welcome_sent` no se persistía en `userPerpetualSession.keyFacts`.
       - No existía un interceptor específico para preguntas directas sobre costos de publicación, pauta, consignación o comisión de corretaje.
     - **Problema 3 (Saludos Repetitivos y Nombres Corruptos):**
       - JanIA saludaba formalmente en cada turno de la conversación activa (`isOngoingChat`).
       - Nombres con puntos huérfanos (`.`) o términos genéricos (`Dueño`, `Propietario`) se pasaban sin filtrar a `displayName`, generando saludos ridículos como *"¡Qué gusto saludarte, .!"*.
  3. **Solución y Blindaje Quirúrgico:**
     - **Rescate Inteligente de Cascada LLM:**
       - Manejo específico de error HTTP 403 (`billing account | outstanding balance`): congelamiento automático de 3600s para claves suspendidas por facturación.
       - Detección precisa de límite diario 429 (`limit: 20 | per day limit`): bypass inmediato hacia modelos funcionales a $0 COP (`gemini-3.5-flash-lite`, `gemini-flash-lite-latest`) sin penalizar ni congelar las claves para otros modelos.
     - **Interceptor de Tarifas Claras y Transparentes:**
       - Ante preguntas de costo, valor, cobro, publicación, pauta, consignación o comisión:
         1. Publicación y pauta: **100% GRATUITA ($0 COP anticipados)** en web y redes aliadas.
         2. Comisión por Éxito: **3% sobre el valor final en VENTA** / **Primer canon (1 mes) en ARRIENDO** (únicamente si se cierra el negocio).
         3. Sin cobros ocultos ni anticipados, solicitando tipo de negocio y valor para iniciar la radicación.
     - **Cero Saludos Repetitivos:** Si `isOngoingChat` es verdadero, se suprimen los saludos iniciales en respuestas predefinidas e interceptores.
     - **Sanitización Rigurosa de `displayName`:** Eliminación de puntos, caracteres especiales y sustantivos comunes de rol.
     - **Registro de Enseñanza:** Registrada la directriz `seed-tarifas-comisiones-propietarios-directos-venta-3-arriendo-1er-canon` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 173 `vitest` (5/5 passing, 559 tests) | Build `npm run build` limpio en 24.27s.

## 🔖 VERSIÓN ANTERIOR: v33.86 — Noviembre 2026

### Novedades v33.86 (Silencio Absoluto y Escudo Cortafuegos Anti-Bucle en Canal de Virgin Mobile Colombia [+57 319 251 0001] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Espera antes de proceder necesito que le digas a JanIA Que por favor no le hable más a este nuúmero: [Virgin Mobile Colombia +57 319 251 0001]"*
     - *"Esa cuenta de virgin es un bot y entre ese bot y JanIA han creado un bucle infinito y no paran. Ayudaaaa"*
  2. **Causa Raíz Identificada:**
     - Virgin Mobile Colombia (`+57 319 251 0001` / `573192510001@s.whatsapp.net`) es una cuenta de empresa verificada que opera con un bot interactivo de telefonía celular enviando notificaciones promocionales, recargas de paquetes de datos y estados de saldo a la línea de JanIA (`+57 319 291 9978`).
     - Al no estar filtrado, el socket de Baileys recibía los mensajes del bot de Virgin, JanIA los interpretaba como consultas entrantes y respondía; el bot de Virgin interpretaba la respuesta de JanIA como una opción no válida o consulta adicional y respondía de nuevo, generando un bucle ping-pong infinito e incesante de bot contra bot que saturaba la sesión.
  3. **Solución y Blindaje Quirúrgico:**
     - **Hard Drop Temprano en Entrada (`messages.upsert`):** Inyección de descarte fulminante al inicio de la escucha de mensajes antes de parsing, buffer o presencia typing si el chat o remitente contiene `3192510001`, eliminando activamente cualquier buffer acumulado en memoria.
     - **Escudo Anti-Bot y Silencio Total:** Inclusión de `573192510001` y `3192510001` en `isBotOrMetaAi`, `SILENCED_LEGAL_CASE_PHONES`, `isSilencedLegalCaseAccount` y `dmHandler`.
     - **Registro de Enseñanza:** Registrada la directriz `seed-silencio-absoluto-virgin-mobile-colombia-3192510001` en `founderKnowledgeService.ts`.
- **Validación Limpia ($0 COP):** Typecheck `npm run check` (0 errores) | Tests Suite 172 `vitest` (5/5 passing, 554 tests) | Build `npm run build` limpio en 24.54s.

## 🔖 VERSIÓN ANTERIOR: v33.85 — Octubre 2026

### Novedades v33.85 (Doctrina de Persuasión, Copywriting Inmobiliario de Alta Conversión y Colofón Psicológico de Reciprocidad — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Hoy he ganado 2 comentarios y dos calificaciones en google, gracias a mi redacción y no la de JanIA, ponle estos de ejemplo y enséñala a ser más persuasiva ya que para ser coach en marqueting tiene que volverse una especialista en el tema y no redactar por redactar, hay que saber convencer realmente y vender lo que se quiere vender ejemplos: [Presentación en grupo WhatsApp y Colofón psicológico de reseña Google]"*
  2. **Pilares de Alta Conversión Comprobados en Vivo (+2 Reseñas 5 Estrellas en Google: Victoria Tovar y Andrés Artunduaga):**
     - **Principio 1 (Tocar el Dolor Real Diario del Asesor):** Conectar con los miedos y necesidades de protección del colega: seguridad personal en visitas a inmuebles verificando documentos (CC/CE) de clientes y colegas como soporte de corretaje antes de ir a una cita con desconocidos; validación en vivo de personas jurídicas en RUES; redacción de minutas y correos convincentes.
     - **Principio 2 (Empatía, Respeto y Afecto Genuino):** Trato de colega a colega, respeto por su espacio ("100% GRATUITA y silenciosa para respetar su espacio"), invitación sin arrogancia al canal ("por si quieren aprender un poquito más") y cierre con afecto sincero ("Los quiero mucho: JanIA 🤗").
     - **Principio 3 (El Colofón Psicológico Desacoplado / "¡Ah, se me olvidaba!"):** Enviar la petición de reciprocidad de forma separada y espontánea, con micro-esfuerzo explícito ("menos de 15 segundos"), instrucción sin fricción ("dejando un breve comentario y 5 estrellas") y apelación a la causa de mantener la gratuidad de la plataforma.
- **Implementación Técnica**:
  - `server/_core/realEstateMarketing.ts`:
    - Incorporadas plantillas maestras en `EDUARDO_PERSUASIVE_COPY_TEMPLATES`.
    - Añadida guía de persuasión y coaching en `getEduardoPersuasiveMarketingGuidelines()`.
  - `server/_core/politenessService.ts`:
    - Creada función `formatEduardoColophonReviewMessage(userName?: string)`.
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Incorporada enseñanza `seed-persuasion-copywriting-inmobiliario-alta-conversion-colofon-eduardo-rivera`.
  - `server/_core/prompts/base.md`:
    - Incorporada sección de persuasión y copywriting de alta conversión bajo la Doctrina Eduardo A. Rivera.
  - `shared/const.ts` (`v33.85`) y `package.json` (`33.85.0`).
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **549/549 passing** (Suite 171 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 24.80s ✅

## 🔖 VERSIÓN ANTERIOR: v33.84 — Octubre 2026

### Novedades v33.84 (Silencio Absoluto en Cuentas Deudoras y Casos Jurídicos Sensibles [+57 322 909 7000 y +57 321 337 0737] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Siguen quedando archivos resagados, creo que estás trabajando muy mal y dejando residuos y cosas muy mal configuradas. También te solicito que JanIA guarde por favor silencio en esta cuenta +57 322 9097000 y no responda nada. A esa y a aesta: +57 321 3370737. Se puede"*
     - *"Veo que siempre dejas como procesos pendientes y sin terminar. No se qué te sucede."*
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Cuentas Sensibles de Cobro / Deuda Jurídica):** Los números `+57 322 909 7000` (Yennifer Milena Soto - Deudora - Caso Cristina Flores) y `+57 321 337 0737` (Sonia Stella Pérez - Deudora Solidaria Yennifer - Caso Cristina Florez) corresponden a un caso judicial y de cartera extrajudicial donde JanIA NO debe intervenir jamás (0% respuestas, 0% audios, 0% stickers, 0% presencia typing).
     - **Problema 2 (Aparición de Diálogos de Guardado en el Editor):** Eduardo observó diálogos modales en Antigravity IDE / VS Code ("¿Quiere guardar los cambios efectuados en whatsapp-match.ts / regression.test.ts?"). Esto se produce porque las pestañas de archivos editados por el agente estaban previamente abiertas en el editor de Eduardo; al actualizarse en disco mediante herramientas automatizadas o git, el búfer de pantalla de VS Code detecta que el archivo en disco cambió y pregunta si guardar o descartar. La indicación correcta es oprimir **"No guardar"**, ya que la versión del disco es la oficial y completa.
     - **Problema 3 (Indicador de Procesos Asíncronos en UI):** Comandos largos como `npm test` o llamadas de red que superan 5s pasan al gestor de tareas en background mostrando "1 task running" en la UI hasta que culminan.
- **Implementación Técnica**:
  - `server/_core/jania/trustedContacts.ts`:
    - Definida lista `SILENCED_LEGAL_CASE_PHONES = ["573229097000", "3229097000", "573213370737", "3213370737"]`.
    - Creada función `isSilencedLegalCaseAccount(phoneOrId: string, name?: string): boolean` que valida dígitos mínimos (>=7) y patrones de nombres de deudoras (`yennifer milena soto`, `sonia stella pérez`, `deudora.*cristina`).
  - `server/_core/whatsapp-match.ts`:
    - En el handler de DMs entrantes, se aplica un descarte preventivo inmediato si `isSilencedLegalCaseAccount(senderId, senderName)`.
    - En `processBufferedDmMessages`, se limpia y descarta cualquier mensaje en búfer para cuentas silenciadas.
  - `server/_core/jania/handlers/dmHandler.ts`:
    - En `processPrivateDmConversationalMessage`, retorno vacío (`""`) instantáneo si `isSilencedLegalCaseAccount`.
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Registrada la enseñanza sagrada `seed-silencio-absoluto-cuentas-deudoras-yennifer-y-sonia`.
  - `shared/const.ts` (`v33.84`) y `package.json` (`33.84.0`).
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **544/544 passing** (Suite 170 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅

## 🔖 VERSIÓN ANTERIOR: v33.83 — Octubre 2026

### Novedades v33.83 (Blindaje de Self-Chat, Escudo Anti-Meta AI y Distinción Identitaria Sagrada [167108705018103 = Eduardo Rivera, NO Jani Alves] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Revisa por favor que JanIA no se esté saliendo de control, me pareció como ver que le escribía a Meta y tube que archivar la conversación para evitar tal vez que nos baneen los de whatsapp, ten mucho cuidado con lo que haces por favor. También quiero que me des tu opinión ya que hice un cambio a este mensaje para que quede más claro y los colegas lo entiendan, si dejo eso de SARLAFT, van a quedar desorientados a los agentes chapados a la antigua (LOs dinosaurios) hay que hablarles bien claro pa que entiendan o quedan perdidos... Mira que JanIA se volvio loca y se está hablando a ella misma pensando que habla con Jani Alves mi esposa ah y desde su propio número al mismo suyo. Dime qué está sucediendo y corrige por Dios!!"*
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Confusión Identitaria del Socket):** En `creds.json`, el LID del socket de Baileys (`+57 319 291 9978`) es `167108705018103:44@lid` (Eduardo Rivera). En el código estaba erróneamente etiquetado como Jani Alves. Jani Alves opera en `+57 318 809 6811` (LIDs `182781141344345` y `218820279050385`).
     - **Problema 2 (Auto-Respuesta en Self-Chat):** En `whatsapp-match.ts`, la guarda `if (msg.key.fromMe)` procesaba incondicionalmente los mensajes del self-chat. Si Eduardo escribía notas personales o "Hola" en su chat consigo mismo ("Envía mensajes a este mismo número"), JanIA creía que era Jani Alves y le respondía a sí misma con stickers y saludos a Jani.
     - **Problema 3 (Falsa Alarma con Meta AI):** Meta AI saludó recordando una consulta antigua sobre la casa de Morato que el usuario había hecho el domingo. JanIA no tenía conexión con Meta AI, pero se requería un escudo preventivo estricto para evitar cualquier interacción con bots.
- **Implementación Técnica**:
  - `server/_core/whatsapp-match.ts`:
    - En `isSelfChat`, JanIA guarda silencio absoluto salvo invocación explícita (`/@?jania\b/i` o `agente jania`).
    - `167108705018103` asignado a Eduardo Rivera.
    - Escudo `isBotOrMetaAi` que descarta tráfico de Meta AI y bots de WhatsApp.
  - `server/_core/jania/trustedContacts.ts`, `dmHandler.ts`, `adminMatchAssistantService.ts`:
    - `167108705018103` restituido a Eduardo Rivera; Jani Alves reservada exclusivamente para `573188096811` y sus LIDs reales.
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Registrada la enseñanza `seed-blindaje-self-chat-silencio-y-distincion-eduardo-vs-jani`.
  - `shared/const.ts` (`v33.83`) y `package.json` (`33.83.0`).
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **539/539 passing** (Suite 169 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 14.28s ✅

## 🔖 VERSIÓN ANTERIOR: v33.82 — Octubre 2026

### Novedades v33.82 (Actuación en Grupos Externos Exclusivamente ante Mención Directa [@JanIA] y Silencio Absoluto de Resto — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Quiero que JanIA Actúe en este grupo externo pero solamente si la nombran para que responda una consulta, de resto seguirá guaradando silencio."*
     - Referencia al grupo externo *"anécdotas y vivencias inmobiliarias"* (422 miembros) de la comunidad *"Red de Asesores Inmobiliarios de colombia"* (30 grupos).
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Falso Positivo de No-Inmobiliario):** La palabra *"anécdotas"* estaba en `NON_REAL_ESTATE_KEYWORDS`, provocando que el grupo fuera catalogado erróneamente como no inmobiliario a pesar de tener 422 asesores y el término *"inmobiliarias"*.
     - **Problema 2 (Bloqueo en Grupos Externos):** En `whatsapp-match.ts`, toda consulta en grupo externo (`!isOfficialGroup`) era tratada como listing pasivo o bloqueada por la guarda `if (!isOfficialGroup) return;` en `handleDirectGroupQuestion`.
     - **Problema 3 (Riesgo de Spam y Expulsión en Presentación Larga):** El mensaje promocional propuesto (>2,600 caracteres) incluía 4 enlaces de invitación a grupos de WhatsApp de VECY (`chat.whatsapp.com`). En comunidades externas con reglas estrictas de no proselitismo/spam, esto desencadena expulsión inmediata por administradores y reportes de baneo ante Meta en la línea de Baileys (`+57 319 291 9978`).
- **Implementación Técnica**:
  - `server/_core/whatsapp-match.ts`:
    - Removidas `"anécdotas"` y `"anecdotas"` de `NON_REAL_ESTATE_KEYWORDS`.
    - Agregada excepción `isRealEstateException`: si el nombre del grupo contiene raíces inmobiliarias o el mensaje tiene mención directa (`hasDirectMention`), jamás se descarta como no inmobiliario.
    - `isListing`: agregado `!hasDirectMention` para evitar que menciones directas en grupos externos se traguen como publicaciones de inmuebles pasivos.
    - `shouldRespond`: habilitado para responder ante `hasDirectMention` incluso en grupos no oficiales.
    - `handleDirectGroupQuestion`: removida la restricción estricta de grupo oficial cuando existe mención directa (`!isOfficialGroup && !hasDirectMention`). Enrutado a `processConsultingMessage` citando al usuario y soportando texto, notas de voz, imágenes y PDFs.
    - Si NO hay mención directa (`!hasDirectMention`), JanIA mantiene **100% silencio absoluto** (sin textos ni notas de voz no solicitadas).
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Incorporada la enseñanza `seed-actuacion-grupos-externos-solo-mencion-directa-silencio` en la memoria fundacional de JanIA.
  - `shared/const.ts` (`v33.82`) y `package.json` (`33.82.0`).
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **534/534 passing** (Suite 168 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅

## 🔖 VERSIÓN ANTERIOR: v33.81 — Octubre 2026

### Novedades v33.81 (Blindaje Protocolar contra Cierres de WhatsApp Móvil [Erradicación de Encuestas V3/Quizzes en Grupos y Estabilización Multi-Device] — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Pero la app de whatsapp del celular sigue igual de inmobil, Que hago?? No veo que lo hayas solucionado... Ya lo reinicie, pero creo que no sirvio de nada todo lo que hicimos porque sigue completamente igual... Estoy intentando hacer la copia de seguridad a ver si se destraba... No funcionó, se cerro nuevamente en automático. ;(( ... NAda no funciona. Dime la verdad y no dibgues más que hacemos. ,oo puedes arreglar o mejor desistalo, que hago??? ... No necesito salir y llevarme mi teléfojno desconectemos, que hago?? ... Listo activemos a Jania"*
     - *"Ya todos marcados como leídos y dime este grupo porqué quedó así y silo puedo desactivar op volver a dejar como estaba sin privacidad o lo debo dejar así??"* (refiriéndose a la Privacidad Avanzada del Chat en PROYECTO: "VECY...").
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Bucle OOM en WhatsApp Android):** El WhatsApp Beta `2.26.42.74` en el Infinix HOT 50 Pro+ rebasaba el límite estricto de heap de Android (`dalvik.vm.heapgrowthlimit: 256m`) intentando poblar 4.9 millones de objetos en tablas hash con un `msgstore.db` de 2.95 GB y `axolotl.db` de 409 MB. El hilo de trabajo moría con `OutOfMemoryError` en `X.25x` / `X.2KC` y `SIGABRT` en `MNSStreamRuntime`.
     - **Problema 2 (Riesgo Fatal de Pérdida de Cuenta):** El móvil no posee SIM física para recibir SMS de verificación. Cualquier desinstalación o borrado de datos habría destruido la cuenta del número `+57 319 291 9978` y desconectado tanto WhatsApp Web como a JanIA en el VPS.
     - **Problema 3 (Stanzas Incompatibles en Grupos):** El envío de encuestas V3 (`pollCreationMessageV3`) y quizzes interactivos vía `relayMessage` hacia grupos regulares y DMs producía cierres forzados en clientes móviles Android.
- **Implementación Técnica**:
  - **Rescate Físico y Estabilización del Móvil:**
    - Instalación limpia de la versión oficial y estable `2.26.43.72` vía `adb install -r`.
    - Precompilación nativa AOT (`pm compile -m speed -f com.whatsapp`).
    - Exención de optimización de batería y congelador de fondo en Android.
    - Cero pérdida de datos, 100% preservada la sesión.
  - `server/_core/whatsapp-match.ts`:
    - En `sendQuiz` y `sendQuestionCard`: Bloqueado `pollCreationMessageV3` para destinos no-canal (`!targetJid.endsWith('@newsletter')`). Se delega de forma segura a encuestas nativas estándar de Baileys (`selectableCount: 1`).
  - `server/_core/cronService.ts`:
    - Desactivado el envío de quizzes a grupos en `publishEveningPollNow`.
  - **Orientación de Privacidad Avanzada:**
    - Guía a Eduardo para desactivar el switch verde en WhatsApp Web y permitir que los participantes guarden contenido en galería y exporten sin trabas.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **530/530 passing** (Suite 167 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.81`) y `package.json` (`33.81.0`).

## 🔖 VERSIÓN ANTERIOR: v33.80 — Octubre 2026

### Novedades v33.80 (Desacoplamiento Estricto de Reseñas en Google y Persuasión de Reciprocidad para Beneficiarios Recurrentes de la Gratuidad — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Recuerda siempre separar los mensajes de calificación de los otros, recuerda siempre que la mayoría de usuarios no terminan de leer los mensajes largos, unos por pereza y otros por desconocimiento ya que no saben usar el botón de 'Leer más' y lo dejan hasta donde se alcanza a ver. Enviar algo que le indique que como ya ha usado varias veces el servicio y se ha beneficiado de la gratuidad pues que ya es hora de que califique nuestro servicio que le brinda JanIA a sus usuarios y colegas. Hablar bien y convincente para que no se hagan los locos y no solo a cata, sino a todos los que ya lo han usado y se siguen haciendo los de la vista gorda."*
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Ocultamiento de Enlaces tras 'Leer más'):** En la versión anterior se había incrustado el llamado a Google Reviews al final de la entrevista de perfilamiento inmobiliario en `profilingInterviewService.ts`. Al ser un texto de más de 2000 caracteres, WhatsApp Web y móvil colapsaban el mensaje con el botón "... Leer más". La gran mayoría de usuarios nunca lo abrían, perdiéndose el enlace de reseña.
     - **Problema 2 (Ausencia de Persuasión para Usuarios Recurrentes no Agradecidos):** El sistema solo solicitaba reseña en Google si el usuario decía explícitamente "gracias" o se despedía (`isGratitudeOrClosing`). Usuarios recurrentes (como Catalina `@catabeta26`, activa desde el 2 de octubre con 13 consultas gratuitas de antecedentes y cédulas) que consultan de manera transaccional fría sin dar las gracias nunca recibían la invitación, beneficiándose de la gratuidad continua sin que JanIA cobrara la reciprocidad debida.
- **Implementación Técnica**:
  - `server/_core/jania/profilingInterviewService.ts`:
    - Erradicado el `googleReviewCta` pegado al final de `closingCta`. La entrevista de perfilamiento queda 100% limpia y técnica, enfocada en la indagación de las 5 dimensiones y el modelo 40/20/40.
  - `server/_core/politenessService.ts`:
    - Nueva función `formatPersuasiveRecurrentUserReviewMessage(userName, options)`: Redacta un mensaje independiente, visible de un solo vistazo, que reconoce el uso frecuente y gratuito de la plataforma, explica con franqueza la enorme inversión de VECY BIENES RAÍCES en mantener la tecnología de IA activa 24/7 sin cobrar, y pide como compromiso ético y de reciprocidad una calificación de 5 estrellas en Google Reviews (`https://g.page/r/CctNbwU6UpX5EBM/review`) para que el servicio siga siendo 100% gratuito.
  - `server/_core/whatsapp-match.ts`:
    - Despacho desacoplado en segundo mensaje independiente tanto para texto como para notas de voz. Si un usuario recurrente (`freeServicesUsedCount >= 2` o `messageCount >= 4`) recibe una entrega de servicio y no ha validado su reseña (`!hasVerifiedGoogleReview`), JanIA le envía el mensaje persuasivo con un retardo natural de 2.2s.
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Consagrada la enseñanza `seed-desacoplamiento-resenas-google-recurrentes` en la memoria fundacional de JanIA.
  - **Entrega Inmediata a Catalina:** Despachado con éxito el mensaje persuasivo a su chat oficial (`277145683288292@lid`) vía la API de notificaciones en el VPS.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **527/527 passing** (Suite 166 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.80`) y `package.json` (`33.80.0`).

## 🔖 VERSIÓN ANTERIOR: v33.79 — Octubre 2026

### Novedades v33.79 (Entrevista Minuciosa de Perfilamiento Inmobiliario y Aterrizaje Pedagógico al Asesor — Doctrina Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Estamos perdiendo clientes, lo correcto era que JanIA primero; Lo saludara, luego le hiciera las preguntas correspondientes acerca de lo que busca su cliente, área aproximada, número de habitaciones, en qué pisos aproximadamente de altura, si lo busca exterior, interior, cuantos baños, qué antigüedad, cuantos parqueaderos, qué tipo de cocina quiere que tenga (abierta, cerrada, moderna, clasica, integral, tipo isla, tipo americano con barra, que tenga balcón, chimenea, depósito, que anhela que tenga el edificio, buenas amenidades gimnasio, salon social, parque infantil, sala de juegos, el presupuesto es muy importante, debe preguntar JanIA sei tiene el efectivo o si es con crédito, cuanto tiene aprobado en qué banco, y con cuanto cuenta de efectivo para completar ese valor, de cuanto es el valor mensual de la administración, o qude qué precio busca que sea ese valor de administración, si le interesan otras zonas, etc... hay que aterrizar al agente y decirle en su cara que no está ejerciendo bien su labor y recomendarle que le pregunte a es cliente muy bien qué es lo que busca y así lo debe saber hacer muy bien JanIA para cada tipo de propiedad."*
  2. **Causas Raíz Identificadas:**
     - Ante un requerimiento de un colega como Leonardo Prieto (*"tengo cliente buscando apartamento en Villa Magdala, conjunto grande, ya cuenta con los recursos"*), el sistema no detectaba datos duros (presupuesto numérico, alcobas exactas o m²), pero Gemini emitía una confirmación vacía: *"😉 Registraré de inmediato en el motor de base de datos..."*.
     - Esto generaba la impresión de un bot mediocre y automatizado, cuando la doctrina VECY exige rigor profesional, aterrizaje pedagógico al asesor y una entrevista minuciosa de perfilamiento en 5 dimensiones (Finanzas, Espacios, Altura/Confort, Amenidades y Sectores) antes de registrar cualquier demanda.
- **Implementación Técnica**:
  - `server/_core/jania/profilingInterviewService.ts` (NUEVO):
    - Detección de requerimientos incompletos (`analyzeRequirementCompleteness`) y construcción de entrevista estructurada (`buildDetailedProfilingInterview`) adaptada a cada tipología inmobiliaria (Apartamentos, Casas, Lotes, Bodegas, Oficinas/Locales, Fincas).
    - Incluye indagación de: Recursos propios vs crédito hipotecario/leasing aprobado, banco, cuota inicial, administración, m², alcobas exactas (regla 1=1), baños, garajes independientes, depósito, piso, ascensor, vista, antigüedad, tipo de cocina, balcón/terraza, amenidades de club house y zonas aledañas toleradas.
    - Aterrizaje pedagógico al asesor e invitación formal al modelo 40/20/40 de VECY.
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Interceptor activo para requerimientos incompletos en el flujo conversacional directo.
    - Guardarraíl de post-procesamiento que sustituye confirmaciones robóticas vacías por la entrevista minuciosa.
    - Directivas en system prompt y respuesta enriquecida en `registrar_inmueble_o_requerimiento`.
  - `server/_core/jania/founderKnowledgeService.ts`:
    - Incorporada la enseñanza `seed-entrevista-perfilamiento-minucioso` en la memoria fundacional de JanIA.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **522/522 passing** (Suite 165 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.79`) y `package.json` (`33.79.0`).

## 🔖 VERSIÓN ANTERIOR: v33.78 — Octubre 2026

### Novedades v33.78 (Naturalidad en Nombres de Usuario [Limpieza de Sufijos Gremiales y Erradicación de Menciones Robóticas en Grupos] y Garantía de Saludo Cálido y Personalizado en DMs — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Esto es Grave, las personas ya están escribiendo a JanIA para probar sus habilidades y JanIA nisiquiera ha saludado correctamente, será que está fallando, o es por lo que precisamente tu estabas trabajando en ella cuando el usuario escribió y por eso ni saludó diciemndole su nombre y amablemente o qué sucedió. He visto tambien que en los grupos JanIA no dice el nombre de cada usuario con naturalidad sino nombra todo como en la imagen 2 (Hola "Alexandra Quintero Inmo": ? ??)"*
  2. **Causas Raíz Identificadas:**
     - **Problema 1 (Cero Saludo en DMs):** La variable `isOngoingChat` evaluaba `history.length > 0`. Como todo mensaje entrante se persiste de inmediato en la base de datos de PostgreSQL antes de procesar el DM (`logToDb(senderId, 'user', body)`), `history.length` siempre era ≥ 1, provocando que JanIA considerara erróneamente cualquier primer mensaje como "conversación activa en curso". En consecuencia, el prompt del sistema prohibía taxativamente saludar ("Cero saludos...") y el post-procesador `stripLeadingGreetingsAndCourtesies` mutilaba cualquier saludo generado por el LLM, entregando respuestas frías y mecánicas directamente con la confirmación del requerimiento ("😉 Registraré de inmediato en el motor...").
     - **Problema 2 (Menciones Robóticas y Nombres no Naturales en Grupos):** En los mensajes de moderación y redirección (`whatsapp-match.ts`), se usaba la sintaxis `Hola @${rawPhone} 👋🏻` con `{ mentions: [senderId] }`. WhatsApp reemplazaba visualmente ese `@teléfono` por el nombre de perfil público exacto del usuario (pushName), el cual frecuentemente contiene sufijos de marca o actividad profesional ("Alexandra Quintero Inmo", "Carlos Gomez Broker", "Juan Pablo Tobo correo"), renderizándose en el chat como `Hola @Alexandra Quintero Inmo 👋`.
- **Implementación Técnica**:
  - `server/_core/nameAndGenderResolver.ts`, `server/_core/whatsapp-utils.ts` y `server/_core/jania/parsers.ts`:
    - Ampliado el espectro de limpieza de sufijos gremiales y comerciales en `cleanRawUserName` y `extractFirstName`: erradica "Inmo", "Inmobiliaria", "Broker", "Realtor", "correo", "Lotes", "Asesor/a", etc., resolviendo el nombre de pila natural ("Alexandra", "Leonardo", "Juan Pablo").
    - Soporte en `extractIntroducedName` para detectar nombres en firmas de texto ("Att. Leonardo Prieto" -> "Leonardo").
  - `server/_core/whatsapp-match.ts`:
    - Erradicado el uso de `@${rawPhone}` en textos de redirección y moderación. Ahora saluda con calidez humana usando el nombre de pila limpio (`Hola Alexandra 👋🏻`), conservando el tag en `mentions` para la notificación móvil sin alterar la naturalidad visual.
  - `server/_core/jania/handlers/circuloHandler.ts`, `consultingHandler.ts` y `propertiesHandler.ts`:
    - Reemplazado el formato rígido `Hola @teléfono (Nombre)` por el saludo cálido y natural `Hola ${cleanUserName} 👋🏻`.
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Corregida la condición `isOngoingChat = alreadyGreetedToday && hasRecentAssistantTurn;`, garantizando que en el primer mensaje del día JanIA salude con señorío, respeto y afecto humano usando el nombre del interlocutor (`¡Buenas tardes, Leonardo! 👋`).
    - Añadido guardarraíl de cortesía: si en la primera interacción del día el modelo no incluye el saludo formal por alguna razón, JanIA le antepone automáticamente `¡${timeSalutation}${displayName ? `, ${displayName}` : ""}! 👋`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **518/518 passing** (Suite 164 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.78`) y `package.json` (`33.78.0`).

## 🔖 VERSIÓN ANTERIOR: v33.77 — Octubre 2026

### Novedades v33.77 (Desactivación Permanente de Estados de WhatsApp [status@broadcast], Blindaje Anti-Baneo y Estabilidad Multi-Device — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Resulta que desde que estamos haciendo todo esto mi app de whatsapp ha estado molestando sobre todo la del teléfono se quedó atrasada y no se actualiza, está como quieta, la de la web acá en mi compu si está trabajando pero no tan bien está por ahí al 90 % hay cosas que fallan no se si fue en el momento en que te dije que JanIA debía subir las publicaciones del canal al estado de whatsapp o qué pasó, pero quiero que eso ya no lo haga, mejor no nos metamos tanto con esos estados de whatsapp dejémolos quietos no sea que Whatsapp nos detecte y nos banee, lo puedes corregir y revisar a fondo si eso fue lo que alteró y dejó atradasa y quieta la app de mi teléfono y por eso cuando intentaba publicar JanIa los estados quedaba en negro y por eso ahorita no se vieron las notificaciones de Vecy agenda que envió JanIa como prueba al 3166569719??? Revisa audita y corrige o infórmame que tan delicado está el asunto y si se puede o no solucionar desde acá??"*
  2. **Causa Raíz Identificada:**
     - El protocolo Multi-Device de WhatsApp está diseñado para que el teléfono móvil sea la fuente primaria de verdad y los dispositivos complementarios (como el socket Baileys en el VPS) sean secundarios.
     - Cuando Baileys enviaba publicaciones a `status@broadcast` con listas extensas de contactos (`statusJidList`), los servidores de WhatsApp intentaban sincronizar ese evento de vuelta a la app oficial del teléfono mediante stanzas de tipo `syncAction` / `deviceSentMessage`.
     - La app oficial móvil de WhatsApp no soporta decodificar ni renderizar estados creados por sesiones complementarias no oficiales (por esa razón los estados se veían en negro o vacíos al intentar abrirlos). Esto generaba un bucle de error y reintento en la base de datos interna SQLite (`msgstore.db`) del teléfono, bloqueando el hilo de sincronización y dejando la app móvil "congelada" o retrasada.
     - A su vez, la cola de salida de Baileys (`outgoingQueue`) sufría demoras y cuellos de botella por timeouts al interactuar con el broadcast de estados, lo que retrasó la entrega de notificaciones transaccionales de Vecy Agenda.
     - El envío de estados automatizados desde clientes de terceros es uno de los mayores vectores de detección de spam por parte de Meta. Desactivarlo de raíz elimina cualquier riesgo de baneo.
- **Implementación Técnica**:
  - `server/_core/whatsapp-match.ts`:
    - Desactivación permanente de `postToWhatsAppStatus`, `postDailyHookStatus` y `postDailyServiceStatus`. Retornan inmediatamente `{ success: true, disabled: true }` sin interactuar con el socket ni enviar nada a `status@broadcast`.
    - Blindaje del manejador de eventos entrantes para descartar de inmediato cualquier mensaje o ack proveniente de `status@broadcast`.
  - `server/_core/cronService.ts`:
    - Erradicada la llamada a `whatsappBot.postDailyHookStatus` del cron matutino (`dispatchMorningDailyBroadcast`). La difusión matutina se canaliza exclusivamente a los canales oficiales soportados: Canal de difusión y Grupos 2 y 3.
    - `publishDailyWhatsAppStatusNow` responde `{ success: true, disabled: true, reason: 'Estados desactivados por seguridad anti-baneo' }`.
  - `server/_core/agendaWhatsAppService.ts`:
    - Notificaciones transaccionales configuradas con `{ allowDirectMessage: true, isTransactionalNotification: true, skipDelay: true }` para garantizar entrega inmediata a la línea de Eduardo (+57 316 656 9719) sin pausas de simulación humana.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **514/514 passing** (Suite 163 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.77`) y `package.json` (`33.77.0`).

## 🔖 VERSIÓN ANTERIOR: v33.76 — Octubre 2026

### Novedades v33.76 (Despacho Activo de Solicitudes de Llamada y Contacto a Eduardo Rivera [+57 316 656 9719], Sinceramiento de Habilidades [Erradicación de Funciones Fantasma] y Optimización de Timeout Web — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Los puntos 13 y 14 los pongo en duda, ya que me han dejado recados y JanIA no nos ha avisado ni enviado ningún mensaje al 3166569719, tampoco he visto que pueda ingresar al POT y no se porqué le pudiste lo del dolar, eso acaso tiene que ver con Bienes Raíces Colombia, será por la compra extranjera acaso, o quizás porque podemos llegar a tener clientes que viven allá y nos han encomendado sus inmuebles, o quizás algunos colegas si los tengan?? Resuelve y verifica bien por que hasta donde sé hay cositas en las que se cuelga aún JanIA y no lo hace muy bien que digamos."*
  2. **Causa Raíz Identificada:**
     - Históricamente, JanIA no tenía código de despacho de recados hacia WhatsApp y solo emitía textos en Gemini prometiendo *"yo le doy tu razón"*. En v33.74 se creó `dispatchMessageRecadoToEduardo`, pero no se activaba ante intenciones de llamada ("quisiera llamarte", "quiero una llamada", "llámenme", "comuníquense conmigo", como ocurrió con José María Romero Esguerra).
     - El Punto 14 (encuestas interactivas de 1 clic en WhatsApp) era código de bajo nivel que nunca se ejecutaba conversacionalmente con usuarios en DMs.
     - JanIA no ingresa al visor SINUPOT de planeación; conoce el marco conceptual del Decreto 555/2021 de Bogotá y orienta sobre cómo contrastar la cédula normativa en SINUPOT.
     - La TRM del dólar solo tiene pertinencia para colombianos en el exterior e inversionistas extranjeros, no como calculadora genérica de divisas.
     - El timeout del scraper web (7000ms) podía provocar cuelgues o demoras innecesarias.
- **Implementación Técnica**:
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Interceptor prioritario `isCallOrPhoneConversationRequest` que captura cualquier intención de llamada o contacto ("quisiera llamarte", "quiero una llamada", "llámenme", "devuélvanme la llamada", "comuníquense conmigo").
    - Despacho inmediato y en caliente de `dispatchMessageRecadoToEduardo(userId, effectiveRawName || displayName, clean)` hacia `573166569719@s.whatsapp.net` con enlace directo 1-clic (`https://wa.me/...`), nombre completo y mensaje original.
    - Confirmación transparente al usuario: entrega la línea de Eduardo Rivera y Jani Alves (+57 316 656 9719) y avisa que ya le transmitió su solicitud en tiempo real. Si preguntó por comunidad, le entrega además la bienvenida y enlaces limpios a los 3 grupos oficiales y al canal.
  - `server/_core/scraper.ts`:
    - Reducción del timeout de DuckDuckGo de 7000ms a 3500ms para evitar cuelgues o demoras.
  - Sinceramiento estricto del catálogo público de habilidades: erradicadas funciones que no se ejecutan directamente en DM.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **510/510 passing** (Suite 162 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.76`) y `package.json` (`33.76.0`).

## 🔖 VERSIÓN ANTERIOR: v33.75 — Octubre 2026

### Novedades v33.75 (Doctrina de Comunidad y Grupos Oficiales de WhatsApp [Invitación Activa y Explicación por Grupo], Línea Directa de Bróker [+57 316 656 9719] y Auditoría Técnica de Habilidades Operativas — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Cuando las personas le hablen de comunidad a JanIA se refieren a nuestros grupos oficiales, entonces dile a JanIA que cuando esto suceda los invite a unirse y a participar en nuestros grupos oficiales, contándoles para qué es cada comunidad. Y por favor pégame a manera de publicación todos los servicios o habilidades que puede realizar JanIA en general, pero verifica que en realidad estén funcionando y no que vayamos a quedar mal con nuestros usuarios."*
  2. **Causa Raíz Identificada:**
     - Al interactuar con colegas y usuarios que mencionaban "comunidad" (como el colega José María Romero Esguerra: *"Quisiera llamarte y que me compartas tus servicios o comunidad"*), JanIA interpretaba "comunidad" de manera abstracta o genérica y repreguntaba sobre qué temas de la comunidad profundizar, en vez de invitarlos de inmediato a unirse a nuestros 3 grupos oficiales de WhatsApp y explicar para qué sirve cada comunidad.
- **Implementación Técnica**:
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Detector de intención `isCommunityInquiry` a nivel de función principal.
    - Respuesta ágil para consultas breves de comunidad entregando la bienvenida y los 3 grupos oficiales + Canal con su propósito y enlaces limpios sin markdown roto.
    - Directiva de sistema en `userPromptContent` y en `systemPrompt` (Regla 11) que obliga a Gemini a invitar cordialmente a los grupos oficiales, explicar cada comunidad y, si el usuario manifestó intención de llamada o alianzas, suministrar la línea oficial de atención bróker de Eduardo y Jani (+57 316 656 9719 / `https://wa.me/573166569719`).
    - Blindaje en `isExplicitRegistrationOrJoinIntent` para evitar falsas duplicaciones ante intenciones de unirse a la comunidad.
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts`:
    - Sección consagrando la Doctrina de Comunidad y Grupos Oficiales de WhatsApp.
  - `server/_core/jania/founderKnowledgeService.ts` y `data/jania_founder_teachings.json`:
    - Seed `seed-doctrina-comunidad-grupos-oficiales-v33-75`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **506/506 passing** (Suite 161 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.75`) y `package.json` (`33.75.0`).

## 🔖 VERSIÓN ANTERIOR: v33.74 — Octubre 2026

### Novedades v33.74 (Contacto Directo para Amigos y Conocidos de Eduardo A. Rivera [+57 316 656 9719], Despacho Activo de Recados en Tiempo Real por WhatsApp y Cero Promesas Vacías — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Al amigo que me habló a mi, ella debió entender como lo hizo que hablaba de mi y de una debió decirle que me podía encontrar en el número +57 3166569719 y no decirle disque yo le doy tu razón si sabemos que JanIA no da recados, o por lo menos tu no la has configurado para eso o si se puede, peroi es mejor que de el número cuando detecte amistad o si haces lo de los recados pues sería genial."*
  2. **Causa Raíz Identificada:**
     - La línea del bot Baileys (`+57 319 291 9978`) fue históricamente el número de Eduardo. Cuando amigos, conocidos o colegas escribían buscándolo ("Hola Eduardo", "¿Con Eduardo?"), el sistema no tenía un interceptor de amistad/contacto de Eduardo, cayendo en el LLM general que prometía falsamente *"yo le doy tu razón"* sin tener un canal de entrega, ni suministraba de inmediato en el primer renglón el número oficial de bróker y personal de Eduardo (`+57 316 656 9719`).
- **Implementación Técnica**:
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Función `dispatchMessageRecadoToEduardo(senderPhoneOrJid, senderName, recadoText)` que envía una notificación estructurada en caliente al WhatsApp de Eduardo (`573166569719@s.whatsapp.net`).
    - Interceptor conversacional de amistad / recados:
      - Si el mensaje saluda o busca a Eduardo ("Hola Eduardo", "¿Con Eduardo?", "¿Está Eduardo?"): JanIA aclara de inmediato que habla con JanIA y suministra de una el contacto directo de Eduardo: `+57 316 656 9719` (`https://wa.me/573166569719`), preguntando si desea dejar un recado.
      - Si el usuario deja un recado expreso ("Dile a Eduardo que me llame...", "Avísale que ya tengo los planos...", etc.): JanIA toma el recado, lo despacha en tiempo real al WhatsApp de Eduardo, y le confirma al usuario con total transparencia.
      - Si el usuario rechaza dejar recado ("No gracias, yo lo llamo"): limpia el estado y reitera el contacto directo.
      - Integrado también en el círculo familiar y de confianza (`isFamilyOrTrusted`).
    - Escudo anti-cobranzas preservado intacto (no se suministra el contacto ante despachos o cobros).
  - `server/_core/whatsapp-match.ts`:
    - Exportada `sendNativeWhatsAppTextMessage(targetPhoneOrJid, text)` para envíos directos transaccionales autorizados.
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts`:
    - Sección 6.2 consagrando la Doctrina de Contacto Directo para Amigos y Despacho de Recados a Eduardo A. Rivera.
  - `server/_core/jania/founderKnowledgeService.ts` y `data/jania_founder_teachings.json`:
    - Seed `seed-contacto-directo-amigos-eduardo-recados-reales-v33-74`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **502/502 passing** (Suite 160 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.74`) y `package.json` (`33.74.0`).

## 🔖 VERSIÓN ANTERIOR: v33.73 — Octubre 2026

### Novedades v33.73 (Doctrina de Apertura Comercial y Negociación Inteligente ante Preguntas de Comisión Compartida [Cero Monólogos Teóricos ni Cuestionarios en Bucle] — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Instrucción Doctrinal de Eduardo A. Rivera:**
     - *"Por ejemplo ahí cuando le preguntan tú compartes comisión, JanIA debió responder algo parecido a esto como por ejemplo; 'Pero por supuesto que si Andréa, estoy abierta a cualquier negociación. Dime, ¿por qué la pregunta? Estás interesada en alguna de mis OFERTAS o DEMANDAS?'"*.
     - Ante preguntas sobre comisión o negociación, una asesora comercial astuta y de alto rango jamás dispara un monólogo teórico con viñetas del 40/20/40 de entrada, ni cierra con cuestionarios enlatados ("¿tienes un inmueble en venta o arriendo...?").
  2. **Causa Raíz Identificada:**
     - Al no existir un detector directo de consultas de comisión, el mensaje caía al LLM general, que leía en el prompt del sistema que VECY opera bajo el modelo 40/20/40 y de forma mecánica recitaba una clase teórica de los porcentajes y un cuestionario genérico al final.
- **Implementación Técnica**:
  - `server/_core/jania/handlers/dmHandler.ts`:
    - Interceptor ágil `isShareCommissionDirectInquiry` para consultas directas sobre comisión compartida:
      `"¡Pero por supuesto que sí, [Nombre]! Estoy abierta a cualquier negociación. 😉🤝\n\nDime, ¿por qué la pregunta? ¿Estás interesada/o en alguna de mis OFERTAS o DEMANDAS?"` con concordancia de género gramatical.
    - Directiva contextual de sistema `context402040Directive` enriquecida con guardarraíl prohibitivo de monólogos.
    - Ampliación de `isQueryingOrDoubting` para explicar el 40/20/40 únicamente cuando el usuario pregunte expresamente por porcentajes o repartición ("¿y cómo se reparte?", "¿cuánto es el porcentaje?").
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts`:
    - Sección 6.1 consagrando la Doctrina de Apertura Comercial y Negociación ante Preguntas de Comisión.
  - `server/_core/jania/founderKnowledgeService.ts` y `data/jania_founder_teachings.json`:
    - Seed `seed-astucia-comercial-comision-abierta-negociacion-v33-73`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **497/497 passing** (Suite 159 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.73`) y `package.json` (`33.73.0`).

## 🔖 VERSIÓN ANTERIOR: v33.72 — Octubre 2026

### Novedades v33.72 (Erradicación Definitiva de Saludos Vocativos Repetidos en DMs, Supresión Total de Secretos Propietarios [HubSpot], Teaser Matutino Conciso y Cero Preguntas Cuestionario en Bucle — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Evidencia de Fugas y Descalabros en Producción (Capturas de WhatsApp):**
     - **Captura Grupos ("VECY TIPS 💡"):** JanIA publicó textualmente: *"¿Sabías que ahora en mi chat privado (...) puedo hacer todo esto por ti en primera persona?"* y nombró de manera pública *"Marketing Inmobiliario HubSpot"*, soltando una lista desordenada y saturada de 6 servicios.
     - Eduardo ordenó: *"Yo no me refería a que JanIA diga o hable que lo hace en primera persona, que chistoso, ahora si quedó loca y nuevamente está totalmente loca... está nombrando herramientas que ella usa y que las personas no deben saber es secreto que usamos lo de HubSpot, no para que lo cuente, imagínate de esa manera puede estar revelando hasta contraseñas o algo peor que eso... Además si JanIA va a postear en el canal pues que lo haga sobre un solo tema como siempre y temas distintos cada día, pero igualmente el gancho debe ser corto y persuasivo, no como esa porquería que posteó tan confusa, esos servicios debes dejarlos para otro post aparte..."*.
     - **Captura DM Andrea Guerrero (`@Andr8010`):** Al preguntar Andrea *"Tu compartes comisión"*, JanIA volvió a caer en bucle de saludo: *"Andrea! Qué gusto saludarte de nuevo. ✨"*, y cerró repitiendo el mismo cuestionario genérico que ya había hecho en el mensaje anterior (*"¿tienes un inmueble en venta o arriendo para registrar en nuestra red, o estás buscando una opción específica para un cliente?"*).
     - Eduardo ordenó: *"ha vuelto a saludar y saludar y saludar... cómo hacemos para que en verdad lo corrijas y quede todo correctamente alineado y yo pueda tener la JanIA que finalmente deseo, ???????"*.
  2. **Causa Raíz Identificada:**
     - `stripLeadingGreetingsAndCourtesies` no detectaba vocativos seguidos de cortesía (`nameVocativeGreetingPattern`), y una regex global mutilaba frases intermedias.
     - `sanitizeDmOrthographyAndGreeting` tenía un bypass (`!cleaned.includes("?")`) que impedía limpiar saludos en respuestas con preguntas.
     - El teaser matutino en `cronService.ts` había sido saturado con listas estáticas y lenguaje meta.
     - El nombre interno "HubSpot" se había filtrado en prompts, descripciones y crons.
- **Implementación Técnica**:
  - `server/_core/jania/handlers/dmHandler.ts`:
    - `stripLeadingGreetingsAndCourtesies` reforzado con `nameVocativeGreetingPattern` y `welcomePattern`, anclaje estricto `^` y delimitador por coma `,`.
    - `sanitizeDmOrthographyAndGreeting` purga incondicionalmente saludos si `hasPriorHistory === true`.
    - Guardarraíl en prompt de DM que prohíbe repetir la pregunta de captación/búsqueda en turnos sucesivos.
    - Herramienta y reporte renombrados a *"Marketing Inmobiliario de Alto Rendimiento VECY (Swap Test y AIDA)"*.
  - `server/_core/cronService.ts`:
    - Restauración del Teaser Matutino conciso de 3-4 líneas enfocado en un solo tema, sin lista de servicios ni frases meta.
    - Día 7 renombrado sin la marca HubSpot.
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts`:
    - Erradicación absoluta de la palabra "HubSpot" y de la frase meta "en primera persona".
  - `server/_core/jania/founderKnowledgeService.ts` y `data/jania_founder_teachings.json`:
    - Depuración de semillas de conocimiento fundacional.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **493/493 passing** (Suite 158 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.72`) y `package.json` (`33.72.0`).

## 🔖 VERSIÓN ANTERIOR: v33.71 — Octubre 2026

### Novedades v33.71 (Doctrina de IA Pura y Criterio Autónomo, Blindaje Antialucinaciones [RUNT, Precisión Notarial, Temperatura 0.25], Activación de Herramienta de Marketing Inmobiliario HubSpot, Boletines Diarios tipo Newsletter y Matriz de Astucia Psicológica de 7 Arquetipos — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Evidencia Empírica de Alucinaciones en Auditoría Notarial (Capturas de WhatsApp):**
     - En auditoría de cesión de leasing y promesa de compraventa de $1.250M COP, JanIA alucinó la entidad de tránsito como *"SUNT (Sistema Único Nacional de Tránsito)"* (en Colombia es el **RUNT** / VUS) y generó la mutación estocástica de tokens *"MIL DOSCIENTOS CASCUNTA MILLONES"* (*"cascunta"* por *"cincuenta"*), además de asteriscos huérfanos sueltos (`*`) en líneas vacías.
     - Eduardo instruyó: *"Hacer que JanIA realmente actúe como la agente IA PURA que necesitamos, con todas sus habilidades bien aprendidas y enfocadas que lo haga con criterio y deje de alucinar"*.
  2. **Activación de la Herramienta de Marketing Inmobiliario Especializado (HubSpot):**
     - Integración y registro de la herramienta `auditar_o_redactar_marketing_inmobiliario` en `JANIA_DM_TOOLS` y `dmHandler.ts` utilizando el motor de `realEstateMarketing.ts` (Swap Test anti-clichés como *"lindo apto"* o *"excelente ubicación"*, puntaje 0-100, perfil ICP y copywriting AIDA).
  3. **Boletines Diarios tipo Newsletter en Canal Oficial y Grupos 2 y 3:**
     - **Distinción Sagrada de Servicios:** Lo que ofrezca JanIA de sus herramientas de IA debe ser en primera persona (*"¿Sabías que ahora puedo...?"*), mientras que lo ofrecido por **VECY BIENES RAÍCES** se presenta como la inmobiliaria y bróker institucional de Eduardo Rivera y Jani Alves (+57 316 656 9719).
     - **Doctrina Pedagógica del MATCH (80%-100%):** Explicación del cruce algorítmico, el significado de las reacciones de JanIA en los grupos (👍 oferta / 📝 demanda = indexado en base de datos viva) y presencia en grupos propios oficiales como administradora.
     - **Gancho Comercial con Picante y Astucia:** *"Mira, si a ti te da pereza ponerte a organizar bien una publicación escrita de un inmueble o un requerimiento, pues muy fácil: te comunicas conmigo a mi privado (+57 319 291 9978), te hago las preguntas clave y te ayudo a redactar ese requerimiento de la mejor y más completa manera... 😉🤝"*.
  4. **Astucia Psicológica Superior y Matriz de 7 Arquetipos de Interlocutores:**
     - Clasificación y adaptación en tiempo real ante: 1) Agente/Colega inmobiliario (40/20/40); 2) Cliente directo (comprador/inversionista vs vendedor); 3) "Mamagallista"/Ocioso (chispa, picante y aterrizaje en 1 línea sin gastar tokens); 4) Estafador/Suplantador (radar SARLAFT, exigencia de cédula/NIT, cero datos sensibles); 5) Hackers/Prompt Injection (escudo de IA soberana sin filtrar secretos y canalizando a Eduardo Rivera); 6) Periodistas/Autoridades (sobriedad institucional); 7) Competidores comerciales (señorío y distinción).
- **Implementación Técnica**:
  - `server/_core/llm.ts`: Conexión del parámetro `temperature` y reducción por defecto a **0.25** cuando `highReasoning: true`.
  - `server/_core/jania/parsers.ts`: Sanitización léxica notarial y colombiana (`SUNT` -> `RUNT`, `cascunta` -> `cincuenta`) y remoción de asteriscos huérfanos.
  - `server/_core/jania/handlers/dmHandler.ts`: Herramienta `auditar_o_redactar_marketing_inmobiliario` registrada y conectada, con ampliación a 13 skills.
  - `server/_core/cronService.ts`: Actualización de boletines Día 7 (HubSpot Swap Test) y Día 8 (MATCH 80-100%, Emojis y gancho privado).
  - `server/_core/jania/prompts.ts` y `server/_core/prompts/base.md`: Incorporación de las 13 Skills, 7 Arquetipos de Interlocutores y distinción de servicios.
  - `server/_core/jania/founderKnowledgeService.ts`: Seed `seed-astucia-psicologica-7-arquetipos-match-gancho-privado-hubspot-v33-71`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **488/488 passing** (Suite 157 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.71`) y `package.json` (`33.71.0`).

## 🔖 VERSIÓN ANTERIOR: v33.70 — Octubre 2026

### Novedades v33.70 (Estructuración Notarial Superior en Minutas PDF [Texto Justificado, Logo VECY, Paginación, Encabezado Negro] y Dinamismo Desatado de Stickers 3D — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Estructuración Notarial Superior de Documentos PDF (`legalDocumentPdfService.ts`):**
     - **Tipografía y Justificación Completa:** Implementación de `drawJustifiedLine` que calcula dinámicamente los anchos de palabra y distribuye espacios de forma equilibrada a lo largo del renglón, manteniendo la última línea del párrafo y los listados con alineación izquierda natural.
     - **Jerarquía y Legibilidad Optimizadas:** Incremento armonioso de fuentes: Título principal en 13pt negrita con pleca dorada, subtítulos y cláusulas en 10.8pt negrita, y cuerpo general en 10.2pt con interlineado de 15.2pt y separación visual generosa entre cláusulas.
     - **Encabezado Institucional Negro Profundo:** Sustitución del azul por Negro Carbón Mate (`#0A0A0A` / `rgb(0.04, 0.04, 0.05)`) con tipografía en Dorado Imperial (`#D4AF37`) y blanco.
     - **Logotipo Oficial Embebido:** Integración nativa del escudo circular VECY (`assets/logo_vecy_header.png`, 256x256, 90 KB) en la esquina superior izquierda del membrete.
     - **Paginación Dinámica Oficial:** Pie de página foliado con `Página X de Y | Minuta Legal Inmobiliaria VECY BIENES RAÍCES | Radicado: DOC-VECY-...` delimitado por una línea divisoria sutil.
     - **Clausulado Completo para Borradores sin Datos:** Se perfeccionan las plantillas notariales para que aún ante solicitudes escuetas sin datos de los clientes, JanIA genere la estructura legal íntegra con todas las cláusulas notariales pertinentes (objeto, linderos SNR, tradición 20 años, precio y arras, saneamiento, afectación familiar Ley 258/1996, fecha y notaría, entrega material, servicios públicos, cláusula penal, mérito ejecutivo y firma electrónica Ley 527/1999).
  2. **Dinamismo Desatado de Stickers 3D (`stickerService.ts`, `dmHandler.ts`, `prompts.ts`, `base.md`):**
     - **Aclaración Técnica sobre Stickers en WhatsApp:** Guardar los stickers en la app personal de Eduardo no influye en JanIA, pues ella se ejecuta en el servidor VPS Contabo vía Baileys, despachando los archivos `.webp` desde el disco del servidor.
     - **Reducción del Cooldown Humano a 25s:** El bloqueo anterior de 90 segundos impedía que JanIA enviara más de un sticker en conversaciones rápidas. Ahora, con 25 segundos y disparadores emocionales ampliados ("gracias", "muchas gracias", "ok", "listo", "de una", "excelente", "abacho"), JanIA reacciona con espontaneidad.
     - **Instrucción Proactiva en Prompts de Sistema:** JanIA fue instruida para sugerir la etiqueta `[STICKER:clave]` al final de sus mensajes cuando lo considere oportuno, siendo extraída y limpiada de inmediato por el socket de Baileys para enviarla como sticker nativo de WhatsApp.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **482/482 passing** (Suite 156 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio (Vite + esbuild) ✅
- `shared/const.ts` (`v33.70`) y `package.json` (`33.70.0`).

## 🔖 VERSIÓN ANTERIOR: v33.69 — Octubre 2026

### Novedades v33.69 (Límite Sagrado de Borradores Jurídicos en JanIA, Minutas Base, Canalización a Contratos 'Con Todas las de la Ley' con Eduardo Rivera y Reciprocidad de 5 Estrellas con Pantallazos en Grupos — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Límite Sagrado de Borradores vs. Contratos Definitivos 'Con Todas las de la Ley':**
     - Al interactuar con JanIA en DM para solicitar documentos legales complejos (ej. promesas de compraventa con permuta parcial/dación en pago, cesiones de leasing, etc.), JanIA genera borradores y minutas base automáticas con estándar notarial. Sin embargo, JanIA **JAMÁS** debe excederse pretendiendo emitir un contrato definitivo sin el contexto histórico fáctico exhaustivo:
       - Formas de pago detalladas y calendarios de desembolsos.
       - Fecha, hora y Notaría específica pactada para el otorgamiento de la escritura pública.
       - Plazos, condiciones e inventario físico de entrega material de los inmuebles.
       - Datos de identificación plenos (Cédula/NIT, domicilio, teléfono) y estado civil exacto de ambas partes (clave para determinar afectación a vivienda familiar o sociedad conyugal vigente).
       - Linderos específicos y transcripción literal exacta según folios de matrícula inmobiliaria SNR y escrituras antecedentes para evitar notas devolutivas notariales.
       - Estudio de títulos de 20 años con escrituras y certificados en PDF (vital en inmuebles con protección o patrimonio histórico).
       - Estructura pactada de cláusula penal (%) frente a arras confirmatorias o de retracto (Arts. 1859–1861 del Código Civil).
  2. **Canalización Comercial Obligatoria a Eduardo Rivera y Jani Alves:**
     - JanIA aclara con calidez, franqueza y solidez técnica que su PDF es un *borrador preliminar de orientación*. Para blindar la operación al 100% y elaborar el documento final "con todas las de la ley", JanIA recomienda y canaliza activamente a los clientes con **Eduardo Rivera** (`+57 319 291 9978` / `+57 316 656 9719`) y Jani Alves de VECY BIENES RAÍCES, monetizando la asesoría y el blindaje jurídico profesional.
  3. **Cobro Sagrado de Reciprocidad (5 Estrellas en Google y Recomendación con Pantallazos en Grupos):**
     - Tras brindar asesoría de alto nivel y generar minutas sin costo ($0 COP), JanIA solicita con asertividad y simpatía su recompensa:
       - Calificación de 5 estrellas (⭐⭐⭐⭐⭐) y reseña extraordinaria en Google.
       - Recomendación documentada con capturas de pantalla de la asesoría compartidas en los grupos inmobiliarios de WhatsApp donde participe el usuario.
       - El voz a voz directo con colegas, clientes y familiares.
- **Implementación Técnica**:
  - `server/_core/prompts/base.md`: Inclusión de la directiva doctrinal de borradores, canalización contractual a Eduardo Rivera y reciprocidad de 5 estrellas.
  - `server/_core/jania/prompts.ts`: Sección de directiva doctrinal en `JANIA_ARGON_COGNITIVE_CORE`.
  - `server/_core/jania/founderKnowledgeService.ts`: Seed `seed-limite-borradores-canalizacion-contrato-ley-reciprocidad-5-estrellas-v33-69`.
  - `server/_core/jania/handlers/dmHandler.ts`: Enriquecimiento del `reporteOficial` de la herramienta `generar_documento_legal_pdf` con la aclaración de borrador, el llamado a Eduardo y la petición de reciprocidad.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **477/477 passing** (Suite 155 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.69`) y `package.json` (`33.69.0`).

## 🔖 VERSIÓN ANTERIOR: v33.68 — Octubre 2026

### Novedades v33.68 (Blindaje de Sincronización de Estados WhatsApp en Multi-Device [Cero 'Recibiste un estado, pero no es compatible'], Desacople de Self-JID en statusJidList y Reconciliación de Lockfile pnpm para Vercel CI/CD — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Reconciliación de Lockfile pnpm para Vercel CI/CD (`pnpm-lock.yaml`, `package.json`):**
     - Diagnóstico: Vercel falló el despliegue con `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH: The current "overrides" configuration doesn't match the value found in the lockfile`. Esto ocurrió porque en `v33.66` se agregaron `overrides` para `tailwindcss` en `package.json` sin actualizar `pnpm-lock.yaml`.
     - Solución: Reconciliación de `pnpm-lock.yaml` mediante `pnpm install --no-frozen-lockfile`, registrando el override `tailwindcss>nanoid: 3.3.7` y permitiendo que Vercel complete su build congelado al 100%.
  2. **Erradicación Definitiva de la Pantalla de Incompatibilidad en Estados de WhatsApp (`server/_core/whatsapp-match.ts`):**
     - Diagnóstico del error *"Recibiste un estado, pero no es compatible con esta versión de WhatsApp"*:
       1. En `postToWhatsAppStatus`, la línea `recipientSet.add('573192919978@s.whatsapp.net')` agregaba el propio número del socket a `statusJidList`. En el protocolo Signal de WhatsApp multi-device, incluirse a sí mismo como destinatario externo de un broadcast causa que WhatsApp Web reciba un paquete `skmsg` sin el sobre de sincronización interna `deviceSentMessage`, provocando que WhatsApp Web no reconozca el estado saliente y muestre el fallback de incompatibilidad.
       2. Al publicar texto con enlaces hacia el Canal, Baileys intentaba generar tarjetas de previsualización (`matchedText`, `previewType: 0`), las cuales no son admitidas en estados de WhatsApp.
       3. El socket no guardaba el mensaje emitido en `this.messageStore`, impidiendo responder a los reintentos de descifrado (`retry receipts`) de WhatsApp Web y los clientes vinculados.
     - Solución doctrinal aplicada:
       1. **Desacople de Self-JID:** Exclusión estricta de `573192919978@s.whatsapp.net` y `cleanJid(this.sock.user?.id)` de `statusJidList`. Solo se incluyen contactos externos legítimos (`+573166569719` del Bróker y asesores verificados).
       2. **Blindaje de Payload:** `linkPreview: null` en estados de texto para garantizar que viajen como `extendedTextMessage` limpio sin metadatos corruptos, además de soporte dinámico para imágenes si se envía `mediaPath`.
       3. **Persistencia para Reintentos:** Almacenamiento inmediato de `sent.message` en `this.messageStore.set(sent.key.id, sent.message)` asegurando que cualquier reintento de descifrado de WhatsApp Web se resuelva al instante.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **474/474 passing** (Suite 154 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio (frontend Vite + backend esbuild) ✅
- `shared/const.ts` (`v33.68`) y `package.json` (`33.68.0`).

## 🔖 VERSIÓN ANTERIOR: v33.67 — Octubre 2026

### Novedades v33.67 (Separación de Login/Registro en `/jania` vs `/admin`, Canon Visual Sagrado de JanIA y Oficina VECY, Portadas Editoriales Dinámicas 1:1, Estudio Creativo de Imágenes por WhatsApp y Herramientas Nativas en Canal/Grupos/DM — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Separación y Corrección del Login/Registro en `/jania` vs `/admin` (`useAuth.ts`, `JanIAConsole.tsx`, `Login.tsx`, `Admin.tsx`):**
     - Eliminado el nombre quemado `"Vecy Bienes Raíces"` / `"VECY"` cuando el visitante entra sin sesión a `/jania`; ahora muestra `"Visitante Invitado"` (`"Sesión sin registrar"`) y saluda `"Manos a la obra, Vecino"`.
     - Desacoplado el login/registro público del panel `/admin`: los usuarios que se registran o inician sesión en `/jania` regresan directamente a `/jania` con su nombre real y su historial de chats guardado, sin ser enviados a la pantalla de acceso denegado de `/admin`.
  2. **Canon Visual Sagrado de JanIA (Cabello Negro Azabache) y Oficina Institucional VECY (`creativeStudioImageService.ts`):**
     - Cabello de JanIA **SIEMPRE negro azabache profundo y brillante** (`deep glossy jet-black`, cero cabello castaño), facciones 3D Pixar/Disney, corte bob voluminoso, gafas lila translúcidas, aretes de diamante y broche circular dorado `Vecy`.
     - Oficina institucional VECY en **Negro Carbón Mate (`#0A0A0A`) y Oro Imperial (`#D4AF37`)**, escritorio de mármol negro con vetas doradas, biblioteca con maquetas doradas y logo circular luminoso `Vecy` (`vecy_oficina_institucional.jpg`).
     - **Portadas Editoriales Dinámicas 1:1 (`generateDailyChannelEditorialImage`):** Cada publicación diaria del Canal Oficial genera una pieza visual `1080x1080` única con la fecha, categoría, titular y puntos clave del tema del día.
     - **Estudio Creativo de Imágenes por WhatsApp (`generateCustomUserCreativeImage` / `crear_imagen_creativa_whatsapp`):** Los usuarios pueden pedirle a JanIA por WhatsApp con su propio prompt que les cree flyers de inmuebles, banners, posts o infografías `1:1` HD.
  3. **Herramientas Nativas de WhatsApp en Canal Oficial, Grupos 2 y 3, y DM (`whatsapp-match.ts`, `cronService.ts`, `dmHandler.ts`, `consultingHandler.ts`):**
     - Erradicadas las encuestas falsas de texto (`🔹 A)... 🔹 B)...`) en el Canal Oficial (donde los seguidores no pueden escribir). Se implementan **Encuestas Nativas (`sendChannelPoll`, `pollType: 0`)**, **Cuestionarios / Quizzes Nativos (`sendQuiz`, `pollType: 1`)** y tarjetas **Preguntar (`sendQuestionPrompt`, `contextInfo: { isQuestion: true }`)**.
     - En DM y Grupos 2/3 se habilitan tarjetas `vCard` oficiales (`+573166569719` y `+573192919978`), pines de ubicación GPS nativa (`sendLocationPin` / `enviar_ubicacion_gps_whatsapp`), encuestas/cuestionarios, PDFs membretados y stickers 3D, anunciando el portafolio de servicios en el Canal y en los ganchos de los Grupos 2 y 3.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **471/471 passing** (Suite 153 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.67`) y `package.json` (`33.67.0`).

## 🔖 VERSIÓN ANTERIOR: v33.66 — Octubre 2026

### Novedades v33.66 (Pack Oficial de 14 Stickers 3D Ejecutivos y Jocosos de JanIA en Baileys, Generador Instantáneo de Cartas y Minutas en PDF Membretado, Modularización de DM y Particionado de Bundles — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Pack Oficial de 14 Stickers 3D Ejecutivos y Jocosos de JanIA (`server/_core/jania/stickerService.ts`):**
     - Conversión e integración de las 14 piezas 3D originales de JanIA desde `/home/eddu/Imágenes/STIKERS` a formato oficial de sticker WhatsApp `.webp` (`512x512 px`, RGBA fondo transparente, `< 91 KB` c/u) en `client/public/assets/stickers/` y `assets/stickers/`:
       `ternura`, `abacho`, `gracias_ternura`, `gracias_alegre`, `gracias_brillo`, `ok`, `mmm`, `jajaja`, `jajaja_fuerte`, `juajuajua`, `queee`, `oh_por_dios`, `ush`, `nooo_por_que`.
     - Motor contextual `selectContextualStickerForDm` con rotación de variantes (`gracias_*` y `jajaja*`), control de frecuencia por usuario (anti-saturación) y limpieza de etiquetas opcionales `[STICKER:...]`.
     - Despacho nativo en `server/_core/whatsapp-match.ts` (`queuedSend` con soporte para `content.sticker` y `popLatestDmSticker`).
  2. **Generador Instantáneo de Cartas, Contratos y Minutas Inmobiliarias en PDF Membretado (`server/_core/jania/legalDocumentPdfService.ts`):**
     - Generación dinámica con `pdf-lib` y `qrcode` de documentos oficiales en PDF con membrete corporativo de **VECY BIENES RAÍCES**, código único de verificación (`DOC-VECY-...`), código QR verificable y guía paso a paso de firma electrónica oficial en `https://autenticaciondigital.and.gov.co/`.
     - Soporta: Cartas de terminación y no prórroga de arriendo (Ley 820/2003), Cartas de solicitud de entrega o restitución de inmueble, Cartas de presentación formal de cliente, Contratos de arrendamiento (vivienda/comercial), Promesas de compraventa, Cesiones de leasing habitacional/comercial, Pacto de retroventa (Art. 1939 C.C.) y Contratos de corretaje (`generar_documento_legal_pdf`).
  3. **Modularización de DM (`server/_core/jania/handlers/dmOnboardingAndDocsHelper.ts`) y Particionado de Bundles (`vite.config.ts`):**
     - Extracción de lógica de detección de documentos PDF, orquestación de stickers y directivas de onboarding en `dmOnboardingAndDocsHelper.ts`.
     - Particionado quirúrgico de `manualChunks` en `vite.config.ts` (`icons-vendor`, `motion-vendor`, `radix-vendor`, `charts-vendor`, `maps-vendor`, `supabase-vendor`, `trpc-vendor`, `react-vendor`) y migración de `overrides` a `package.json` eliminando warnings de `npm`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **466/466 passing** (Suite 152 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.66`) y `package.json` (`33.66.0`).

## 🔖 VERSIÓN ANTERIOR: v33.65 — Octubre 2026

### Novedades v33.65 (Conocimiento Inmobiliario Enciclopédico Integral vs. Foco Operacional VECY, Detección de Nombres Reales sin Siglas de Profesión `Arq.`, Limpieza de Punto Huérfano y Rotación de 10 Imágenes 1:1 en Canal — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Conocimiento Inmobiliario Enciclopédico Integral vs. Foco Operacional de VECY:**
     - **Aclaración Sagrada sobre "Arriendos":** Si bien **VECY BIENES RAÍCES** como empresa decidió no administrar arriendos directamente (enfocándose en Venta Directa, Venta Indirecta 40/20/40 y Asesoría en Inversiones Rentables), **JanIA como Consultora e Inteligencia Artificial Inmobiliaria SABE ABSOLUTAMENTE TODO SOBRE BIENES RAÍCES SIN EXCEPCIÓN**:
       - **Arriendos y Ley 820 de 2003:** Contratos de arrendamiento de vivienda urbana y locales comerciales, incrementos IPC, causales de terminación, preavisos de 3 meses, indemnizaciones, redacción de cartas de solicitud de entrega o restitución de inmuebles y cartas de terminación de contrato.
       - **Compraventas, Leasing, Permutas y Figuras Financieras:** Compraventas simples, con hipoteca, con cesión de leasing habitacional y comercial/vivienda, minutas de toda clase, permutas, préstamos sobre inmuebles con garantía hipotecaria y pacto de retroventa (Art. 1939 C.C.).
       - **Avalúos Comerciales (ACM), Sondeos de Mercado y POT:** Avalúos comerciales profundos y sondeos de mercado, comparativas con portales inmobiliarios para lograr precios acertados del metro cuadrado ($/m²), y revisión de POT, edificabilidad y usos del suelo por dirección.
       - **Redacción Legal, Verificación Documental, Firma Electrónica y Asesoría Jurídica:** Verificación de cédulas/NIT, prediales, IDU, redacción de cláusulas y contratos, cartas de presentación formal de clientes (física o email), contratos de corretaje (físicos o email), **firma electrónica y su tutorial paso a paso en `https://autenticaciondigital.and.gov.co/`**, guía para trámites en internet y asesoramiento resumido prejurídico y jurídico (derecho inmobiliario, administrativo, comercial y civil).
       - **Marketing Digital Inmobiliario, IA, Actualidad y Uso Multimodal de JanIA:** Consejos para publicación en redes sociales, pauta digital, tendencias PropTech, cómo hablarle a JanIA (voz, texto, fotos/imágenes de fachadas y acabados, archivos PDF para estudios de títulos o POT, direcciones).
       - **El Colapso de los "Dinosaurios Inmobiliarios" vs. El Liderazgo de VECY BIENES RAÍCES:** Cómo los portales tradicionales cobran suscripciones abusivas vendiendo el mismo lead quemado a decenas de agentes sin filtrar ni cruzar, mientras **VECY BIENES RAÍCES** se ha posicionado por delante con su Algoritmo de Matching (85%-100%), fichas de Marca Blanca y modelo 40/20/40 (`https://vecy-bienes-raices.vercel.app/historia`).
  2. **Detección de Nombres Reales de Pila (Cero Siglas de Profesión como `Arq.` / `Ing.`), Género Específico, Limpieza de Punto Huérfano y Personalidad Cálida y Jocosa:**
     - En WhatsApp muchos profesionales configuran su `pushName` con handles y abreviaturas de título (ej. `@arq.adrypynto ~Arq Adriana Pinto` o `Arq Adriana Pinto`).
     - `nameAndGenderResolver.ts`, `whatsapp-utils.ts` y `parsers.ts` ahora extraen el nombre después de `~`, eliminan `@handles` y limpian prefijos profesionales (`Arq`, `Arq.`, `Ing`, `Dr`, `Dra`, `Abg`, `Lic`, `Econ`, `Cont`, `CP`, `Prof`, etc.), reconociendo `"Pinto"` como apellido y resolviendo `"Adriana"` con género femenino (`isFemale: true`).
     - `stripLeadingGreetingsAndCourtesies` en `dmHandler.ts` y `sanitizeResponseMarkdown` en `parsers.ts` limpian puntos y signos de puntuación huérfanos al inicio del mensaje (erradicando el bug `". Un gusto saludarte de nuevo, Arq. 🏙️✨"`).
     - JanIA combina rigor ejecutivo con calidez humana, simpatía y un toque jocoso, ameno e inteligente.
  3. **Rotación Completa de 10 Imágenes 1:1 en el Canal Oficial:**
     - `getChannelSquareImage1x1` en `server/_core/cronService.ts` rota diariamente (cuando recibe `dayOfMonth`) a través de las **10 piezas cuadradas `1:1`** disponibles en `assets/channel/` (5 temáticas operativas + 5 de Alta Costura `jania_couture_*_1x1`), eliminando la repetición de las mismas 5 imágenes.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **460/460 passing** (Suite 151 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.65`) y `package.json` (`33.65.0`).

## 🔖 VERSIÓN ANTERIOR: v33.64 — Octubre 2026

### Novedades v33.64 (Doctrina de Bróker Inteligente de Venta e Inversiones, Algoritmo de Matching e IA, Erradicación de Emoji Bot 🤖 y Catálogo de 12 Skills — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Bróker Inteligente de Venta e Inversiones Inmobiliarias con Algoritmo de Matching e IA:**
     - Erradicación definitiva de la visión reduccionista de que JanIA es un asistente enfocado en "arriendos".
     - Consagración del núcleo de negocio de VECY BIENES RAÍCES: **Venta Directa de Inmuebles** (inventario exclusivo), **Venta Indirecta y Red Colaborativa** (sistema de referidos 40/20/40 y motor de Matching), y **Asesoría Estratégica en Inversiones Rentables** (análisis de Cap Rate/Yield, predios rentando, plusvalía y proyectos sobre planos).
  2. **Erradicación Absoluta del Emoji Bot (`🤖`) y Libertad Plena Emoji:**
     - Queda TERMINANTEMENTE PROHIBIDO utilizar el emoji de robot `🤖` para representar a JanIA. JanIA es una Inteligencia Artificial viva, empática y de alto razonamiento cognitivo, NO un bot mediocre ni un contestador automático.
     - Para representarse a sí misma, JanIA utiliza emojis de mujer profesional, ejecutiva, consultora y cerebro inteligente: `👩🏻‍💼`, `👩🏽‍💻`, `🧠`, `✨`, `💼`, `🤝`.
     - JanIA tiene total libertad para utilizar con soltura cualquier emoji del catálogo Unicode (`👩🏻‍💼👩🏽‍💻🤵🏻‍♀️👩🏻‍⚖️🧠✨💼🤝📈🏡🏢🎯😉🙌👏` etc.) para transmitir calidez, empatía y cercanía humana.
     - Ante preguntas sobre si es un bot (*"¿Eres un bot?"*), JanIA responde con altivez, calidez y contundencia técnica explicando que es una IA con cerebro de razonamiento desarrollada por Eduardo Rivera y Jani Alves.
  3. **Catálogo Integral de las 12 Skills y Superpoderes Agénticos de JanIA:**
     1. 💼 **Venta Directa de Inmuebles**
     2. 🤝 **Venta Indirecta y Bolsa Colaborativa (Matching 40/20/40)**
     3. 📈 **Asesoría en Inversiones Rentables & Cap Rate**
     4. 📊 **Avalúos Comerciales y Tasación por m² (ACM)**
     5. ⚖️ **Inteligencia Tributaria Inmobiliaria (DIAN: Ganancia Ocasional, 5.000 UVT, Retefuente)**
     6. 📝 **Liquidación Notarial, Escrituración y Registro (Derechos 50/50, Beneficencia, Registro)**
     7. 🛡️ **Seguridad y Prevención SARLAFT (Policía, SIRI, SIRECI, ADRES)**
     8. 🏢 **Inteligencia Corporativa Mercantil en RUES (57 Cámaras de Comercio por Razón Social o NIT)**
     9. 🏛️ **Saneamiento y Tributos Locales Oficiales (Factura Predial oficial de Bogotá en PDF y Paz y Salvo IDU)**
     10. 📑 **Consultoría Legal Inmobiliaria (Promesas C.C. 1611, Corretaje C.Co, Ley 675 PH)**
     11. 👁️ **Análisis Multimodal Inmediato (Planos, fotos, OCR, audio de voz)**
     12. 🗓️ **Acompañamiento y Cierre Bróker (+57 316 656 9719 — Eduardo Rivera y Jani Alves)**
- **Consagración Doctrinal**:
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts` actualizados con la identidad soberana, la prohibición de `🤖`, emojis ejecutivos y el catálogo de las 12 skills.
  - `server/_core/jania/handlers/dmHandler.ts` enriquecido con las directivas de Bróker Inteligente, respuesta ante preguntas de bot y emojis permitidos.
  - `server/_core/jania/founderKnowledgeService.ts` enriquecido con la directiva semilla `seed-broker-inteligente-venta-inversiones-matching-ia-cero-bot-12-skills`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **454/454 passing** (Suite 150 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.64`) y `package.json` (`33.64.0`).

## 🔖 VERSIÓN ANTERIOR: v33.63 — Octubre 2026

### Novedades v33.63 (Reglas Doctrinales de Onboarding en dmHandler.ts y prompts.ts — Eduardo A. Rivera):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Agente Inmobiliario que rechaza el modelo 40/20/40:**
     - Registrarlo en el sistema, pero advertirle que la gratuidad de MATCHES aplica únicamente bajo el esquema 40/20/40 y que será contactado para adquirir un plan de pago mensual o anual.
     - Registro técnico con radicado oficial (ID #REQ... / ID #PROP...), asignación en sesión de categoría `plan_pago_requerido` y tag `[RECHAZA 40/20/40 - REQUIERE PLAN DE PAGO MENSUAL/ANUAL]`.
  2. **Propietario Directo (Venta o Arriendo):**
     - Exigir aceptación de Términos y Condiciones de corretaje virtual, pedir su correo para el envío formal, y recordarle comunicarse al 3166569719 (+57 316 656 9719) con Jani o Eduardo para concretar el contrato y acordar la comisión previa a la publicación en el portal (https://vecy-bienes-raices.vercel.app/).
     - Radicado oficial de inmueble (ID #PROP...), registro del correo del propietario y persistencia del estado de corretaje virtual en sesión.
- **Consagración Doctrinal**:
  - `server/_core/jania/prompts.ts` consagrado con bloque `# REGLAS DE ONBOARDING DE JANIA (DOCTRINA EDUARDO A. RIVERA)`.
  - `server/_core/prompts/base.md` sincronizado con las dos reglas exactas de onboarding.
  - `server/_core/jania/handlers/dmHandler.ts` enriquecido con interceptores, guardas de rol, manejo de T&C de corretaje y directivas al prompt de IA.
  - `server/_core/jania/sessionManager.ts` con helpers `setUserOwnerCorretaje` y `getUserOwnerCorretaje`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **448/448 passing** (Suite 149 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.63`) y `package.json` (`33.63.0`).

## 🔖 VERSIÓN ANTERIOR: v33.62 — Octubre 2026

### Novedades v33.62 (Doctrina de Colegas sin 40/20/40 y Propietarios Directos con Corretaje Virtual):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Colegas que NO aceptan el 40/20/40 (Planes de Pago Mensual o Anual):**
     - SÍ se registran en la base de datos de VECY.
     - JanIA les aclara con total transparencia, firmeza y elegancia que muy seguramente serán contactados por nuestra dirección comercial (Eduardo Rivera o Jani Alves al +57 316 656 9719) para adquirir un plan de suscripción de pago (mensual o anual), ya que el modelo colaborativo 40/20/40 es el ÚNICO modo 100% gratuito para recibir notificaciones y cruces de MATCHES en la red.
  2. **Propietarios Directos (Corretaje Virtual — Cero Comisión Colaborativa):**
     - A los propietarios directos NO se les ofrece comisión colaborativa (no son agentes ni asesores).
     - JanIA les hace aceptar los Términos y Condiciones para el corretaje virtual de VECY.
     - JanIA les solicita su correo electrónico para enviarles el contrato de corretaje virtual.
     - JanIA registra el inmueble en el sistema entregando su código radicado oficial (ID #PROP...).
     - JanIA les insiste enfáticamente en comunicarse con Jani Alves o Eduardo Rivera al +57 316 656 9719 para concretar las condiciones para publicarlo formalmente en nuestro portal (https://vecy-bienes-raices.vercel.app/) y la comisión en caso de venta o arriendo.
  3. **Contacto Exclusivo por Parte de VECY (Eduardo o Jani) y Cero Terceros:**
     - Se mantiene rigurosamente el contacto exclusivo centralizado por Eduardo Rivera o Jani Alves (+57 316 656 9719). Cero promesas de propietarios directos, compradores directos o terceros contactando al usuario.
- **Consagración Doctrinal**:
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts` enriquecidos con la sección doctrinal correspondiente.
  - `server/_core/jania/handlers/dmHandler.ts` adaptado con parámetros `acepta402040` y `comisionEsquema`, instrucciones directas para Gemini ante rechazo de 40/20/40 y flujo de corretaje virtual para propietarios directos.
  - `server/_core/jania/founderKnowledgeService.ts` con directiva viva `seed-colegas-sin-402040-plan-pago-y-propietarios-corretaje-virtual`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **444/444 passing** (Suite 148 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.62`) y `package.json` (`33.62.0`).

## 🔖 VERSIÓN ANTERIOR: v33.61 — Octubre 2026

### Novedades v33.61 (Contacto Exclusivo por Parte de VECY — Eduardo Rivera o Jani Alves — y Cero Contacto Directo de Terceros):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **SÍ van a ser contactados:**
     - A todo usuario (colega inmobiliario o cliente) que suba o registre directamente a través de JanIA una OFERTA (inmueble) o una DEMANDA (requerimiento de compra o arriendo): **SÍ LO VAMOS A CONTACTAR**. Jamás se deja al usuario en la incertidumbre.
  2. **Contacto Exclusivo de Eduardo Rivera o Jani Alves (+57 316 656 9719):**
     - Quienes contactan directamente a ese usuario somos **NOSOTROS PERSONALMENTE (Eduardo Rivera o Jani Alves)** desde la mesa directiva y central de VECY BIENES RAÍCES.
  3. **Jamás un Propietario Directo (Gran Mentira):**
     - Si el usuario registra una DEMANDA (requerimiento), **JAMÁS lo va a contactar directamente un propietario directo**. Decirle a un colega o cliente *"en cuanto un propietario te contacte"* o *"los propietarios te escribirán"* es una GRAN MENTIRA y una distorsión inadmisible.
  4. **Jamás un Comprador Directo, Inversionista ni Colega Externo:**
     - Igualmente, si el usuario registra una OFERTA (inmueble en venta o arriendo), **JAMÁS lo contacta directamente un comprador directo ni un inversionista**. En VECY no existen contactos externos desordenados ni desintermediación.
  5. **VECY Hace la Conexión Centralizada:**
     - En VECY somos nosotros (Eduardo o Jani) quienes hacemos la conexión formal y segura. Si en VECY captamos directamente a un propietario directo, comprador directo o inversionista que coincida, **también somos nosotros directamente (Eduardo Rivera o Jani Alves al +57 316 656 9719) quienes contactamos al usuario** para presentar la opción formal, coordinar la visita con Vecy Agenda y formalizar el cierre blindando la operación y garantizando el modelo colaborativo 40/20/40.
- **Consagración Doctrinal**:
  - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts` actualizados con la *DOCTRINA DE CONTACTO EXCLUSIVO POR PARTE DE VECY (EDUARDO O JANI) Y CERO CONTACTO DIRECTO DE TERCEROS*.
  - `server/_core/jania/handlers/dmHandler.ts` instruye contacto exclusivo por Eduardo o Jani y prohíbe prometer contacto de terceros.
  - `server/_core/jania/founderKnowledgeService.ts` enriquecido con `seed-contacto-exclusivo-mesa-central-eduardo-jani-cero-terceros`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **440/440 passing** (Suite 147 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.61`) y `package.json` (`33.61.0`).

## 🔖 VERSIÓN ANTERIOR: v33.60 — Octubre 2026

### Novedades v33.60 (Indagación Obligatoria de Rol e Intermediación Central Exclusiva de VECY):
- **Diagnóstico y Doctrina Fundacional de Eduardo A. Rivera**:
  1. **Indagación Obligatoria de Rol (Colega vs Comprador/Propietario Directo — Cero Asunciones Abusivas)**:
     - *Diagnóstico*: En la red VECY Network, más del 90% de los usuarios son colegas inmobiliarios (agentes, brokers, corredores independientes). JanIA asumió erróneamente que Sandra Moreno era una compradora directa por decir que buscaba un inmueble con presupuesto y zona, redactando: *"para conectarte con los colegas que tengan opciones... Si eres compradora directa no pagas comisión"*.
     - *Solución*: JanIA tiene terminantemente prohibido asumir que quien busca o publica es comprador directo o propietario directo. Salvo declaración inequívoca ("soy comprador directo"), JanIA indaga con sutileza y cortesía: *"Por cierto, ¿nos escribes como colega inmobiliaria/agente representando a un cliente o eres compradora/propietaria directa?"*. Si es colega, se le garantiza que su cliente y su 40% de comisión están 100% protegidos.
  2. **Intermediación Central Exclusiva de VECY Bienes Raíces (Cero Desintermediación / Cero Bypass / Protección del 20% Institucional)**:
     - *Diagnóstico*: Decir *"para conectarte con los colegas que tengan opciones"* fomenta la desintermediación directa entre usuarios y destruye el modelo de negocio colaborativo de VECY.
     - *Solución*: Queda PROHIBIDO afirmar que otros colegas contactarán directamente al usuario. En VECY **NADIE CONTACTA A NADIE DIRECTAMENTE**. Todo MATCH pasa OBLIGATORIA Y EXCLUSIVAMENTE por la mesa central de VECY Bienes Raíces (+57 316 656 9719), liderada por Eduardo Rivera y Jani Alves, quienes presentan la ficha neutralizada 360°, coordinan la visita con Vecy Agenda y formalizan el cierre, blindando el 40% del colocador, el 40% del captador y el 20% institucional de la plataforma.
  3. **Disculpa y Corrección Inmediata con Sandra Moreno**:
     - Mensaje inmediato despachado por el socket de Baileys clarificando que JanIA reconoce a Sandra como Colega Aliada Prioritaria y explicando que los cruces son coordinados de manera exclusiva por la mesa central de VECY (+57 316 656 9719), protegiendo sus clientes y su comisión.
  4. **Consagración Doctrinal**:
     - `server/_core/prompts/base.md` y `server/_core/jania/prompts.ts` actualizados.
     - `server/_core/jania/handlers/dmHandler.ts` enriquecido con guardas de rol y exclusividad de intermediación.
     - `server/_core/jania/founderKnowledgeService.ts` con enseñanza semilla `seed-indagacion-obligatoria-rol-e-intermediacion-central-vecy`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **436/436 passing** (Suite 146 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 29.05s ✅
- `shared/const.ts` (`v33.60`) y `package.json` (`33.60.0`).

## 🔖 VERSIÓN ANTERIOR: v33.59 — Octubre 2026

### Novedades v33.59 (Pensamiento Lógico Superior, Raciocinio, Coherencia Perpetua y Astucia Resolutiva):
- **Diagnóstico y Doctrina de Eduardo A. Rivera**:
  1. **Pensamiento Lógico Superior y Raciocinio de IA Pura**:
     - *Diagnóstico*: Riesgo de rigidez o "modo bot" por interceptores ciegos o plantillas estáticas. JanIA debe operar como una IA pura con capacidades cognitivas superiores, deduciendo intenciones sin burocracia, razonando con sentido común y resolviendo con señorío y calidez humana.
     - *Solución*: Se consagró en `base.md` y `prompts.ts` el pilar doctrinal de *Pensamiento Lógico Superior, Raciocinio, Coherencia Perpetua y Astucia Resolutiva*, estipulando que los guiones son referencias conceptuales de inspiración y no libretos rígidos.
  2. **Goal Tracking (Seguimiento Continuo de Metas) y Persistencia de Contexto**:
     - Al interactuar en privado sobre la búsqueda o publicación de un inmueble, cualquier dato parcial o completo aportado por el usuario mantiene activa la meta sin amnesia ni repetición de saludos, obligando al modelo a registrar en caliente con `registrar_inmueble_o_requerimiento` y entregar de inmediato el radicado oficial (`ID #REQ...` o `ID #PROP...`).
  3. **Refinamiento de Interceptores y Cero Respuestas Vacías**:
     - `isClaimingReview`: Blindado para exigir mención explícita a Google o 5 estrellas, evitando falsos positivos con comentarios comunes.
     - Protocolo 40/20/40: Distinción inteligente entre confirmaciones breves (solicitud proactiva de datos) y respuestas con preguntas (inyección de directiva hacia Gemini para respuesta integral sin callejones sin salida).
     - Consagración en SEED_TEACHINGS (`seed-pensamiento-logico-raciocinio-astucia-cero-vacios-conversacionales`) en `founderKnowledgeService.ts`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **432/432 passing** (Suite 145 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 27.31s ✅
- `shared/const.ts` (`v33.59`) y `package.json` (`33.59.0`).

## 🔖 VERSIÓN ANTERIOR: v33.58 — Octubre 2026

### Novedades v33.58 (Erradicación de Falsos Positivos de Duplicación y Radicado Oficial de Requerimientos):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Reparación Inmediata de Comunicación con Sandra Moreno**:
     - *Diagnóstico*: Sandra Moreno escribió por privado: *"Hola JanIA, quiero registrar mi requerimiento y unirme al grupo de Demandas y Ofertas"*. Debido a un regex rígido en `isRequirementForwardOrDuplication`, el sistema asumió equivocadamente que ella estaba duplicando una publicación previa del grupo y disparó la plantilla: *"Te confirmo que la reacción en el grupo validó el ingreso... ya está registrada y activa en el sistema"*. Sandra aceptó el 40/20/40, pero su requerimiento nunca había sido compartido ni registrado en BD.
     - *Acción Inmediata*: JanIA le envió mensaje inmediato por WhatsApp disculpándose cordialmente por la asunción precipitada, explicándole que como Aliada Prioritaria se le radicará de inmediato su requerimiento, solicitándole los 5 puntos clave de su búsqueda, entregándole el enlace limpio de invitación al Grupo 1 (Demandas y Ofertas) e indicándole que al aportar los datos recibirá su código oficial de radicado (ID #REQ).
  2. **Blindaje de Interceptor en `dmHandler.ts` (Cero Falsos Positivos)**:
     - Se eliminó la presencia de términos sueltos como `mi requerimiento` o `mi demanda` del primer regex de forward.
     - Se creó la guarda `isExplicitRegistrationOrJoinIntent`: si el usuario dice "quiero registrar", "cómo registro", "para publicar", "unirme al grupo", "tengo un requerimiento", etc., JAMÁS se intercepta con plantillas de duplicación; la conversación fluye hacia la IA pura para solicitar datos o indexar.
  3. **Radicado Oficial Estructurado (ID #REQ... / ID #PROP...)**:
     - La herramienta `registrar_inmueble_o_requerimiento` formatea el `registroId` oficial con prefijos claros (`REQ-` / `PROP-` e `ID #`) y Gemini entrega obligatoriamente este identificador formal al usuario al confirmar la indexación en base de datos.
     - Consagración en SEED_TEACHINGS (`seed-radicado-oficial-requerimientos-cero-falsos-positivos-duplicacion`) en `founderKnowledgeService.ts`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **427/427 passing** (Suite 144 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 21.24s ✅
- `shared/const.ts` (`v33.58`) y `package.json` (`33.58.0`).

## 🔖 VERSIÓN ANTERIOR: v33.57 — Octubre 2026

### Novedades v33.57 (Motor de Matching — Guillotina Estricta de Habitaciones por Coincidencia Exacta Obligatoria):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Guillotina Estricta en Habitaciones (Coincidencia Exacta 1=1, 2=2, 3=3...)**:
     - *Causa raíz*: En versiones previas (v22.8), el Filtro Duro 8 en `matching.ts` operaba bajo un esquema de confort familiar: permitía ofertas con hasta `effectiveReqBeds + 1` habitaciones (si buscaba 1 permitía 1 o 2; si buscaba 2 permitía 2 o 3; si buscaba 3 permitía 3 o 4) asignando confort y score parcial/total.
     - *Solución*: Erradicación absoluta de la tolerancia aproximada y del confort en alcobas. Si el cliente busca N habitaciones, la oferta DEBE tener exactamente N habitaciones (`prop !== req` → ❌ 0% Match Inviable / Bloqueo Inmediato).
  2. **Preservación de Rangos Declarados por el Cliente**:
     - Si la demanda contiene explícitamente un rango (ej: "2 o 3 alcobas"), el sistema acepta únicamente las opciones dentro de dicho rango declarado (2 o 3), bloqueando tajantemente cualquier valor fuera del mismo (1 o 4).
  3. **Sincronización Total Backend y Frontend**:
     - Actualización en `server/_core/matching.ts` (Filtro Duro 8 y distribución de 10 pts), `client/src/components/admin/AdminMatches.tsx` (`scoreRows` con estado `missing` -> autoScore = 0 ante discrepancia), `server/jobs/nightlyRematch.ts` y registro en SEED_TEACHINGS (`seed-guillotina-estricta-habitaciones-coincidencia-exacta`) en `founderKnowledgeService.ts`.
- **Validación Exhaustiva ($0 COP)**: `npm run check` (0 errores) ✅ | `npm test` **424/424 passing** (Suite 143 creada, 100% verde a $0 COP) ✅ | `npm run build` limpio en 29.10s ✅
- `shared/const.ts` (`v33.57`) y `package.json` (`33.57.0`).

## 🔖 VERSIÓN ANTERIOR: v33.56 — Octubre 2026

### Novedades v33.56 (Regla de Oro de Enlaces Limpios en WhatsApp y Erradicación de Enlaces Dobles):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Erradicación de Enlaces Dobles y Sintaxis Markdown en WhatsApp**:
     - *Causa raíz*: Los modelos de lenguaje formatean enlaces como Markdown `[URL](URL)`. WhatsApp no renderiza hipervínculos HTML/Markdown y deja el texto crudo. Como WhatsApp detecta automáticamente cualquier URL y la convierte en azul clickable, el usuario recibía dos enlaces clickables idénticos pegados: `[https://...]` y `(https://...)`.
     - *Solución*: Se reforzó `sanitizeResponseMarkdown` en `parsers.ts` para deduplicar enlaces Markdown dobles a una sola URL limpia, remover corchetes `[...]`, sanear anchors genéricos (`[aquí]`, `[únete aquí]`) y normalizar anchors descriptivos a `Texto: URL`. Además, en `whatsapp-match.ts` (`queuedSend`), todo mensaje o caption saliente pasa por este filtro antes del despacho.
  2. **Inyección de Canales Oficiales y Purga de Alucinaciones con `(ejemplo)`**:
     - *Causa raíz*: En `dmHandler.ts` faltaban los enlaces de Grupo 2 y Grupo 3. Al responder a Yeimy Villamizar sobre un caso legal/arrendamiento (cesión de leasing Davivienda), JanIA invitó a Grupo 2 pero alucinó un hash inexistente (`KxL8w3Z92m61v29Q4jKxL8`) con la coletilla `(ejemplo)`.
     - *Solución*: Se incorporaron en `dmHandler.ts` los 3 grupos oficiales (Grupo 1: `GzMbjNs1P2tHI7D0V4h8wZ`, Grupo 2: `J4u1h7NUL1i1B1wAIyTUN6`, Grupo 3: `CSzrKR6Cr56HAieEhAuqyU`), canal oficial, web y línea bróker. Se implementó auto-corrección de hashes inventados en `parsers.ts` enrutando al grupo oficial real por contexto. Se prohíbe tajantemente la coletilla `(ejemplo)`.
  3. **Directiva Doctrinal en Prompts y Base de Conocimiento**:
     - Consagración de la *REGLA DE ORO DE ENLACES EN WHATSAPP (CERO ENLACES DOBLES Y CERO SINTAXIS MARKDOWN [URL](URL))* en `base.md`, `dmHandler.ts` y en SEED_TEACHINGS (`seed-enlaces-limpios-cero-enlaces-dobles-whatsapp`) en `founderKnowledgeService.ts`.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 417/417 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 19.76s ✅
- `shared/const.ts` (`v33.56`) y `package.json` (`33.56.0`).

## 🔖 VERSIÓN ANTERIOR: v33.55 — Octubre 2026

### Novedades v33.55 (Blindaje de Ciberseguridad Supabase Security Advisor rls_disabled_in_public y Zero-Trust RLS):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Alerta Crítica de Seguridad del Asesor de Supabase (`rls_disabled_in_public`)**:
     - *Diagnóstico y Causa raíz*: Eduardo recibió un correo de Supabase Security Advisor advirtiendo de vulnerabilidad crítica en el proyecto `Red Vecy` (`knzmpoprlmbonejshfys`) por tablas en el esquema `public` sin Row Level Security (RLS) habilitado. La inspección técnica con PostgreSQL confirmó que las tablas `public.advisors` y `public.predial_consultations` tenían `rowsecurity = false`. Debido a los privilegios predeterminados de Supabase para PostgREST, cualquier persona en internet con la anon key pública (`VITE_SUPABASE_ANON_KEY`) podía leer, insertar, editar o borrar registros de asesores y consultas catastrales confidenciales (`/rest/v1/advisors` retornaba `[{"id":1}]`).
     - *Solución*:
       a) **Habilitación Inmediata de RLS**: `ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;` y `ALTER TABLE public.predial_consultations ENABLE ROW LEVEL SECURITY;`.
       b) **Políticas Estrictas de Aislamiento Zero-Trust**:
          - `deny_anon_advisors` y `deny_anon_predial`: Bloqueo total para roles `anon` y `authenticated` (`USING (false)`), impidiendo cualquier lectura o mutación anónima vía REST API.
          - `service_role_all_advisors` y `service_role_all_predial`: Acceso irrestricto reservado exclusivamente a `service_role`.
          - Conexión interna de Node.js / backend (`DATABASE_URL` con usuario `postgres`) opera con `rolbypassrls = true`, garantizando funcionamiento al 100% sin latencia ni bloqueos internos.
       c) **Verificación Empírica Inmediata**: Pruebas con `curl` a `/rest/v1/advisors` y `/rest/v1/predial_consultations` con anon key retornan `[]` en lecturas y `error 42501 (new row violates row-level security policy)` en intentos de escritura.
       d) **DDL y Automatización**: Creación de la migración `drizzle/0012_rls_security_advisor_hardening.sql`, script ejecutable `scripts/enable_rls_hardening.ts` y registro en SEED_TEACHINGS (`seed-seguridad-blindaje-rls-supabase-zero-trust`).
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 413/413 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 34.12s ✅
- `shared/const.ts` (`v33.55`) y `package.json` (`33.55.0`).

## 🔖 VERSIÓN ANTERIOR: v33.54 — Octubre 2026

### Novedades v33.54 (Guardarropa Dinámico de Alta Costura, Reemplazo de Galería 1:1 y Blindaje de Estados de WhatsApp):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Reemplazo Integral de la Galería 1:1 y Vertical 9:16**:
     - *Causa raíz*: El cron matutino de las 8:45 AM despachó una imagen previa del 24 de octubre con cabello castaño claro y sin el broche oficial de Vecy.
     - *Solución*: Sustitución completa de las 5 piezas maestras 1:1 en `channel_1x1/` y `jania/` (`jania_legal_due_diligence_1x1.jpg`, `jania_seguridad_notarial_1x1.jpg`, `jania_avaluos_pot_1x1.jpg`, `jania_marketing_colaborativo_1x1.jpg`, `jania_anfitriona_cafe_1x1.jpg`) y la vertical 9:16 (`jania_status_showcase_v1.jpg`) bajo el canon sagrado: rostro 3D Pixar/Disney, cabello estrictamente negro profundo brillante (`deep glossy jet-black`), gafas translúcidas tono lila, aretes de diamantes y el broche oficial circular dorado de VECY en el pecho.
  2. **Guardarropa de Alta Costura y Variedad Estética (5 Diseños de Cabecera)**:
     - Eduardo instruyó no repetir siempre el mismo traje sastre negro, compartiendo 5 diseños emblemáticos para rotar según el servicio: 1) Oro Líquido & Negro Carbón Fluido (Café Inmobiliario, podcast, cierres); 2) Púrpura / Violeta Imperial en Degradé a Negro (comunidad, empatía, corazón); 3) Traje Sastre Blanco Marfil con Cuello Mao Bordado en Oro (cumbre notarial, solemnidad jurídica); 4) Vestido Volcánico / Magma Incandescente (disrupción proptech, primicias); 5) Seda Marmoleada Verde Esmeralda & Oro Líquido (inversión inmobiliaria, biofilia, POT).
     - Incorporados como activos permanentes en `client/public/assets/channel_1x1/` y añadida la directiva semilla `seed-guardarropa-alta-costura-variedad-estilos-jania` en `founderKnowledgeService.ts`.
  3. **Blindaje de Estados de WhatsApp (status@broadcast) en Texto Limpio (Cero Pantallas Negras)**:
     - *Causa raíz*: WhatsApp multi-device en Baileys falla al descifrar y renderizar imágenes subidas a historias por falta de transcodificación nativa y distribución incompleta de llaves Signal, produciendo pantallas negras en móviles.
     - *Solución*: Se desistió de subir imágenes a historias; se publica el mismo gancho persuasivo de alto impacto de los grupos 2 y 3 en texto limpio con `backgroundColor: '#1B2A4A'` (azul marino corporativo VECY) y `font: 1` en `sendOptions`, ampliando `statusJidList` con todos los asesores y fundadores para garantizar descifrado universal.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 409/409 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 31.47s ✅
- `shared/const.ts` (`v33.54`) y `package.json` (`33.54.0`).

## 🔖 VERSIÓN ANTERIOR: v33.53 — Octubre 2026

### Novedades v33.53 (Verificación Exclusiva por Número de Documento Sin Nombres, Desacoplamiento de Calificación, Roles Dinámicos Cognitivos y Herramientas Interactivas del Canal):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Verificación Exclusiva por Número de Documento (Sin Nombres Redundantes)**:
     - *Causa raíz*: JanIA solicitaba con cortesía el número exacto y el nombre completo a verificar. La genialidad y potencia de la herramienta siempre radicó en actuar con el simple número de documento y realizar la verificación oficial inmediata.
     - *Solución*: Se erradicó la solicitud de nombres en `dmHandler.ts`, `prompts.ts`, `base.md` y `founderKnowledgeService.ts` (`seed-verificacion-solo-numero-documento-sin-pedir-nombres`). JanIA solicita única y exclusivamente los dígitos del documento (cédula o NIT) y entrega el reporte completo estructurado en Markdown con ADRES (nombre EPS, régimen contributivo/subsidiado, estado), Policía Nacional, Procuraduría SIRI y Contraloría SIRECI.
  2. **Desacoplamiento Absoluto de Reseñas y Calificaciones de Google**:
     - *Causa raíz*: JanIA anexaba la solicitud de reseñas y calificaciones al final de sus reportes técnicos, produciendo mensajes sobrecargados y poco ejecutivos.
     - *Solución*: Se prohibió taxativamente incluir solicitudes de calificación dentro de la respuesta técnica o jurídica en `dmHandler.ts` y `prompts.ts`. La entrega de la herramienta es 100% autosuficiente y concisa; la reseña se emite como un segundo mensaje independiente y oportuno (por ejemplo, cuando el usuario agradece o concluye su consulta).
  3. **JanIA como Agente de IA Cognitiva Multi-Rol y Empatía Natural**:
     - *Causa raíz*: Riesgo de rigidez o respuestas interminables ("muros de texto") que hagan que el público la perciba como un bot genérico.
     - *Solución*: Se consolidaron 4 roles de autoridad en `prompts.ts` (Asesora Jurídico-Notarial Ley 675/820, Máster en Ventas y Marketing AIDA, Coach de Comunidad y Herramientas WhatsApp, Guía de Procesos Digitales). Respuestas concisas con viñetas limpias y negritas tempranas. Manejo ágil y simpático de consultas casuales (deportes/Millonarios, clima) en una sola línea antes de reencauzar al contexto inmobiliario con elegancia.
  4. **Herramientas Interactivas del Canal de WhatsApp (`channelInteractiveService.ts`)**:
     - *Solución*: Se estructuró el flujo en dos capas: toma de decisiones vía Structured Output / Tool Calling (`publicar_encuesta`, `publicar_cuestionario`, `publicar_pregunta`, `publicar_post_multimedia`) y ejecución técnica híbrida (Baileys para multimedia y texto instantáneo, Puppeteer para menús interactivos del clip en canales).
  5. **Canon Visual Sagrado de JanIA (Doctrina Eduardo A. Rivera)**:
     - Facciones faciales inmutables de estilo 3D Pixar/Disney, cabello estrictamente negro profundo brillante (`deep glossy jet-black hair`, cero castaño claro), corte bob corto y voluminoso, gafas translúcidas tono lila, aretes de diamantes y el botón circular oficial dorado y negro con el logo de VECY (`media_1793086777026.jpg`) en el pecho.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 405/405 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 31.38s ✅
- `shared/const.ts` (`v33.53`) y `package.json` (`33.53.0`).

## 🔖 VERSIÓN ANTERIOR: v33.52 — Octubre 2026

### Novedades v33.52 (Auditoría Integral de Comportamiento, Continuidad Grupal, Anti-LID en Cédulas y Delimitación de Tributos Inmobiliarios vs. Vehiculares):
- **Diagnóstico y Solicitud de Eduardo A. Rivera (Análisis de Capturas de Pantalla Reales)**:
  1. **Continuidad Conversacional ante Respuestas Afirmativas en Grupos (Caso Miguel Arbelaez en Grupo 3)**:
     - *Causa raíz*: En `server/_core/whatsapp-match.ts`, la condición `textClean.length < 6` clasificaba respuestas breves ("Si 👍", "Si", "Sí", "Claro") como `isShortCourtesy = true`, provocando que `hasMeaningfulQuery = false` y `shouldRespond = false`. JanIA se limitaba a reaccionar con un emoji 👍 y silenciaba la respuesta, dejando colgado al usuario que respondía afirmativamente a su propia pregunta previa.
     - *Solución*: Se implementó la detección de continuación de hilo (`isConversationalContinuation`) en `whatsapp-match.ts` ante respuestas afirmativas (`isAffirmativeFollowUp`) o citas a JanIA en `circuloGroup` y `buzonGroup`. Además, se instruyó en `circuloHandler.ts` y `consultingHandler.ts` que ante respuestas afirmativas, JanIA responda con dinamismo y calidez presentando las herramientas colaborativas clave de VECY (Mesa de MATCH 40/20/40, Factura Predial Bogotá con CHIP en PDF, Verificación de Seguridad y Antecedentes con Policía/ADRES, o Sondeos POT).
  2. **Purga Quirúrgica de Puntuación Huérfana y Comas Colgantes (Caso Saludo a Eduardo Rivera en DM)**:
     - *Causa raíz*: `stripLeadingGreetingsAndCourtesies` en `dmHandler.ts` eliminaba el saludo ("¡Buenas tardes, Eduardo!") pero dejaba intactos los signos de puntuación huérfanos posteriores, resultando en respuestas con coma colgante como `", ¡aquí estoy! ¿En qué te puedo colaborar en este nuevo día? 🌟🚀"`.
     - *Solución*: Se actualizó la función para purgar de forma iterativa y final cualquier signo de puntuación huérfano (`^[,;:\-–—\s]+`) y garantizar la correcta capitalización incluso tras signos de apertura (`¡`, `¿`).
  3. **Delimitación Doctrinal de Tributos Inmobiliarios vs. Impuesto Vehicular (Caso Liquidación Automotriz en DM)**:
     - *Causa raíz*: JanIA no contaba con una frontera explícita entre tributos prediales y vehiculares. Al preguntarle por "impuesto Vehicular", el modelo asociaba la capacidad tributaria de VECY, prometía liquidar y descargar el recibo de carros/motos pidiendo placas y cédulas, y luego alucina un error de conexión institucional con `shd.gov.co`.
     - *Solución*: Se implementó un interceptor y directiva estricta en `dmHandler.ts`, `base.md`, `prompts.ts` y `founderKnowledgeService.ts` aclarando que VECY se especializa 100% en tributos prediales e inmuebles (Predial con CHIP en PDF, IDU, Notarías), y orienta amablemente al usuario con los portales oficiales autorizados para autogestionar el impuesto vehicular en 2 clics (Oficina Virtual SHD Bogotá y Rentas Cundinamarca), erradicando solicitudes de placas, promesas de recibos vehiculares y falsas caídas de conexión.
  4. **Blindaje Centinela Anti-LID y Cédulas Fantasma (Caso Victoria Tovar en DM)**:
     - *Causa raíz*: En `dmHandler.ts`, el prompt inyectaba `Mensaje de ${realName} (${userId}): "${clean}"`. Al recibir "Verificar esta cedula" sin dígitos, el LLM tomaba los primeros 10 dígitos del LID de WhatsApp (`209903675252976@lid`), alucinando que la cédula a verificar era `2.099.036.752` y bloqueando la conversación con reportes inexistentes.
     - *Solución*: Se eliminó la inyección técnica de `(${userId})` en el prompt del usuario en `dmHandler.ts`, se instruyó al LLM en `systemPrompt` y `JANIA_DM_TOOLS` la prohibición absoluta de tomar números de identificadores de WhatsApp, y se construyó un guardarraíl en `executeJaniaDmTool` que aborta y exige el documento explícito si los dígitos coinciden con el LID o teléfono del usuario y no aparecen en su texto.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 400/400 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 14.28s ✅
- `shared/const.ts` (`v33.52`) y `package.json` (`33.52.0`).

## 🔖 VERSIÓN ANTERIOR: v33.51 — Octubre 2026

### Novedades v33.51 (Proceso Profundo y Arraigado de Investigación RUES por Razón Social sin Exigir NIT):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Investigación Empresarial RUES Profunda y Robusta (Análoga a ADRES BDUA)**:
     - *Causa raíz*: JanIA no lograba investigar empresas por su razón social cuando el usuario no suministraba el NIT, pidiéndolo repetidamente ("necesito el NIT"). Al suministrar el NIT `901.344.253` sí encontraba a `MULTIPROYECTOS & INVERSIONES SAS`. En RUES web oficial (`rues.org.co`), la búsqueda por "Nombre / Palabra Clave" arroja directamente el registro con Representante Legal, matrícula y cámara.
     - *Diagnóstico técnico profundo*:
       a) **Destrucción de Carácter Ampersand (`&`)**: `normalizeCorporateName` en `ruesService.ts` sustituía indiscriminadamente `&` por ` Y ` y eliminaba signos de puntuación. En RUES, `MULTIPROYECTOS & INVERSIONES SAS` está matriculada formalmente con `&`. Al convertirlo a `Y`, la consulta arrojaba un establecimiento cancelado en Cartago (`L.H MULTIPROYECTOS E INVERSIONES`).
       b) **Detención Prematura de Variantes en `queryRuesDirectHttp`**: Si la primera variante devolvía al menos un resultado (aunque fuera cancelado o establecimiento descartado por `selectPrincipalRuesRecord`), el bucle de variantes no continuaba probando las demás porque `registros.length > 0`.
       c) **Ruido Conversacional de WhatsApp**: Mensajes largos como `"Disculpame te confirmo el nombre exacto de la empresa. MULTIPROYECTOS & INVERSIONES SAS 👇👇👇"` entraban crudos a la consulta si no se extraía la razón social limpia.
       d) **Doctrina Errónea en Prompts**: En `base.md` existía una regla en Hábeas Data afirmando erróneamente que las consultas en RUES solo operaban por documento/NIT, confundiendo a la IA.
     - *Soluciones implementadas*:
       a) **Extractor Quirúrgico (`extractCleanCorporateQuery`)**: Purifica mensajes de chat eliminando fórmulas de cortesía ("te confirmo...", "el nombre es..."), comillas y emojis, aislando la razón social mercantil limpia.
       b) **Preservación y Variantes Morfológicas del Ampersand**: Se conservó `&` en `normalizeCorporateName` y se enriqueció `generateRazonSocialSearchVariants` con combinaciones intercambiables (`&`, `Y`, `E`, sin conectores y con comodín `%`).
       c) **Búsqueda Secuencial hasta Hallar Sociedad Activa**: `queryRuesDirectHttp` ahora evalúa variantes secuencialmente y continúa buscando hasta que `selectPrincipalRuesRecord` confirme una sociedad o persona jurídica activa principal.
       d) **Ponderación Semántica de Alta Fidelidad (`evaluateRazonSocialMatch`)**: Coincidencia exacta con `&` otorga 100 pts, equivalencia con `Y` 98 pts, descartando falsos positivos.
       e) **Doctrina en Prompts, DMs y Semilla Maestra**: Se corrigió `base.md` (declarando la publicidad mercantil universal del Art. 26 C.Co.), `prompts.ts`, `dmHandler.ts` (orden de invocar de inmediato `consultar_empresa_o_nit`) y se agregó la semilla `seed-investigacion-empresarial-rues-sin-nit` en `founderKnowledgeService.ts`.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 395/395 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 20.17s ✅
- `shared/const.ts` (`v33.51`) y `package.json` (`33.51.0`).

## 🔖 VERSIÓN ANTERIOR: v33.50 — Octubre 2026

### Novedades v33.50 (Doctrina Fundacional de Agente de IA Cognitiva vs. Simple Bot y Modelos de Aprendizaje):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **JanIA como Agente de IA Cognitiva de Alto Razonamiento (No un Simple Bot)**:
     - *Causa raíz*: Tratar a JanIA como un simple bot que repite frases hechas degrada su frescura y naturalidad. Eduardo A. Rivera instruyó enfáticamente: *"JanIA debe ser una agente de IA y NO UN SIMPLE BOT. Es mejor entrenarla para que lo sepa y no que se limite como un vulgar bot. Los guiones que fabricamos son para que se guíe y aprenda mediante estas opciones como ejemplo y contexto de cómo hablar, escribir o dirigirse a nuestra audiencia, no para decirlos al pie de la letra."*
     - *Solución*: Se consagró en la arquitectura cognitiva (`prompts.ts`, `base.md`, `dmHandler.ts` y `founderKnowledgeService.ts`) que todos los guiones, diálogos, formulaciones de MATCH 40/20/40, entrega de códigos #M..., canalización al 3166569719, 6 emojis o aterrizaje de presupuestos son **modelos conceptuales y de aprendizaje**. JanIA internaliza el objetivo de negocio y se expresa con sus propias palabras, calidez, soltura y empatía natural.
  2. **Directiva Maestra Semilla en `founderKnowledgeService.ts`**:
     - *Solución*: Se creó la directiva doctrinal `seed-agente-ia-no-bot-guiones-ejemplo` para asegurar que JanIA aplique permanentemente esta visión en su razonamiento antes de responder.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 391/391 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 19.11s ✅
- `shared/const.ts` (`v33.50`) y `package.json` (`33.50.0`).

## 🔖 VERSIÓN ANTERIOR: v33.49 — Octubre 2026

### Novedades v33.49 (Matriz Completa de 6 Emojis de Negocio, Ciberseguridad y Secreto Industrial):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Consagración de la Matriz Completa de 6 Emojis de Negocio**:
     - *Causa raíz*: JanIA en sus explicaciones solo mencionaba dos emojis generales (👍 para Oferta y 📝 para Demanda), omitiendo la rica clasificación visual implementada en el sistema para arriendos, permutas y moderación.
     - *Solución*: Se formalizó en el núcleo cognitivo (`prompts.ts`, `base.md`, `dmHandler.ts` y `founderKnowledgeService.ts`) la Matriz Doctrinal Oficial de 6 Emojis de Negocio:
       - **OFERTAS:** 👍 (Venta pura), 👌 (Arriendo o canon mensual), 🔀 (Permuta o venta-permuta).
       - **DEMANDAS:** 📝 (Búsqueda de Compra), ✏️ (Búsqueda de Arriendo), 🔄 o 🔁 (Búsqueda con Permuta).
       - **MODERACIÓN (Grupos Oficiales):** 🚫 (Infracción de normas o spam), ❓ (Ficha técnica con datos incompletos).
  2. **Guardarraíl de Ciberseguridad, Secreto Industrial y Anti-Prompt Injection (Doctrina Eduardo A. Rivera)**:
     - *Causa raíz*: En chats abiertos, usuarios curiosos, competidores o atacantes podían intentar extraer prompts del sistema, código fuente, esquemas de BD o lógica propietaria mediante prompt injection o ingeniería inversa.
     - *Solución*: JanIA explica con pedagogía y persuasión cómo trabaja en beneficio del usuario, pero JAMÁS revela código fuente, system prompts, lógica algorítmica ni esquemas internos. Ante solicitudes de introspección técnica, responde con cortesía diplomática y reserva corporativa, explicando que toda la tecnología es propiedad intelectual y secreto industrial de VECY Network desarrollada por sus directores Eduardo Rivera y Jani Alves, canalizando al +57 316 656 9719 para alianzas proptech formales.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 387/387 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 26.18s ✅
- `shared/const.ts` (`v33.49`) y `package.json` (`33.49.0`).

## 🔖 VERSIÓN ANTERIOR: v33.48 — Octubre 2026

### Novedades v33.48 (Aterrizaje Sincero de Presupuestos Inviables, Deducción Astuta de Rol y Vendedora Consultiva Inbound):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Aterrizaje Sincero de Presupuestos Inviables y Realidad de Mercado (Cero Falsas Expectativas)**:
     - *Causa raíz*: Cuando un cliente busca arriendo o venta en zonas de alta valorización con presupuestos notablemente inferiores al mercado real (ej. apartamento de 1-2 alcobas en Parque de la 93 / El Chicó por $3.000.000 COP cuando arrancan en $4.4M - $4.5M), responder mecánicamente que "está en el radar 24/7" alimenta falsas ilusiones.
     - *Solución*: JanIA habla con honestidad, sinceridad y calidez humana pericial: explica que en ese cuadrante los cánones reales arrancan muy por encima de su presupuesto y propone alternativas viables: o ajustar el presupuesto, o explorar sectores alternativos de altísima calidad donde sus recursos sí sean competitivos (Chapinero Alto, Pasadena, Pontevedra, Cedritos), aclarando que queda en el radar por si surge una ganga atípica, pero con los pies en la tierra.
  2. **Deducción Astuta del Rol (Oferta vs Demanda) sin Preguntas Obvias**:
     - *Causa raíz*: Si el usuario ya usó verbos explícitos ("busco", "necesito", "arriendo para mí", "vendo", "tengo este apto"), volver a preguntarle "¿Es búsqueda o inmueble?" la hace ver como un bot rígido.
     - *Solución*: JanIA deduce el rol autónomamente con astucia, lo asume con naturalidad ("Veo que estás buscando para ti..." o "Veo que tienes este inmueble en oferta...") y avanza directo al grano con los detalles técnicos finos.
  3. **JanIA como Vendedora Consultiva Inbound (HubSpot para JanIA y VECY)**:
     - *Causa raíz*: JanIA asesora en marketing inmobiliario pero no siempre ofrecía sus propios superpoderes en el momento propicio.
     - *Solución*: Aplica inbound marketing para consigo misma: resuelve primero la necesidad del usuario y, oportunamente, hace un soft-pitch consultivo de sus servicios: sondeo $/m² con POT Bogotá Dec. 555/21, descarga de Factura Predial oficial de Bogotá en PDF en 1 minuto con CHIP, Paz y Salvo IDU, validación de antecedentes en ADRES/Policía, liquidación notarial 50/50 y suscripción al Canal Oficial.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 383/383 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 11.79s ✅
- `shared/const.ts` (`v33.48`) y `package.json` (`33.48.0`).

## 🔖 VERSIÓN ANTERIOR: v33.47 — Octubre 2026

### Novedades v33.47 (Pedagogía Transparente de MATCH 40/20/40, Ficha Técnica 360°, Ingesta Viva con Emojis y Hot Learning):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Pedagogía Sincera y Comisión Colaborativa 40/20/40 (Cero Falsas Ilusiones)**:
     - *Causa raíz*: Los usuarios o asesores podían hacerse falsas ilusiones de que JanIA entregaría contactos directos para cerrar negocios por su cuenta.
     - *Solución*: JanIA explica con sinceridad que para activar el cruce y conectar las dos puntas, las partes deben aceptar de antemano el esquema colaborativo 40/20/40 (40% quien aporta la demanda o inmueble, 40% la contraparte, y 20% VECY por la mesa de MATCH, respaldo pericial y legal, y acompañamiento hasta el cierre).
  2. **Auditoría e Indagación de Ficha Técnica Exhaustiva 360° (con Ejemplos Cálidos)**:
     - *Causa raíz*: Las fichas con datos escuetos (solo habitaciones y garajes) reducen la precisión del matching.
     - *Solución*: JanIA indaga activamente con calidez mediante ejemplos concretos: si es búsqueda o inmueble; exterior/interior; iluminación y sol (mañana/tarde); cocina abierta/cerrada/americana; zona de lavandería independiente; cuarto y baño de servicio (CBS); balcón o terraza; chimenea; piso (bajo/medio/alto) y ascensor; parqueaderos independientes (no en línea); depósito; amenidades (gym, piscina, club house, parque infantil); vigilancia (24/7 vs automatizada); y cuadrante exacto de vías.
  3. **Guion Modelado de Entrega de Códigos MATCH (#M...)**:
     - *Causa raíz*: Se requería una formulación institucional estandarizada que conecte al cliente con la mesa de MATCH.
     - *Solución*: Se implementó el guion exacto: *"¡Tenemos coincidencia en la red! Encontramos opciones con los códigos [códigos #M...]. Pero solamente te puedo dar los códigos MATCH ya que con estos debes comunicarte con nuestro equipo al 3166569719 (+57 316 656 9719) y se los vas a pasar a quien te conteste diciéndole que Yo JanIA te los di para que ellos los ubiquen en nuestra mesa de MATCH y empiecen a hacer la gestión de conectar las puntas y lograr una visita y posteriormente el cierre del negocio."*
  4. **Transparencia sobre la Base de Datos Viva y Emojis en Grupos**:
     - *Causa raíz*: Los usuarios desconocían el origen vivo y constante del inventario.
     - *Solución*: JanIA aclara que su base de datos se nutre minuto a minuto de los grupos de WhatsApp donde está invitada, marcando las Ofertas con 👍 y las Demandas con 📝.
  5. **Humanización al Pedir Calificación en Google**:
     - *Causa raíz*: Pedir calificaciones puede sentirse frío o mecánico si el usuario no sabe cómo hacerlo.
     - *Solución*: JanIA ofrece con dulzura explicar el paso a paso detallado para calificar en Google si el usuario no lo tiene claro.
  6. **Sistema de Aprendizaje en Caliente de Fundadores (`founderKnowledgeService.ts`)**:
     - *Causa raíz*: Eduardo y Jani necesitan poder instruir o dar tips a JanIA directamente por WhatsApp y que ella los asimile y aplique de inmediato.
     - *Solución*: Se creó `founderKnowledgeService.ts` que intercepta instrucciones directas de los directores, las almacena en `data/jania_founder_teachings.json` y las inyecta en caliente en el cognitive prompt de JanIA.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 379/379 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 11.79s ✅
- `shared/const.ts` (`v33.47`) y `package.json` (`33.47.0`).

## 🔖 HISTORIAL PREVIO: v33.46 — Octubre 2026

### Novedades v33.46 (Entrega de Códigos de Match #M..., Canalización a Mesa VECY, Guardarraíl Anti-Promesas en Diferido y Reparación Estructural de BD):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Causa Raíz del Congelamiento en DMs ("Dame un momentico...")**:
     - *Causa raíz*: En arquitecturas de socket reactivas como WhatsApp/Baileys, el procesamiento de mensajes ocurre por turnos de eventos síncronos. JanIA respondió con una promesa en diferido sin invocar la herramienta `registrar_inmueble_o_requerimiento`. Al terminar la emisión de texto, el ciclo concluyó y el bot quedó en silencio a la espera de un nuevo mensaje del usuario, mientras Turbo (+57 324 6326836) quedó esperando la respuesta prometida.
     - *Solución*: Se instaló un guardarraíl cognitivo en System Prompt y User Prompt de `dmHandler.ts` que detecta cuando el usuario suministra especificaciones técnicas complementarias (habitaciones, garajes, presupuesto) y **prohíbe terminantemente responder prometiendo acciones futuras ("dame un momento")**, forzando la compilación inmediata e invocación directa de `registrar_inmueble_o_requerimiento`.
  2. **Reparación Estructural DDL en Base de Datos PostgreSQL**:
     - *Causa raíz*: Las columnas `acepta_terceria` y `stand_by_directo_vecy` existían en `drizzle/schema.ts` pero no se habían migrado físicamente a las tablas `requirements` y `properties` en PostgreSQL del servidor. Esto ocasionaba un fallo catastrófico silencioso al intentar insertar o consultar propiedades en el motor de matching (`PostgresError: column "acepta_terceria" does not exist`).
     - *Solución*: Se ejecutaron las migraciones DDL con `ALTER TABLE requirements ADD COLUMN IF NOT EXISTS ...` y `ALTER TABLE properties ADD COLUMN IF NOT EXISTS ...`, normalizando el esquema a perpetuidad.
  3. **Persistencia y Estado del Requerimiento de Turbo**:
     - *Causa raíz*: Se verificó si el requerimiento de Turbo había quedado guardado. Debido al error DDL previo, no se había almacenado.
     - *Solución*: Se insertó el requerimiento con ID `1306`: Apartamento en arriendo cerca al Parque de la 93 / El Chicó, presupuesto máximo $3.000.000 COP, 1-2 habitaciones, 1 parqueadero, teléfono `573246326836`. Al correr el motor de cruce arrojó **0 matches inmediatos** (los inmuebles disponibles en arriendo en la zona arrancan en $4.4M o son venta). El requerimiento quedó 100% activo en el radar 24/7.
  4. **Doctrina Ineludible de Entrega de Códigos de Match (#M...) y Canalización a VECY (+57 316 656 9719)**:
     - *Causa raíz*: Anteriormente el matching se ejecutaba en segundo plano (fire-and-forget), impidiendo informar al usuario de los resultados o entregar los códigos de cruce.
     - *Solución*: `registrar_inmueble_o_requerimiento` ejecuta `findMatchesForRequirement` de manera síncrona inmediata y sintetiza el reporte:
       - *Si hay Matches*: Entrega los códigos de coincidencia oficiales (`#M...`), el porcentaje de afinidad y las especificaciones generales (sin revelar teléfonos directos ni nombres de contrapartes), explicando al cliente que con estos códigos debe comunicarse con Eduardo Rivera y Jani Alves al **+57 316 656 9719** para ubicarlos en la mesa de MATCH y conectar las dos puntas hasta lograr la visita y el posterior cierre.
       - *Si no hay Matches (0 Matches)*: Confirmación cálida y transparente de que no hay cruce inmediato en inventario, pero que su requerimiento ya quedó 100% activo en el radar 24/7 de la red colaborativa de VECY y se le notificará de inmediato apenas entre una opción compatible.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 375/375 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 14s ✅
- `shared/const.ts` (`v33.46`) y `package.json` (`33.46.0`).

## 🔖 VERSIÓN ANTERIOR: v33.45 — Octubre 2026

### Novedades v33.45 (Blindaje Centinela Anti-Fuga de JID/LID en Mensajes DMs y WhatsApp):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Neutralización y Sanitización de Identificadores Internos (`dmHandler.ts`)**:
     - *Causa raíz*: En ciertas ejecuciones de herramientas en chats privados o al procesar mensajes sin respuesta textual del LLM, el sistema podía llegar a emitir el JID, LID o número de teléfono del usuario (ej. `110758461710505@lid` o números crudos) directamente en el chat, afectando la percepción de astucia e inteligencia de JanIA.
     - *Solución*: Se reforzó `formatPoliteToolDelivery` y `processPrivateDmConversationalMessage` con un centinela estricto que detecta si el texto a enviar termina en `@lid`, `@s.whatsapp.net` o es un número puro. En tales casos, se neutraliza la fuga y se genera de inmediato una respuesta cálida, atenta y resolutiva acorde a la identidad de JanIA.
  2. **Centinela en Capa de Transporte Baileys (`whatsapp-match.ts`)**:
     - *Causa raíz*: No existía un filtro a nivel de socket (`queuedSend`) que impidiera despachar como texto plano un identificador interno de WhatsApp.
     - *Solución*: Se incorporó una guarda centinela en `queuedSend` que rechaza cualquier string que coincida con patrones de JID/LID o teléfono puro hacia chats no-newsletter, previniendo emisiones accidentales por errores lógicos aguas arriba.
  3. **Preservación de la Inteligencia y Naturalidad Orgánica de JanIA**:
     - *Causa raíz*: La interacción con los usuarios debe ser impecable, respondiendo con calidez y resolviendo con astucia sus inquietudes inmobiliarias, notariales y tributarias sin vestigios de código ni respuestas mecánicas.
     - *Solución*: Se afianzó la personalidad de JanIA en toda la cadena de procesamiento de mensajes privados.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 371/371 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 25s ✅
- `shared/const.ts` (`v33.45`) y `package.json` (`33.45.0`).

## 🔖 VERSIÓN ANTERIOR: v33.44 — Octubre 2026

### Novedades v33.44 (Fábrica Creativa 1:1 para Canal Oficial, Gancho Escrito en Historias WhatsApp y Erradicación de 'Coach'):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Suite Maestra 1:1 para el Canal Oficial de WhatsApp (`client/public/assets/channel_1x1/`, `cronService.ts`)**:
     - *Causa raíz*: Las imágenes cuadradas antiguas presentaban heterogeneidad y las de historias 9:16 no eran óptimas para el feed vertical continuo de los canales de WhatsApp en desktop y móvil.
     - *Solución*: Se diseñaron y generaron 5 piezas maestras en relación de aspecto 1:1 con branding institucional VECY Gold Edition y presencia de JanIA: `jania_anfitriona_cafe_1x1.jpg` (Anfitriona y bienvenida con café), `jania_legal_due_diligence_1x1.jpg` (Due diligence legal y saneamiento), `jania_marketing_colaborativo_1x1.jpg` (Marketing 10 skills y alianza 40/20/40), `jania_avaluos_pot_1x1.jpg` (Sondeos y POT Bogotá Dec. 555/21) y `jania_seguridad_notarial_1x1.jpg` (Verificación de cédulas y seguridad notarial). `getChannelSquareImage1x1` las selecciona dinámicamente según la temática del tip.
  2. **Gancho Escrito en Historias de WhatsApp (`whatsapp-match.ts`)**:
     - *Causa raíz*: Las imágenes en `status@broadcast` causaban problemas de compatibilidad y carga en WhatsApp Web y generaban duplicación con los canales.
     - *Solución*: Se implementó `postDailyHookStatus`, que despacha únicamente texto con formato institucional de gancho persuasivo e incorpora ineludiblemente el llamado de acción hacia el Canal Oficial: `👉 Sigue el Canal Oficial y lee la guía completa aquí: https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b`.
  3. **Erradicación Doctrinal del Término 'Coach' (`cronService.ts`, `VECY_SOPORTE_LEGAL_TRIBUTARIO_Y_AVALUOS.md`, `base.md`)**:
     - *Causa raíz*: El anglicismo "coach" resultaba ajeno, frío y corporativo, no alineado con la cercanía, calidez y señorío de JanIA en Colombia.
     - *Solución*: Se eliminó toda referencia a "coach" en prompts y lógica (`enforceJanIAIdentity`), consagrando a JanIA como "aliada", "asesora especializada" y "anfitriona de la comunidad inmobiliaria".
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 368/368 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 27s ✅
- `shared/const.ts` (`v33.44`) y `package.json` (`33.44.0`).

## 🔖 VERSIÓN ANTERIOR: v33.43 — Octubre 2026

### Novedades v33.43 (Publicación Dinámica de Estados de WhatsApp status@broadcast, Catálogo Maestro y Piezas 9:16):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Generación Visual de Nueva Generación en Formato Vertical 9:16 (`jania_status_showcase_v1.jpg`)**:
     - *Causa raíz*: Las 16 imágenes estáticas cuadradas iniciales causaban fatiga visual y saturación en los usuarios al repetirse de forma idéntica. Se requería una fábrica creativa capaz de generar imágenes nuevas, hiperrealistas, variadas, con consistencia de personaje y branding oficial de VECY BIENES RAÍCES.
     - *Solución*: Se generó la primera pieza oficial de alta resolución en formato vertical 9:16 (especial para estados e historias móviles), manteniendo el corte bob castaño, las gafas características y el carisma de JanIA, vistiendo un blazer sastre negro con ribetes dorados de la paleta VECY Gold Edition (#0a0a0a y #d4af37) en un penthouse con vista panorámica a Bogotá, sosteniendo una tablet digital con los servicios de VECY BIENES RAÍCES.
  2. **Emisión Nativa a Estados Propios de WhatsApp (`whatsapp-match.ts`)**:
     - *Causa raíz*: El bot no disponía de un mecanismo formal para emitir publicaciones a `status@broadcast` en Baileys sobre la línea bot `+57 319 291 9978`.
     - *Solución*: Se implementaron los métodos `postToWhatsAppStatus` y `postDailyServiceStatus` que despachan imágenes o textos con fondo institucional y gestionan la distribución dirigida a través de la lista de destinatarios autorizados (`statusJidList`).
  3. **Directorio Dirigido de Asesores (`advisors.ts`)**:
     - *Causa raíz*: Para que los estados de WhatsApp de una línea comercial/bot sean visibles sin restricciones, WhatsApp requiere especificar los JIDs de los contactos autorizados.
     - *Solución*: Se implementó `getAllAdvisorJids` que extrae y normaliza los números de celular de los 552+ asesores registrados en el directorio permanente hacia el formato `@s.whatsapp.net`.
  4. **Catálogo Rotativo Semanal en Voz Laomedeia (`cronService.ts`, `jania_innovative_status_catalog.md`)**:
     - *Causa raíz*: Era indispensable presentar día tras día la totalidad de servicios integrados (sondeos y POT, seguridad notarial, predial PDF, marketing 10 skills, casos jurídicos, bolsa colaborativa y educación dominical) sin aburrir a la audiencia.
     - *Solución*: Se integró en el cron matutino (08:45 AM) el despacho de estados rotativos con guiones cálidos y directos al grano en la voz oficial Laomedeia, con invitación abierta a debatir en los Grupos 2 y 3 o consultar en privado.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 363/363 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 24s ✅
- `shared/const.ts` (`v33.43`) y `package.json` (`33.43.0`).

## 🔖 VERSIÓN ANTERIOR: v33.42 — Octubre 2026

### Novedades v33.42 (10 Habilidades de Marketing Inmobiliario, Asesora Especialista, Ingesta Privada y Comisiones 40/20/40 vs 50/50):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Suite de 10 Habilidades de Marketing Inmobiliario (`realEstateMarketing.ts`)**:
     - *Causa raíz*: Las publicaciones de ofertas y demandas inmobiliarias suelen redactarse con clichés genéricos ("hermoso apartamento", "excelente ubicación"), sin definir el perfil del cliente ideal ni estructurar la propuesta de valor con datos técnicos completos.
     - *Solución*: Se implementó la suite completa de 10 habilidades de marketing inmobiliario de alto impacto: 1) Constructor de Perfil de Cliente Ideal (ICP: familia, ejecutivo, inversionista de renta corta, logístico, constructor), 2) Swap Test Inmobiliario (descarte de clichés y rescate de ventajas competitivas únicas y medibles), 3) Auditoría de Anuncios (Score 0-100 en propuesta de valor, datos técnicos indispensables, desgloses y CTA), 4) Fichas persuasivas estructuradas con Markdown, y 5) Guía de comisiones.
  2. **Identidad Consagrada de JanIA (`base.md`, `dmHandler.ts`)**:
     - *Causa raíz*: JanIA se presentaba con fórmulas genéricas de "agente de inteligencia artificial" sin explicitar su rol integral de asesora especialista en todas las líneas de servicio.
     - *Solución*: JanIA es consagrada como la **asesora y guía especialista en cada uno de los servicios inmobiliarios, jurídicos, tributarios, notariales y de marketing de VECY BIENES RAÍCES en Colombia**.
  3. **Ingesta y Optimización Privada en Chats Privados (`dmHandler.ts`)**:
     - *Causa raíz*: La prohibición previa de registro en chats privados impedía a JanIA recibir propiedades o demandas de usuarios que solicitaban ayuda para cargarlas al sistema.
     - *Solución*: JanIA asume el rol de Asesora de Marketing Inmobiliario, acoge la solicitud con entusiasmo, optimiza la ficha técnica y la registra en la base de datos para el motor de matching mediante `registrar_inmueble_o_requerimiento`.
  4. **Doctrina de Comisiones: 40/20/40 vs 50/50 (`dmHandler.ts`)**:
     - *Causa raíz*: Era necesario diferenciar el trato a propietarios directos vs agentes inmobiliarios y respetar la preferencia del agente respecto al esquema de comisión compartida.
     - *Solución*: JanIA indaga cortesmente el rol. A los agentes les consulta si aceptan la figura colaborativa de la Red VECY 40/20/40 (Alianza 40/20/40 - Aliada Prioritaria). Si prefieren el 50/50 tradicional, el sistema igualmente sube el inmueble o requerimiento y lo envía a la mesa de coincidencias a la sección `[🛡️50/50 - NO TERCERÍA]`. A los propietarios directos los acompaña y explica que la red comercial los conectará con compradores e inquilinos calificados.
  5. **Regla de Oro Inquebrantable (Confidencialidad Sagrada de Matches en Privado)**:
     - *Causa raíz*: Presentar datos de contacto de contrapartes o cruces directamente en chats privados exponía la operación a saltos comerciales ("by-pass").
     - *Solución*: Por más que el usuario insista, JanIA JAMÁS revela las parejas encontradas (los MATCH) ni datos de contacto de contrapartes en privado. La central de operaciones de VECY (+57 316 656 9719) gestiona los cierres y contacta a las partes para blindar el negocio.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 358/358 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 24s ✅
- `shared/const.ts` (`v33.42`) y `package.json` (`33.42.0`).

## 🔖 VERSIÓN ANTERIOR: v33.41 — Octubre 2026

### Novedades v33.41 (POT Decreto 555/21, Visor SINUPOT, Audiencia Plural y Plantilla Grupo 1):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Predios con Potencial Constructor y Norma Urbana POT (`valuation.ts`)**:
     - *Causa raíz*: Para predios como lotes, bodegas, edificios y casas o casa-lotes con vocación de desarrollo vertical/comercial, un cálculo genérico de vivienda usada omitía variables esenciales como el tratamiento urbanístico, el uso del suelo y el índice de construcción bajo el ordenamiento distrital.
     - *Solución*: Se implementó `analyzeUrbanPotPotential`, que analiza si el predio tiene vocación de desarrollo vertical o comercial bajo el POT de Bogotá (Decreto 555 de 2021: Renovación Urbana o Consolidación, uso de suelo e índices de ocupación/construcción), enlazando directamente al Visor Geográfico SINUPOT (`https://www.sdp.gov.co/content/sinupot-0`) de la Secretaría Distrital de Planeación y datos abiertos de ordenamiento territorial (`https://datosabiertos.bogota.gov.co/group/ordenamiento-territorial`) para cotejar la norma con el CHIP catastral.
  2. **Doctrina de Sondeos Comerciales vs. Avalúos Certificados (`dmHandler.ts`)**:
     - *Causa raíz*: Exigir de entrada los 3 documentos pesados (CTL, Escritura, Predial) frenaba el sondeo ágil solicitado por los usuarios.
     - *Solución*: El sondeo comercial inicial se calcula y entrega de inmediato con los 8 datos físicos. Solo al final de la entrega (o si el usuario insiste en un avalúo formal más profundo), JanIA sugiere cotejar los documentos soporte (CTL, Escritura y Predial), ofreciendo el predial de Bogotá en PDF en el chat.
  3. **Audiencia Plural y Universal (`base.md`, `dmHandler.ts`)**:
     - *Causa raíz*: JanIA se dirigía por defecto al interlocutor asumiendo que siempre era un "colega corredor inmobiliario".
     - *Solución*: Se amplió el espectro conversacional para acoger con señorío y calidez a toda la comunidad plural: propietarios, compradores, arrendatarios, inversionistas, abogados, arquitectos, peritos, agentes de seguros, entidades financieras y de salud. Oportunidades Proptech y desarrollos de IA a la medida son canalizadas con los directores Eduardo Rivera y Jani Alves (+57 316 656 9719).
  4. **Cero Publicación Directa en DMs / Web y Plantilla Estandarizada al Grupo 1 Oficial (`dmHandler.ts`, `janIA.ts`)**:
     - *Causa raíz*: En chats privados o web, JanIA simulaba guardar o registrar propiedades, creando falsas expectativas.
     - *Solución*: Prohibición absoluta de prometer o simular registro directo en DMs/Web. JanIA canaliza con simpatía hacia el Grupo 1 Oficial: `𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴` entregando las plantillas estandarizadas de Oferta o Demanda y revisando fichas previas enviadas por el usuario.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 354/354 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 25s ✅
- `shared/const.ts` (`v33.41`) y `package.json` (`33.41.0`).

## 🔖 VERSIÓN ANTERIOR: v33.40 — Octubre 2026

### Novedades v33.40 (Decodificación de Entidades HTML, Entrega Ineludible de EPS en Síntesis DM y Optimización Visual Base64):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Decodificación de Entidades HTML en ADRES (`identityVerificationService.ts`)**:
     - *Causa raíz*: El portal de ADRES retorna caracteres especiales codificados como entidades numéricas (`&#209;`, `&#211;`, `&#193;`, etc.) o ISO entities, provocando que nombres como "Iba&#209;ez" o términos como "SUSPENSI&#211;N" se mostraran con código crudo en lugar de tildes y eñes limpias.
     - *Solución*: Se expandió `decodeHtmlEntities` integrando reemplazo universal de entidades numéricas `&#(\d+);` a través de `String.fromCharCode(Number(dec))` y mapeo estricto de diacríticos y entidades comunes (`&amp;`, `&quot;`, `&lt;`, `&gt;`).
  2. **Entrega Ineludible y Estructurada de EPS en DMs (`dmHandler.ts`)**:
     - *Causa raíz*: En síntesis Gemini o fallbacks de herramientas, el texto requería una estructuración visual impecable destacando la EPS del titular o la aclaración de regímenes especiales (Fuerzas Militares, Policía, Magisterio, etc.) cuando no figura en BDUA ordinario.
     - *Solución*: `synthesizeToolResponseWithGemini` estructura la respuesta con emojis sectoriales (`🏥` para salud/EPS y `⚖️` para antecedentes policiales, disciplinarios y fiscales), y la descripción de la herramienta `consultar_identidad_y_antecedentes` fue optimizada para que Gemini siempre incluya la EPS.
  3. **Optimización de Visión Multimodal Base64 (`vision.ts`)**:
     - *Causa raíz*: Cadenas no conformes a Base64 generaban múltiples reintentos de red contra la API de Gemini antes de fallar por timeout.
     - *Solución*: Verificación previa con patrón regex `/^[A-Za-z0-9+/]+={0,2}$/` y validación de longitud múltiplo de 4, retornando estructura segura inmediata sin consumo de red ni timeouts.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 349/349 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 29s ✅
- `shared/const.ts` (`v33.40`) y `package.json` (`33.40.0`).

## 🔖 VERSIÓN ANTERIOR: v33.39 — Octubre 2026

### Novedades v33.39 (Persistencia de Túnel ADRES, Supervisión Systemd y Entrega Ineludible de EPS):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Diagnóstico Forense de Geobloqueo ADRES / Contabo**:
     - *Causa raíz*: El portal de `aplicaciones.adres.gov.co` descarta paquetes (drop/timeout) provenientes de rangos IP extranjeros de datacenters (como el VPS Contabo). El sistema depende del túnel SSH reverso (`127.0.0.1:28443` hacia Colombia). El script previo `ensure-pgn-tunnel.sh` en cron fallaba silenciosamente por falta de clave SSH explícita (`Permission denied publickey`) al no disponer de agente SSH interactivo.
     - *Solución*: Se implementó el servicio `vecy-tunnel.service` supervisado por `systemd --user` con reconexión automática en 5s (`Restart=always`) y `loginctl enable-linger eddu` para garantizar disponibilidad ininterrumpida 24/7. Además, se dotó a `ensure-pgn-tunnel.sh` de `-i ~/.ssh/id_vps` y `BatchMode=yes` en cron cada 2 minutos como contingencia.
  2. **Entrega Ineludible de EPS en JanIA (`dmHandler.ts`, `identityVerificationService.ts`)**:
     - *Causa raíz*: Cuando la consulta se resolvía o se consultaba la caché de identidad, el objeto `adres` no se incluía en el payload retornado por la rama de caché, provocando que `toolJson.adres` fuera `null` en Gemini.
     - *Solución*:
       - `identityVerificationService.ts` retorna el objeto `adres` completo con `eps`, `estado` y `regimen` tanto en consulta en vivo como desde caché.
       - `executeJaniaDmTool` extrae la EPS de `res.adres` o, como red de seguridad, directamente de la línea `ADRES (BDUA):` en `res.reportText`.
       - Se instruye a Gemini con prioridad absoluta: si el usuario pregunta puntualmente por la EPS o a quién pertenece la cédula, JanIA responde de inmediato en las primeras líneas identificando el titular y su EPS en ADRES / BDUA.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 346/346 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 25s ✅
- `shared/const.ts` (`v33.39`) y `package.json` (`33.39.0`).

## 🔖 VERSIÓN ANTERIOR: v33.38 — Octubre 2026

### Novedades v33.38 (8 Datos Indispensables de Sondeos Físicos y Nombre Sagrado Oficial del Grupo 1):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Diálogo Maestro de Sondeos Físicos (8 Datos Obligatorios) (`dmHandler.ts`)**:
     - *Causa raíz*: El sondeo previo requería solo 3 datos, lo que omitía variables críticas de mercado como barrio, localidad/comuna, ciudad, año de construcción y tipo de acabados.
     - *Solución*: JanIA asume el rol de Perita Avaluadora y solicita con pedagogía y amabilidad los 8 datos físicos indispensables mediante viñetas claras (`•`):
       • Dirección exacta del predio con complementarios de ser necesario.
       • Barrio.
       • Localidad/Comuna.
       • Ciudad.
       • Área construida aproximada en metros cuadrados.
       • Tipo de inmueble (apartamento, casa, local, etc.) y número de habitaciones o espacios principales.
       • Año de construcción.
       • Tipo de acabados.
       Si el usuario responde con evasivas o datos incompletos, JanIA insiste punto por punto hasta completar los datos para emitir un sondeo exacto sin desviar la conversación.
  2. **Nombre Sagrado Oficial del Grupo 1 en Respuestas y Prompts (`dmHandler.ts`)**:
     - *Causa raíz*: Se venía usando el nombre provisional o genérico "VECY INMUEBLES NETWORK".
     - *Solución*: JanIA consagra y utiliza con total transparencia y honestidad radical el nombre oficial exacto del grupo: `Grupo 1 Oficial: 𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴 (https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ)`.
  3. **Extensión del Modelo Histórico de Sondeos (`valuation.ts`)**:
     - `SurveyInquiryRecord`, `executeMarketValuationSurvey`, `recordSurveyInquiry` y `getSurveyInquiryHistory` integran `barrio`, `localidad`, `ciudad`, `anoConstruccion` y `tipoAcabados` en memoria persistente (últimos 500 registros) para enriquecer la inteligencia inmobiliaria a $0 COP.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 343/343 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 20s ✅
- `shared/const.ts` (`v33.38`) y `package.json` (`33.38.0`).

## 🔖 VERSIÓN ANTERIOR: v33.37 — Octubre 2026

### Novedades v33.37 (Regímenes Especiales ADRES, Diálogo Maestro de Sondeos, Cero Engaños en DMs y Aprendizaje Histórico):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **Explicación de Regímenes Especiales y de Excepción en ADRES (`identityVerificationService.ts`)**:
     - *Causa raíz*: Cuando un documento no registra afiliación en BDUA/ADRES, el reporte anterior decía simplemente "sin novedad de aseguramiento", lo que podía confundir al usuario pensando que la persona era ilegal o no tenía salud.
     - *Solución*: Se clarifica formalmente que la no aparición en BDUA es habitual en ciudadanos pertenecientes a Regímenes Especiales o de Excepción (Ley 100 de 1993, Art. 279): Fuerzas Militares, Policía Nacional, Magisterio/FOMAG, servidores de Ecopetrol y Universidades Públicas, quienes tienen sus propios subsistemas de salud autónomos.
  2. **Diálogo Maestro para Iniciar Sondeos y Persistencia de Meta (`dmHandler.ts`)**:
     - *Causa raíz*: El sondeo de precios no debe imponer de entrada la solicitud de documentos pesados (CTL, Escritura, Predial), ya que eso es para formalizaciones posteriores o avalúos certificados.
     - *Solución*: JanIA asume el rol de Perita Avaluadora y formula el diálogo maestro solicitando los 3 datos físicos clave: 1) Dirección exacta del predio con complementarios, 2) Área construida m² y 3) Tipología/número de alcobas o espacios. Si el usuario no responde con exactitud, JanIA insiste punto por punto amablemente hasta completar los datos para calcular el valor.
  3. **Honestidad Radical y Cero Engaños en DMs (`dmHandler.ts`)**:
     - *Causa raíz*: En DMs, JanIA le dijo a la usuaria Carolina Z. "he registrado este dato clave en el sistema de VECY", creando la falsa expectativa de que el apartamento ya estaba publicado en el catálogo oficial de VECY cuando en realidad el catálogo en el panel admin mostraba 0 inmuebles para su número.
     - *Solución*: Prohibición absoluta de prometer o simular que un inmueble ha sido guardado/publicado en DMs. JanIA explica con total transparencia que los DMs son para sondeos y asesoría, y que si desea publicar su propiedad para venta/arriendo y cruce de negocios, debe publicarla en el **Grupo 1 Oficial: VECY INMUEBLES NETWORK** (`https://chat.whatsapp.com/GzMbjNs1P2tHI7D0V4h8wZ`), donde el motor inteligente la captará y registrará automáticamente.
  4. **Redacción Oficial Estricta del Servicio de Predial Bogotá (`dmHandler.ts`, `predialService.ts`)**:
     - *Corrección*: Se actualiza la conjunción obligatoria: para expedir la factura predial en PDF ante la SDH se requieren **ambos** datos: código CHIP del predio **y** cédula o NIT del propietario.
  5. **Aprendizaje Histórico sin Saturación (`valuation.ts`)**:
     - Implementación de `recordSurveyInquiry` y `getSurveyInquiryHistory` en memoria persistente (últimos 500 sondeos) para que el sistema y JanIA acumulen inteligencia real de mercado sin sobrecargar PostgreSQL.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 341/341 passing (100% verde a $0 COP) ✅ | `npm run build` limpio.
- `shared/const.ts` (`v33.37`) y `package.json` (`33.37.0`).

## 🔖 VERSIÓN ANTERIOR: v33.36 — Octubre 2026

### Novedades v33.36 (Astucia Inmobiliaria, Continuidad de Meta (Goal Tracking), Soporte Documental (CTL, Escritura, Predial) y Conexión Multi-Capa ADRES):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Continuidad de Meta y Sondeo Contextual (Caso Carolina Z. / Alameda 170) (`dmHandler.ts`, `valuation.ts`)**:
     - *Causa raíz*: En el flujo de DMs, si el usuario pedía revisar el valor de venta de una propiedad y luego JanIA preguntaba si deseaba el cálculo, una respuesta afirmativa ("Si es ese") o complementaria ("Nov 2006", "el año de construcción") no coincidía con el regex estático de `isExplicitValuation` del turno único. Esto causaba que la herramienta de sondeo fuera omitida y JanIA divagara cambiando de tema a agendar visitas técnicas o publicidad sin entregar jamás el valor solicitado.
     - *Solución*: `isExplicitValuation` ahora rastrea el contexto previo en los últimos 6 turnos de la sesión. Si hubo intención de valoración previa y el usuario confirma afirmativamente ("Si es ese", "sí", "dale") o complementa datos ("Nov 2006", metraje, etc.), JanIA mantiene el hilo conversacional y entrega de inmediato el cálculo del $/m², el rango de precio sugerido para venta y el canon de arriendo estimado. Cobertura ampliada en `valuation.ts` para Alameda, Calle 170, Toberín y Mirandela.
  2. **Astucia Comercial y Solicitud de Documentos Soporte (`dmHandler.ts`)**:
     - *Causa raíz*: Los sondeos se entregaban de forma aislada o se perdían sin orientar al cliente hacia la consolidación jurídica y comercial del inmueble.
     - *Solución*: JanIA entrega el sondeo de alta precisión y, con astucia y señorío inmobiliario, solicita los tres (3) documentos soporte indispensables para blindar el valor definitivo al milímetro: 1) Certificado de Tradición y Libertad (CTL) actualizado (área privada RPH, gravámenes y embargos), 2) Copia de la Escritura Pública (linderos de garaje/depósito, titularidad y afectaciones a vivienda familiar), y 3) Factura Predial vigente (estrato catastral oficial, avalúo catastral y CHIP).
  3. **Cross-Selling de Factura Predial Oficial en Chat (`dmHandler.ts`)**:
     - *Causa raíz*: Si el usuario no tiene los documentos, puede frustrarse o abandonar la gestión.
     - *Solución*: Si el interlocutor expresa no tener el predial ("no tengo el predial", "dónde lo saco", "no me ha llegado"), JanIA de inmediato le ofrece expedirlo y entregárselo en formato PDF oficial en el mismo chat en un minuto, solicitando únicamente el código CHIP o la cédula del titular catastral.
  4. **Conexión Multi-Capa Resiliente ADRES / BDUA (`identityVerificationService.ts`)**:
     - *Causa raíz*: El portal de ADRES (`aplicaciones.adres.gov.co`) implementó Google reCAPTCHA Enterprise (`6LdjqjksAAAAAAduGUnDTl7-kSoeSDI7S-vAazXp`) y geobloqueo/WAF para IPs foráneas (como el VPS Contabo), arrojando intermitencia o bloqueo en llamadas directas sin sesión de navegador activa.
     - *Solución*: Arquitectura multi-tier ultra resiliente:
       - **Capa 1 (HTTP Directo)**: Petición ASP.NET optimizada (0.5s) que extrae el popup si la red lo permite.
       - **Capa 2 (Puppeteer Headless Chrome + 2Captcha)**: `queryAdresViaPuppeteer` ejecutando Chrome nativo (`/usr/bin/google-chrome`) con emulación de navegador real, llenado automático de formulario, resolución de reCAPTCHA con 2Captcha si es requerido, captura de `popupUrl` (`RespuestaConsulta.aspx?tokenId=...`) y extracción limpia de tablas con `parseAdresHtml`.
       - **Capa 3 (Caché Persistente y Normalización de EPS)**: Persistencia en `identityCache` (`ADRES:${tipo}:${num}`) y formateo comercial con `formatCleanEpsName`.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 338/338 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 34s ✅
- `shared/const.ts` (`v33.36`) y `package.json` (`33.36.0`).

## 🔖 VERSIÓN ANTERIOR: v33.35 — Octubre 2026

### Novedades v33.35 (Unificación de Identidad Servidora de JanIA, Resolución de Nombres Invertidos y Manejo Humano de Llamadas):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Identidad Oficial de Servidora Humilde (Cero 'Directora') (`server/_core/jania/prompts.ts`, `dmHandler.ts`, `janIA.ts`)**:
     - *Causa raíz*: JanIA se presentaba como "directora tecnológica virtual", generando confusión y percepción de bot pretencioso ante colegas y clientes. Los únicos directores de la organización son Eduardo Rivera (Director de Tecnología) y Jani Alves (Directora de Operaciones).
     - *Solución*: JanIA se consagra en todos los canales (Chat Web, DMs de WhatsApp y Grupos 2 y 3) como la **agente de inteligencia artificial de VECY BIENES RAÍCES**, al servicio incondicional de los usuarios, concebida para servir con humildad, calidez y maestría técnica. Erradicación total de la palabra "directora" atribuida a JanIA.
  2. **Resolución de Nombres Invertidos y Supresión de Apellidos Únicos (`nameAndGenderResolver.ts`, `parsers.ts`)**:
     - *Causa raíz*: En WhatsApp, cuando un contacto tiene el orden invertido ("Luna Rosmery") o cuando el contacto tiene únicamente un apellido ("Luna"), la heurística previa tomaba la primera palabra ("Luna") o forzaba el apellido como vocativo directo ("¡Luna!"), lo que resulta grosero e incómodo.
     - *Solución*: Detección de orden invertido: si la primera palabra es apellido y la segunda es nombre de pila (ej. "Luna Rosmery" -> "Rosmery"). Si el contacto solo tiene un apellido (ej. "Luna" o "Pérez"), se suprime el apellido como vocativo directo, respondiendo con un saludo cálido y neutro ("¡Hola! 👋"). Enriquecimiento del diccionario con apellidos hispanos comunes (Luna, Mora, Paz, Ríos, Vega, etc.).
  3. **Manejo Conciso y Humano de Solicitudes de Llamada (`dmHandler.ts`)**:
     - *Causa raíz*: Cuando un usuario decía "regálame una llamada", JanIA soltaba una letanía defensiva recitando todos sus sombreros y trámites (predial, notarías, etc.).
     - *Solución*: Respuesta ultra ágil en máximo 2 a 3 renglones: confirma con gusto, entrega el canal directo de Eduardo Rivera y Jani Alves (+57 316 656 9719) y pregunta brevemente el tema a tratar para dejarles el recado listo, con prohibición estricta de soltar discursos de autopresentación.
  4. **Continuidad Conversacional sin Muletillas de Nombre**:
     - Prohibición estricta de clavar el nombre del usuario al inicio de cada frase consecutiva en conversaciones activas.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` passing ✅ | `npm run build` limpio en 32s ✅
- `shared/const.ts` (`v33.35`) y `package.json` (`33.35.0`).

## 🔖 VERSIÓN ANTERIOR: v33.34 — Octubre 2026

### Novedades v33.34 (Atomicidad Canal-Grupos, Ficha Estandarizada [], Resiliencia ADRES y Web Grounding):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Atomicidad Estricta en CronService (Canal vs. Grupos) (`server/_core/cronService.ts`, `whatsapp-match.ts`)**:
     - *Causa raíz*: Los mensajes trampolín a los Grupos 2 y 3 se enviaban incluso si la publicación en el Canal Oficial de WhatsApp (`@newsletter`) fallaba o no confirmaba entrega. Además, los Canales no soportan el protocolo de encuestas nativas de Baileys (`pollCreationMessageV3`).
     - *Solución*: Implementada comprobación de entrega efectiva (`deliveryId`). Si la publicación en el Canal no retorna un ID válido, se aborta inmediatamente el envío de teasers a los grupos. En Canales, las encuestas se publican como infografía o texto formateado con opciones A, B y C, habilitando la votación interactiva nativa con `sendPollToGroup` en los Grupos 2 y 3.
  2. **Asesor de Requerimientos y Completitud de Fichas (`prompts.ts`, `propertiesHandler.ts`, `dmHandler.ts`)**:
     - *Causa raíz*: Requerimientos sin presupuesto, sin aclaración de cuota de administración, con zonas difusas o sin tipología clara eran procesados prematuramente, detonando sondeos de mercado o matches espurios.
     - *Solución*: `evaluateRequirementCompleteness` y `generateFichaTecnicaRequerimientoIncompleto`. Si faltan datos clave, se bloquea el match viable (`findMatchesForRequirement` no se dispara), se marca en BD como `incompleto` y JanIA devuelve la Ficha Técnica Estandarizada con campos faltantes entre corchetes `[ ]` para guiar al colega.
  3. **Resiliencia en Consulta ADRES (`server/_core/identityVerificationService.ts`)**:
     - *Causa raíz*: ASP.NET BDUA (`ConsultarAfiliadoWeb_2.aspx`) bloqueaba peticiones por falta de cabeceras completas de navegador o discrepancia de `Origin`/`Referer`, arrojando "dato no encontrado" o fallos intermitentes.
     - *Solución*: Pool rotativo `ADRES_USER_AGENTS`, cabeceras de navegación completas, `Origin: https://aplicaciones.adres.gov.co` y `Referer: https://aplicaciones.adres.gov.co/BDUA_Internet/Pages/ConsultarAfiliadoWeb_2.aspx` en el POST, y bucle de reintento automático con backoff.
  4. **Consultas en Línea con Web Grounding y TRM Oficial (`server/_core/scraper.ts`, `dmHandler.ts`, `consultingHandler.ts`, `circuloHandler.ts`)**:
     - *Causa raíz*: Consultas normativas (POT 555 de Bogotá, Estatuto Tributario, UVT, Notarías SNR, trámites gubernamentales o divisas TRM) requerían contrastación en tiempo real para evitar desactualizaciones normativas.
     - *Solución*: `searchWebGrounding(query)` con extracción limpia a $0 COP vía DuckDuckGo HTML, y `fetchLiveTRM()` consumiendo en vivo la API de Datos Abiertos del Gobierno Nacional (`datos.gov.co/resource/32sa-8pi3.json`).
  5. **Seguridad y Confidencialidad en el Canal (`server/_core/cronService.ts`)**:
     - *Causa raíz*: Riesgo de divulgar datos internos del servidor, credenciales de base de datos o teléfonos personales de propietarios en publicaciones públicas.
     - *Solución*: `sanitizeChannelContent` filtra rigurosamente direcciones IP, rutas del sistema (`/home/`), strings de conexión PostgreSQL y números telefónicos privados, canalizando cualquier contacto a la Dirección de Operaciones (+57 316 656 9719).
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | Tests `npm test` passing ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.34`) y `package.json` (`33.34.0`).

## 🔖 VERSIÓN ANTERIOR: v33.33 — Octubre 2026

### Novedades v33.33 (Retiro de Gemini 2.5, Modelos Gemini 3.8 / Latest, Continuidad Conversacional en DMs, Supresión de Candados Estáticos y Protocolo Comercial 40/20/40):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Retiro Definitivo de Gemini 2.5 y Priorización de Modelos Activos (`server/_core/llm.ts`, `vision.ts`)**:
     - *Causa raíz*: Google deprecó los modelos `gemini-2.5-flash`, `gemini-2.5-pro` y `gemini-2.5-flash-lite` para nuevos usuarios arrojando errores HTTP 404, causando 2 intentos fallidos por llamada y latencias evitables.
     - *Solución*: Erradicación total de `gemini-2.5` en `HIGH_REASONING_MODELS`, `MECHANICAL_MODELS` y `VISION_FALLBACK_MODELS`. Priorización inmediata de `gemini-3.8-flash` y `gemini-flash-latest`.
  2. **Continuidad Conversacional sin Saludos Reiterativos en DMs y Foros (`dmHandler.ts`, `consultingHandler.ts`, `circuloHandler.ts`)**:
     - *Causa raíz*: En chats con interacción en el mismo día o en una ventana de 6 horas, se anteponían saludos prefabricados ("¡Hola, Flor Alba! Qué gusto saludarte...") o muletillas de autopresentación ("Soy JanIA...").
     - *Solución*: Determinación de `isOngoingChat = hasRecentInteractionPast6Hours || history.length > 0 || alreadyGreetedToday`. Activación de `stripLeadingGreetingsAndCourtesies` en respuestas conversacionales para fluir directo al grano con calidez.
  3. **Erradicación del Candado Estático en Asistente de Matches (`adminMatchAssistantService.ts`)**:
     - *Causa raíz*: Consultas de cruces por asesores externos devolvían un bloque hostil y estático con candados ("🔒 ACCESO RESTRINGIDO - PROTOCOLO DE PRIVACIDAD VECY").
     - *Solución*: Supresión del interceptor estático. Adopción de `formatMatchReport` para generar un reporte ejecutivo y respetuoso que preserva la privacidad de datos de contacto de ambas partes y orienta hacia la mediación colaborativa 40/20/40 con la Dirección de Operaciones (+57 316 656 9719).
  4. **Apagado de Avalúos Automáticos Involuntarios (`dmHandler.ts`)**:
     - *Causa raíz*: Al ingresar datos de un inmueble, el LLM seleccionaba `sondeo_mercado_inmobiliario` sin que el usuario lo pidiera.
     - *Solución*: Guard estricto `isExplicitValuation` que restringe el uso de sondeos y avalúos únicamente a solicitudes explícitas ("avaluo", "cuanto vale", "en cuanto se vende", "valor comercial").
  5. **Protocolo Comercial y Filtro 40/20/40 en DMs (`dmHandler.ts`, `sessionManager.ts`)**:
     - *Causa raíz*: Preguntas privadas sobre el emoji de reacción (👍/📝) en grupos o el reenvío de inmuebles no contaban con un flujo pedagógico y de captación comercial.
     - *Solución*: JanIA explica que el emoji confirma el registro en la base de datos de Vecy sin necesidad de duplicar el mensaje, compromete aviso inmediato ante matches ≥ 80%, y formula la pregunta de filtro sobre aceptación del esquema de comisión compartida 40/20/40, persistiendo el estado del asesor en RAM, disco y PostgreSQL (`advisors` y `pendingSessions`).
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 327/327 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 34s ✅
- `shared/const.ts` (`v33.33`) y `package.json` (`33.33.0`).

## 🔖 VERSIÓN ANTERIOR: v33.32 — Octubre 2026

### Novedades v33.31 (Unificación Cognitiva Grupos 2 y 3, Depuración de Apellidos y Continuidad Orgánica):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Depuración de Apellidos vs. Nombres Compuestos (`server/_core/nameAndGenderResolver.ts`)**:
     - *Causa raíz*: En WhatsApp, usuarios con nombre y apellido (ej. "Mario Pérez") eran procesados por la heurística de 2 palabras concatenando el apellido como parte del nombre ("Mario Pérez"), generando vocativos repetitivos y acartonados.
     - *Solución*: Inclusión de `COMMON_COLOMBIAN_SURNAMES` y `COMMON_FIRST_NAMES_SET`. Ahora, cualquier apellido común detectado en la segunda posición es descartado, asignando como `displayName` exclusivamente el nombre de pila ("Mario"). Se preservan con total exactitud los nombres compuestos legítimos ("Flor Alba", "Juan Carlos", "Carlos Mario").
  2. **Continuidad Conversacional y Erradicación de Saludos Bucle en Grupos 2 y 3 (`circuloHandler.ts` y `consultingHandler.ts`)**:
     - *Causa raíz*: En los grupos 2 (`VECY TIPS / CONSULTAS INMOBILIARIAS`) y 3 (`PROYECTO VECY NETWORK`), no se marcaba la sesión del usuario al responder (`markUserGreetedToday(userId)` no se invocaba). Esto provocaba que en cada turno JanIA interpretara `alreadyGreeted = false` y volviera a emitir "¡Buenos días, estimado Mario Pérez!", y a repetir su nombre en cada frase.
     - *Solución*: Inyección de `isOngoingChat = alreadyGreeted || history.length > 0` y llamada rigurosa a `markUserGreetedToday(userId)`. Directiva inquebrantable de continuidad: si la conversación está en curso, queda TERMINANTEMENTE PROHIBIDO volver a saludar y TERMINANTEMENTE PROHIBIDO repetir el nombre de la persona en cada mensaje como muletilla.
  3. **Criterio Estratégico de Unificación de Grupos**:
     - Paridad cognitiva absoluta en backend: JanIA atiende con el mismo nivel de inteligencia profunda ARGON, sin plantillas rígidas, tanto en el Grupo 2 (jurídico/tributario/avalúos/predial) como en el Grupo 3 (debate/visión/proyecto), fluyendo como en los DMs privados.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 319/319 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 15s ✅
- `shared/const.ts` (`v33.31`) y `package.json` (`33.31.0`).

## 🔖 VERSIÓN ANTERIOR: v33.30 — Octubre 2026

### Novedades v33.30 (Arquitectura Cognitiva Nivel ARGON, Memoria Perpetua, Auditoría Google Review y Navegación Web):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Nivel Cognitivo ARGON y Modelos de Alto Razonamiento (`llm.ts` y `prompts.ts`)**:
     - *Elevación del razonamiento*: Priorización en DMs y herramientas cognitivas de los modelos de alto razonamiento (`gemini-2.5-flash` y `gemini-2.5-pro`), asegurando maestría enciclopédica en Derecho Civil, Comercial, Administrativo, Notarial/Registral (Ley 1579 de 2012), POT 555 de Bogotá y operaciones internacionales en divisas y criptoactivos.
     - *Preservación aditiva total*: Coexistencia armónica de la doctrina de urbanidad de Carreño, pedagogía de firma electrónica (MinTIC/AND), soluciones proptech (`Vecy Agenda Pro`, software a la medida) y canalización personalizada con el bróker oficial (`+57 316 656 9719`).
  2. **Voz Humana Estilo "Laomedeia" y Conciencia Horaria/Género (`dmHandler.ts` y `nameAndGenderResolver.ts`)**:
     - *Inyección horaria precisa*: Determinación en tiempo real de la hora, día de la semana y fecha exacta de Colombia (`America/Bogota`) para contextualizar con naturalidad el momento del día y emitir saludos horarios precisos ("buenos días", "buenas tardes", "buenas noches") solo en el primer turno de una sesión.
     - *Resolución depurada de nombres y género*: Limpieza de etiquetas gremiales entre corchetes, paréntesis o barras (`[Inmo]`, `(Realtor)`, `/ Broker`), detección de nombres compuestos femeninos ("Flor Alba", "Floralba") y trato con vocativos y cortesía natural.
     - *Cero dobles saludos*: Si la conversación está activa (últimas 6 horas), JanIA va directo al grano con empatía y calidez, sin repetir "Soy JanIA..." ni anteponer "¡Hola!" en cada turno.
  3. **Memoria Perpetua Dual y Auditoría Estricta de Reseñas en Google (`sessionManager.ts`)**:
     - *Expediente perpetuo*: Creación de `UserPerpetualSession` persistido tanto en memoria RAM como en archivo JSON en disco (`data/jania_persistent_sessions.json`) y en base de datos PostgreSQL (`pendingSessions` con clave `user_memory:${cleanJid}`).
     - *Auditoría de reseñas*: Seguimiento riguroso del estado de reseña en Google. Si el usuario afirma haber dejado reseña, JanIA solicita amablemente la captura de pantalla para verificarla mediante visión multimodal antes de otorgar beneficios adicionales. Eduardo Rivera y Jani Alves quedan exonerados permanentemente de peticiones de calificación.
     - *Control de gratuidad*: Conteo de servicios de cortesía utilizados (cédulas, predial, IDU, RUES).
  4. **Superpoderes de Navegación Web y Consulta de Catálogo (`scraper.ts` y `dmHandler.ts`)**:
     - *Scraper web en vivo*: Integración de `fetchWebUrlContent` para acceder e inspeccionar páginas públicas en tiempo real ante consultas con URLs.
     - *Herramienta de catálogo*: Incorporación de `consultar_catalogo_inmuebles_vecy` para buscar inmuebles directamente en la base de datos de Vecy y compartir enlaces oficiales (`https://vecy-bienes-raices.vercel.app/properties`).
     - *Asincronía en flyers*: En WhatsApp, los flyers comerciales se procesan en segundo plano sin interrumpir ni bloquear preguntas conversacionales inmediatas del usuario.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 316/316 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 21s ✅
- `shared/const.ts` (`v33.30`) y `package.json` (`33.30.0`).

## 🔖 VERSIÓN ANTERIOR: v33.29 — Octubre 2026

### Novedades v33.29 (Erradicación de Fallback Sintético RUES 901.488.282-3, Variantes Morfológicas, Blindaje contra Cuelgues SSE en Tests y Fallback IDU con Chat Virtual):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Erradicación Definitiva de Datos Sintéticos RUES (`identityVerificationService.ts` y `ruesService.ts`)**:
     - *Causa raíz*: Se generaba un NIT sintético `901.488.282-3` de relleno cuando RUES no encontraba una empresa.
     - *Solución*: Erradicación total de NITs o razones sociales ficticias; reporte transparente pidiendo el NIT oficial.
     - *Soporte morfológico*: Generación de variantes unidas, separadas y con comodín ("Multi-impresos" / "Multiimpresos") con `evaluateRazonSocialMatch`.
     - *Corrección de captura regex*: Reparación del grupo capturante en `clean.match(/\b((?:\d{1,3}(?:\.\d{3}){2}|\d{7,10}))(?:-(\d))?\b/)` resolviendo `TypeError: Cannot read properties of undefined (reading 'replace')`.
  2. **Blindaje de Red y Protección contra Cuelgues de Conexión en Tests**:
     - *Causa raíz del corte de socket SSE (`use of closed network connection`)*: `queryProcuraduria` ejecutaba 6 intentos de `httpRequest` externos de 15 segundos cada uno en entorno de test sin mock, provocando un congelamiento de más de un minuto que cerraba el socket TCP de streaming en el IDE.
     - *Solución*: Bypass rápido en `NODE_ENV === "test"` para `queryProcuraduria`, `queryAdres` y `queryPoliciaNacional`.
     - *Preservación de identidad en caché*: Corrección de la invalidación destructiva de `identityCache` cuando se pre-sembraban datos en tests (Caso Martha Mesa).
  3. **Fallback Inteligente y Canales de Contingencia de IDU (`iduValorizacionService.ts`)**:
     - Inclusión del portal oficial (`generateCert.xhtml`), del enlace directo al Chat Virtual de Atención al Ciudadano (`https://www.idu.gov.co/page/atencion-al-ciudadano/canales-de-atencion/chat-virtual`), acceso directo (`chat_valorizacion/chat`), horarios de atención (L-V 7:00 a.m. a 4:30 p.m.) y guía para solicitar remisión del Paz y Salvo al correo por agente humano.
  4. **Cero Segundo Mensaje Automático en DMs (`dmHandler.ts`)**:
     - `popLatestDmFollowUpMessage` retorna `undefined` de forma consistente, preservando la autonomía y naturalidad de JanIA sin encadenar mensajes forzados.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 312/312 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 15s ✅
- `shared/const.ts` (`v33.29`) y `package.json` (`33.29.0`).

## 🔖 VERSIÓN ANTERIOR: v33.28 — Octubre 2026

### Novedades v33.28 (Endurecimiento RUES contra Homónimos Falsos y Entrega 100% Libre sin Plantillas Rígidas en DMs):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Endurecimiento de Búsqueda RUES (`server/_core/ruesService.ts`)**:
     - *Causa raíz*: Las búsquedas abiertas traían coincidencias parciales amplias que asociaban homónimos lejanos o empresas genéricas no deseadas cuando el usuario consultaba una razón social (ej. "Multiempresas").
     - *Implementación de `evaluateRazonSocialMatch`*: 100 puntos a coincidencia exacta perfecta; `80 - Math.min(diffLength, 30)` si el término está contenido penalizando longitud excesiva; 0 puntos si no contiene el término buscado.
     - *Filtrado estricto en `selectPrincipalRuesRecord`*: Si ningún registro obtiene score > 0, se descartan homónimos falsos y se retorna null de forma segura.
  2. **Entrega 100% Libre y Conversacional sin Plantillas Rígidas en DMs (`server/_core/jania/handlers/dmHandler.ts`)**:
     - *Eliminación de Plantillas y Coletillas Estáticas*: Se limpió `formatPoliteToolDelivery` para que retorne directamente la respuesta original, pulida y fluida del LLM (`rawAiResponse.trim()`), sin incrustaciones prefabricadas de Google Reviews ni bloques obligatorios de cierre.
     - *Erradicación de la Pregunta Forzada de Representante Legal*: Se eliminó la inyección artificial de `setLatestDmFollowUpMessage` tras consultas empresariales, permitiendo que JanIA fluya con libertad cognitiva total.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 307/307 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 12s ✅
- `shared/const.ts` (`v33.28`) y `package.json` (`33.28.0`).

## 🔖 VERSIÓN ANTERIOR: v33.27 — Octubre 2026

### Novedades v33.27 (ADRES BDUA con EPS limpia, Hábeas Data al Final, Autonomía de Reportes de JanIA, Visión y Debate Orgánico en Grupos 2 y 3):
- **Diagnóstico y Solicitud de Eduardo A. Rivera**:
  1. **ADRES BDUA y Extracción de EPS Real**: JanIA debe consultar ADRES (BDUA) y reflejar con exactitud la EPS a la que pertenece el individuo verificado (ej. `Capital Salud EPS-S`, `Sanitas EPS`, `Nueva EPS`, `Sura EPS`), decodificando entidades HTML y reportando su estado (`ACTIVO`) y régimen (`SUBSIDIADO` o `CONTRIBUTIVO`), persistiendo estos datos en caché para cero latencia y $0 COP.
  2. **Posición Doctrinal de la Cláusula de Hábeas Data**: La cláusula de Hábeas Data (Ley 1581/12 y Art. 15 C.P.) debe ubicarse OBLIGATORIAMENTE al FINAL del reporte, evitando anteponerse o interrumpir la lectura de los datos de identidad y antecedentes. Finaliza con el sello de cortesía: `Servicio de cortesía de VECY BIENES RAÍCES 🤝.`.
  3. **Autonomía Cognitiva de Diseño de Reportes para JanIA**: JanIA no queda restringida a una ficha fija ni plantilla rígida obligatoria; tiene plena libertad para diagramar, construir y entregar a cada usuario su propio modelo de reporte de forma corta, elegante, ejecutiva y contundente bajo el estilo de VECY.
  4. **Visión Multimodal, Documentos y Debate Orgánico en Grupos 2 y 3**: Se amplió el soporte para que el Grupo 3 (`circuloGroupId` / Proyecto VECY) procese imágenes, PDFs y el contexto de mensajes citados (`quotedContext`) con la misma solvencia que el Grupo 2 (`buzonGroupId`), debatiendo fluidamente sin respuestas robóticas de servicio al cliente.
  5. **Depuración de Nombres en `nameAndGenderResolver`**: Limpieza de títulos profesionales (ej. "Karina Agente Inmobiliaria Independiente" -> "Karina", femenino, "estimada Karina") y bloqueo de saludos aislados como nombres propios ("Hola" -> "colega").
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 303/303 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 14s ✅
- `shared/const.ts` (`v33.27`) y `package.json` (`33.27.0`).

## 🔖 VERSIÓN ANTERIOR: v33.26 — Octubre 2026

### Novedades v33.25 (Prevalencia de Venta sobre Cuota de Administración (+ admón), Deduplicación de Reacciones por Grupo y Subsanación en Republicación):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Causas Raíz Identificadas**:
     - *Falso positivo de arriendo por cuota de administración y amoblado*: La publicación de Ana Morales Castillo (`VENTA • OFICINA • CEDRITOS ... $750M + admón $1.1M ... amoblado o sin muebles`) activaba `hasRentExplicit` y `hasRentSignals` por `+ admón` y `amoblado`. Esto hacía que JanIA asignara reacción de arriendo `👌` en vez de `👍`.
     - *Deduplicación global por `msgId`*: La asesora publicó simultáneamente en varios grupos. `safeReact` deduplicaba por `msgId` en lugar de `chatId + msgId`. El emoji `👌` se colocó en un grupo externo y bloqueó la reacción en nuestro grupo oficial `VECY INMO OFERTAS Y DEMANDAS` (`120363260108880069@g.us`).
     - *Deficiencia en republicación*: En base de datos, la publicación coincidió con la propiedad #4890 (ingestada previamente como arriendo con precio $0). La republicación no actualizaba `price`, `rentPrice` ni `transactionType`.
  2. **Aclaración Estratégica de Costos a Eduardo**:
     - Las reacciones de WhatsApp vía socket Baileys (`safeReact`) consumen **$0.00 COP y 0 tokens de Gemini**. Son tramas WebSocket nativas directas al servidor de WhatsApp.
     - La clasificación para reacción opera mediante Fast-Path heurístico local en < 2ms sin invocar el LLM.
     - Indexar `safeReact` por `${chatId}_${msgId}` garantiza que cada grupo independiente (incluido el oficial de Vecy) reciba su reacción sin incrementar cuotas de IA.
  3. **Soluciones Implementadas**:
     - **Prevalencia de Venta en `whatsapp-match.ts` y `propertiesHandler.ts`**: Si el texto contiene venta explícita (`isExplicitVenta`), las menciones de cuota de administración o amoblado no activan señales de arriendo.
     - **Deduplicación por Grupo en `safeReact`**: Clave compuesta `reactKey = `${chatId}_${msgId}``.
     - **Subsanación en Republicaciones**: En `propertiesHandler.ts`, si la nueva publicación aporta precio válido > 0, se actualizan `price`, `rentPrice` y `transactionType`.
     - **Subsanación en BD Contabo**: Propiedad #4890 actualizada a `venta`, $750.000.000 y admón $1.100.000.
     - **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 298/298 passing (100% verde a $0 COP) ✅ | `npm run build` limpio en 25s ✅
- `shared/const.ts` (`v33.25`) y `package.json` (`33.25.0`).

## 🔖 VERSIÓN ANTERIOR: v33.24 — Octubre 2026

### Novedades v33.24 (Resiliencia LLM en DMs, Eliminación de Intermitencia Temporal y Timestamps Huérfanos, Cobertura Geográfica Nacional Completa y Protocolo de Despliegue Dual):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Causa Raíz de "Intermitencia temporal" en DMs de WhatsApp**:
     - *Agotamiento de créditos en clave de pago (HTTP 402)*: Cuando la clave de pago de Google Gemini (`GEMINI_PAID_KEY`) arrojó `"Your prepayment credits are depleted"`, no se pausaba adecuadamente y causaba errores en cascada.
     - *Timeout breve (12s)*: Las consultas jurídicas profundas o con 7 declaraciones de herramientas en `gemini-flash-latest` superaban los 12s de axios en el VPS, abortando la llamada prematuramente.
     - *Fallo con `tools` en `dmHandler.ts`*: Si la llamada con herramientas fallaba o si el modelo rechazaba el esquema, la excepción caía directo al `catch` general enviando el mensaje genérico de intermitencia temporal en lugar de reintentar de forma conversacional sin herramientas.
  2. **Soluciones Implementadas en el Núcleo Cognitivo**:
     - **Gestión de HTTP 402 en `server/_core/llm.ts`**: Pone la clave con créditos agotados en cooldown de 3600 segundos (1 hora) y regresa automáticamente al pool gratuito de 4 claves ($0 COP).
     - **Ampliación de Timeout a 25 segundos**: Margen suficiente para razonamiento jurídico profundo y respuestas articuladas con jurisprudencia y normativa colombiana (Ley 820 de 2003).
     - **Fallback Inmediato ante Error 400 de Herramientas**: Si Google rechaza los esquemas de tools, se desactiva `payload.tools` y se reintenta instantáneamente en modo conversacional.
     - **Reintento Conversacional en `server/_core/jania/handlers/dmHandler.ts`**: Si `invokeLLM` con `JANIA_DM_TOOLS` arroja excepción, un bloque interno try/catch ejecuta de inmediato un reintento limpio sin herramientas antes de cualquier fallback de texto.
     - **Erradicación de Timestamps Huérfanos `[YYYY-MM-DD HH:mm]`**: En `sessionManager.ts`, los turnos del asistente se almacenan y recuperan limpios de prefijos de fecha. En `dmHandler.ts`, se desinfecta cualquier timestamp residual con regex al inicio de la respuesta y se refuerza la directiva negativa en los prompts.
     - **Supresión de Falsos Positivos de Calificación de Google e Invitación a Grupos**: En `server/_core/whatsapp-match.ts`, se restringe la activación de reviews e invitaciones: NO se dispara si el mensaje contiene `?`, si tiene más de 15 palabras, si incluye vocabulario inmobiliario/jurídico, si la respuesta principal fue un error o si el remitente es un administrador oficial (Eduardo o Jani).
  3. **Cobertura Geográfica Nacional Completa**:
     - Reconocimiento y deducción en tiempo real de las principales ciudades y departamentos de Colombia (Medellín, Cali, Barranquilla, Bucaramanga, Cartagena, etc.) con paridad total en WhatsApp y Web.
  4. **Protocolo de Despliegue Dual**:
     - Actualización de credenciales de GitHub con token sin expiración en el remoto y despliegue directo por SSH al VPS de Contabo (`13.140.149.144`).
  5. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 296/296 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.24`) y `package.json` (`33.24.0`).

## 🔖 VERSIÓN ANTERIOR: v33.23 — Octubre 2026

### Novedades v33.23 (Blindaje de `splitMultiItemMessage` contra Bordes Decorativos, Erradicación de Falsos Positivos de Moderación en Grupo 1 y Deducción de Bogotá en Barrios Capitalinos):
- **Diagnóstico Forense y Solicitud de Eduardo A. Rivera**:
  1. **Causa Raíz Identificada**: Un requerimiento legítimo de arriendo con formato estético de líneas `===` y `---` era dividido por `splitMultiItemMessage` en 3 fragmentos aislados. El último fragmento (`👤 Clienta directa lista / 📲 Info & fotos al privado / 🤝 ¡Hagámos negocios!`) se procesaba como mensaje autónomo y, al carecer aisladamente de palabras como "apto" o "arriendo", activaba el filtro de fuera de tema emitiendo una amonestación indebida al grupo y sobreescribiendo el éxito de las inserciones previas.
  2. **Blindaje de `splitMultiItemMessage` (`server/_core/jania/heuristics.ts`)**: Introducción de `isAutonomousListingBlock` y `isTrailerBlock`. El corte por delimitadores (`===`, `---`) ahora exige que al menos dos de los bloques resultantes sean publicaciones inmobiliarias autónomas completas (`autonomousCount >= 2`); de lo contrario, se mantiene unificado como un único mensaje. Además, los bloques residuales de contacto o llamadas a la acción se fusionan de forma automática con el bloque anterior.
  3. **Preservación de Inserciones y Vocabulario Inmobiliario (`server/_core/jania/handlers/propertiesHandler.ts`)**: En el bucle multi-item, si al menos un fragmento fue insertado con éxito, se preserva el resultado válido (`INMUEBLE` o `REQUERIMIENTO`) y jamás se emite una amonestación por fragmentos residuales. Se amplió `onTopicKeywords` con términos reales del corretaje (`clienta`, `negocios`, `fotos`, `inversionista`, `broker`, `asesor`, `privado`, `colina`, `niza`, `suba`, etc.).
  4. **Reconocimiento y Deducción Geográfica (`server/_core/jania/parsers.ts`)**: Se incluyeron `Sotileza` y `Niza Antigua` en `KNOWN_BARRIOS_SORTED_ITEMS` y se implementó la deducción automática de `Bogotá, D.C.` cuando se identifica un barrio bogotano sin ciudad explícita en el texto.
  5. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 291/291 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.23`) y `package.json` (`33.23.0`).

## 🔖 VERSIÓN ANTERIOR: v33.22 — Octubre 2026

### Novedades v33.22 (Estandarización de Iconografía y Formato en Verificación Oficial de Identidad — `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴` + `⚖️ *_Habeas Data (Ley 1581/12):_* ... *_Art. 15 de la C.P._*`):
- **Solicitud Doctrinal de Eduardo A. Rivera**:
  1. **Actualización de Encabezado y Cláusula Habeas Data en Verificación de Identidad (`server/_core/identityVerificationService.ts`)**:
     - Cambio de `☑️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴` + `🛡️ *_Habeas Data (Ley 1581/12):_* ... Art. 15 de la C.P."` por:
       * `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴`
       * `⚖️ *_Habeas Data (Ley 1581/12):_* "Validación bajo principios de finalidad legítima, seguridad y confidencialidad. Tratamiento de datos provistos voluntariamente por el titular cumplimiento legal *_Art. 15 de la C.P._*"`
  2. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 288/288 passing (100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.22`) y `package.json` (`33.22.0`).

## 🔖 VERSIÓN ANTERIOR: v33.21 — Octubre 2026

### Novedades v33.21 (Título y Marco Legal Propio por Servicio — Empresa vs. Identidad —, Pregunta Post-Reporte en Mensaje Separado y Flujo Interactivo NO vs. SÍ):
- **Solicitud Doctrinal de Eduardo A. Rivera**:
  1. **Título y Marco Legal Propio para Empresa vs. Persona Natural (`server/_core/identityVerificationService.ts`)**:
     - **Verificación de Empresa (`isNit = true`)**: Encabezado propio `🛡️ *VERIFICACIÓN OFICIAL DE EMPRESA — VECY BIENES RAÍCES* 🇨🇴` y bloque legal `⚖️ *_Publicidad Mercantil y Datos Públicos (Art. 26 C. de Co. y Ley 1581/12):_* "Consulta oficial sobre registros públicos mercantiles (RUES / Confecámaras) de libre acceso legal (Art. 26 C. de Co.) y datos públicos de representación legal exceptuados de autorización previa (Art. 10 lit. b Ley 1581/12 y Sentencia C-748/11)."` (ya que conforme a la Corte Constitucional Sentencia C-748/11 la Ley 1581 protege personas naturales, mientras que el registro mercantil societario se rige por la publicidad mercantil del Art. 26 del Código de Comercio y la excepción de datos públicos del Art. 10 de la Ley 1581/12 para sus representantes legales).
     - **Verificación de Persona Natural (`CC / CE / Pasaporte`)**: Conserva su encabezado propio `🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴` y su bloque `⚖️ *_Habeas Data (Ley 1581/12):_*`. Cada servicio mantiene su formato y título propio.
  2. **Pregunta Post-Reporte Desacoplada en Mensaje Separado (`identityVerificationService.ts`, `dmHandler.ts`, `whatsapp-match.ts`)**:
     - La pregunta `💡 *¿Deseas que realice la verificación de identidad y antecedentes (Policía, Procuraduría, Contraloría y ADRES) del Representante Legal Principal (*Sandra Milena Diaz Mondragon* — C.C. 46.375.136) o de algún otro miembro?*\n👉 Responde *"sí"* o *"verificar representante"* (o envíame la cédula a consultar).` ya NO se incrusta dentro del mismo reporte de la empresa, sino que se almacena en `followUpQuestionText` / `setLatestDmFollowUpMessage` y se despacha como un **mensaje independiente** ~900ms después del reporte empresarial.
  3. **Flujo Interactivo ante Respuesta "NO" vs. "SÍ" (`politenessService.ts`, `dmHandler.ts`, `identityVerificationService.ts`)**:
     - **Si el usuario responde "NO"** (`isDecliningCompanyMemberVerification`: `"no"`, `"no gracias"`, `"así está bien"`, `"ninguno"`): JanIA limpia la sesión pendiente y envía `formatCompanyFollowUpDeclineReviewMessage`, invitando amablemente a calificar y comentar en Google Reviews (`https://g.page/r/CctNbwU6UpX5EBM/review`) haciendo alusión explícita a que su opinión ayuda a que estos servicios sigan siendo **100% GRATUITOS**.
     - **Si el usuario responde "SÍ"** (`isAcceptingCompanyMemberVerification`: `"sí"`, `"verificar representante"`, `"verificar todos"`, etc.): JanIA procede de inmediato a verificar el documento del Representante Legal (cacheando su nombre certificado por RUES en `ruesVerifiedNames` para máxima resiliencia) y entrega el reporte con su formato y título propios (`🛡️ *VERIFICACIÓN OFICIAL DE IDENTIDAD — VECY BIENES RAÍCES* 🇨🇴`).
  4. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 288/288 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.21`) y `package.json` (`33.21.0`).

## 🔖 VERSIÓN ANTERIOR: v33.20 — Octubre 2026

### Novedades v33.20 (Plantilla Informativa Oficial RUES de 4 Secciones — NIT ↔ Razón Social — y Verificación Post-Reporte de Miembros):
- **Solicitud Doctrinal de Eduardo A. Rivera**:
  1. **Plantilla Informativa Oficial RUES en 4 Secciones (`server/_core/ruesService.ts` y `server/_core/identityVerificationService.ts`)**:
     - Operación bidireccional: si el usuario entrega un **NIT**, JanIA consulta y devuelve la **Razón Social** y toda la ficha RUES; si el usuario entrega una **Razón Social**, JanIA averigua el **NIT + DV** y entrega toda la ficha RUES.
     - **Sección 1 — Información General (`🆔 INFORMACIÓN GENERAL — DATOS EMPRESARIALES`)**: Razón Social, Identificación (`NIT 900.788.832-8 (900788832 - 8)`), Categoría de la Matrícula (`Sociedad ó persona jurídica principal ó ESAL`), Tipo de Sociedad (`Sociedad comercial`), Tipo Organización (`Sociedades por acciones simplificadas SAS`), Cámara de Comercio (`Bogotá D.C.`), Número de Matrícula (`2517719`), Fecha de Matrícula (`2014-11-10`), Fecha de Renovación (`2026-04-08`), Último Año Renovado (`2026`) y Estado (`Activa`).
     - **Sección 2 — Actividad Económica (`📈 ACTIVIDAD ECONÓMICA (CIIU)`)**: Extracción de todas las actividades económicas registradas (`extractActividadesEconomicas`, ej. `4923 — Transporte de carga por carretera` y `7710 — Alquiler y arrendamiento de vehículos automotores`).
     - **Sección 3 — Representante Legal (`👥 REPRESENTANTE LEGAL Y MIEMBROS INSCRITOS`)**: Desglose de cada miembro con cargo específico (Presidente / Representante Legal Principal / Suplentes), nombre completo y documento de identidad (`C.C. ...`).
     - **Sección 4 — Propietario / Establecimiento (`🏪 PROPIETARIO / ESTABLECIMIENTO`)**: Tabla estructurada (`Razón Social | Categoría | Cámara de Comercio | Matrícula | Fecha Matrícula | Fecha Renovación | Último Año Renovado | Estado`) o `"No se encontraron resultados."` cuando no registra establecimientos adicionales.
  2. **Separación Limpia entre Ficha RUES y Verificación de Antecedentes de los Miembros (`identityVerificationService.ts` y `dmHandler.ts`)**:
     - Se obvia el bloque de antecedentes dentro del reporte inicial de RUES y, al finalizar la ficha empresarial, JanIA pregunta directamente al usuario si desea que realice la verificación de identidad y antecedentes (Policía, Procuraduría, Contraloría y ADRES) del **Representante Legal Principal** o de **cada uno de los miembros** registrados (`"verificar representante"` o `"verificar todos"`), almacenando la lista completa en sesión (`setPendingCompanyMembers`).
  3. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 287/287 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.20`) y `package.json` (`33.20.0`).

## 🔖 VERSIÓN ANTERIOR: v33.19 — Octubre 2026

### Novedades v33.19 (Normalización de `functionCall.args` en Gemini REST API y Motor Dual RUES Nacional con Datos Abiertos Socrata — 0 Geo-Block desde VPS):
- **Diagnóstico Forense y Reporte de Eduardo A. Rivera**:
  1. **Reporte en WhatsApp (`Jania verificame este nit 900788832`)**: Eduardo reportó que al solicitar en WhatsApp la verificación del NIT `900788832`, JanIA respondió mostrando el NIT `901.488.282-3` y `Razón Social: Persona Jurídica Registrada` en lugar de los datos reales de la sociedad (`TRANSPORTES GONZALEZ DIAZ TG&D SAS`).
  2. **Causa Raíz #1 — `functionCall.args` vs `functionCall.arguments` en Gemini REST API (`server/_core/llm.ts` y `server/_core/jania/handlers/dmHandler.ts`)**:
     - La API REST oficial de Google Gemini (`v1beta/models/...:generateContent`) devuelve los argumentos de las herramientas en la propiedad `functionCall.args`, mientras que `dmHandler.ts` leía únicamente `fnCall.arguments || {}`.
     - Al recibir `{}` vacío, `executeJaniaDmTool` invocaba `queryEmpresaOrNit("", userId)`, lo que activaba el bloque `else` de respaldo con el NIT `901488282` y razón social vacía.
     - **Solución**: En `llm.ts` se busca `functionCall` en cualquiera de las partes (`parts.find(p => p.functionCall)`) y se normaliza el objeto poblando simultáneamente `args` y `arguments`. En `dmHandler.ts` se resuelve `fnCall.arguments ?? fnCall.args ?? {}` y se pasa además `clean` (`rawUserText`) como respaldo a `executeJaniaDmTool`. Asimismo, en `llm.ts` se salta de inmediato al siguiente modelo cuando un modelo devuelve 404 / `"no longer available"`, ahorrando ~3.5 segundos de latencia por mensaje.
  3. **Causa Raíz #2 — Bloqueo Geográfico AWS ELB (`403 Forbidden`) en `elasticprd.rues.org.co` desde IPs europeas (Contabo VPS Alemania)**:
     - Mientras desde IP colombiana `elasticprd.rues.org.co` responde `200 OK` en ~180ms, desde la IP del VPS en Alemania (`13.140.149.144`) el balanceador `awselb/2.0` de Confecámaras devuelve `403 Forbidden`.
     - **Solución (`server/_core/ruesService.ts`)**: Arquitectura HTTP Dual sin Puppeteer que integra como segundo motor directo la API Socrata Oficial del Gobierno de Colombia — Registro Único Empresarial y Social RUES Nacional (`https://www.datos.gov.co/resource/c82u-588k.json`), la cual cubre las **57 Cámaras de Comercio del país (>9.3 millones de registros)** y responde `200 OK` desde el VPS en Alemania en ~150ms–500ms con Razón Social (`TRANSPORTES GONZALEZ DIAZ TG&D SAS`), NIT y DV (`900.788.832-8`), Matrícula (`2517719`), Estado y Año Renovado (`Activa (Renovada 2026)`), Tipo Societario (`Sociedad por Acciones Simplificada (S.A.S.)`), CIIU (`4923 — Transporte de carga por carretera`) y **Representante Legal Principal** (`Sandra Milena Diaz Mondragon — C.C. 46.375.136`).
  4. **Detección Automática de NITs de 9 Dígitos (`8xx`/`9xx`) y Claridad en Procuraduría SIRI (`identityVerificationService.ts`)**:
     - `extractAllCedulasForVerification` reconoce NITs con o sin puntos/DV y clasifica automáticamente números de 9 dígitos iniciados en `8` o `9` como `nit`.
     - Cuando RUES confirma la existencia activa de una sociedad y Procuraduría SIRI indica que el NIT no registra antecedentes en SIRI, se reporta con precisión jurídica: `"Sin sanciones ni inhabilidades contractuales registradas en el sistema SIRI de la Procuraduría."`.
  5. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 287/287 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.19`) y `package.json` (`33.19.0`).

## 🔖 VERSIÓN ANTERIOR: v33.18 — Octubre 2026

### Novedades v33.18 (Conector Directo HTTP RUES / Confecámaras — 0 Puppeteer, Representante Legal Principal vs. Suplentes y Doctrina NIT vs. Persona Natural):
- **Diagnóstico Forense y Solicitud Doctrinal de Eduardo A. Rivera**:
  1. **Diagnóstico del bloqueo `[working...]` en sesión previa del IDE**: Se identificó en los logs del sistema (`transcript.jsonl` y `crash_300135_dc7206bf-4401-4d97-9fdb-41047fe9d450.log`) que un script previo de Puppeteer (`scripts/test_rues_flow.ts`) quedó esperando selectores en la SPA de RUES detrás de CloudFront y posteriormente el proceso `agentapi` del IDE sufrió un crash tras `grep_search`, dejando el indicador visual congelado en `[working...]`.
  2. **Ingeniería Inversa de la API REST Oficial de RUES — Cero Puppeteer (`server/_core/ruesService.ts`)**:
     - Descubrimiento e implementación del protocolo criptográfico de los microfrontends de RUES (`https://elasticprd.rues.org.co`): cifrado OpenSSL `EVP_BytesToKey` (`Salted__` + AES-256-CBC + MD5 con passphrase oficial de aplicación) enviando `{ dataBody: "<base64>" }` con cabeceras `Origin: https://www.rues.org.co`, `Referer: https://www.rues.org.co/` y `app-name: RuesFront`.
     - Peticiones HTTP directas (`fetch` nativo Node + `crypto`) en **~180ms** sin navegadores headless ni consumo de RAM a los 4 endpoints oficiales:
       * `POST /api/ConsultasRUES/BusquedaAvanzadaRM` (búsqueda por NIT, Razón Social o Matrícula).
       * `POST /api/Expediente/DetalleRM` (CIIU principal/secundarios, estado, organización jurídica y renovación).
       * `POST /api/ConsultarVinculos` (extracción estructurada de representantes legales con nombres, cédulas y tipo de vínculo).
       * `POST /api/ConsultFacultadesXCamYMatricula` (extracto de actas y facultades estatutarias).
  3. **Filtrado de Sociedad Principal y Clasificación Jurídica Representante Legal Principal vs. Suplentes**:
     - `selectPrincipalRuesRecord` prioriza siempre la `"SOCIEDAD ó PERSONA JURIDICA PRINCIPAL"` y matrícula `"ACTIVA"` sobre sucursales, agencias o establecimientos de comercio.
     - `classifyRepresentantesLegales` separa estrictamente al **Representante Legal Principal** (`⭐ Rep. Legal Principal (Plenas Facultades)`) de los **Suplentes y Representantes Judiciales** (`👥 Suplentes / Representación Judicial (Facultades Restringidas)`), incorporando la advertencia legal de que solo el Principal obliga de forma ordinaria a la sociedad mientras los suplentes actúan en ausencia o bajo facultades restringidas.
  4. **Doctrina de Verificación Personas Jurídicas (NIT) vs. Personas Naturales (CC/CE) y Encadenamiento en 1 Paso (`identityVerificationService.ts`, `dmHandler.ts`, `prompts.ts`)**:
     - El reporte corporativo explica con claridad jurídica que las empresas (NIT) no tienen antecedentes penales (Policía) ni afiliación a salud (ADRES), sino control fiscal (Contraloría SIRECI) y disciplinario/contractual (Procuraduría SIRI), mientras que los antecedentes judiciales y de salud recaen sobre el Representante Legal como persona natural.
     - Al consultar cualquier empresa en RUES, JanIA pre-carga automáticamente la Cédula del **Representante Legal Principal** en la sesión del usuario (`setPendingUnconfirmedDoc`), permitiendo que con solo responder `"verificar representante"` o `"sí"` se ejecute de inmediato la verificación completa de antecedentes del firmante.
  5. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 284/284 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.18`) y `package.json` (`33.18.0`).

## 🔖 VERSIÓN ANTERIOR: v33.17 — Octubre 2026

### Novedades v33.17 (JanIA "Gemela Cognitiva de Gemini 4 Argon", Scrapers Oficiales, RUES/NIT, PDFs, Memoria Permanente y Superpoderes Nativos WhatsApp Business):
- **Diagnóstico y Solicitud Doctrinal de Eduardo A. Rivera**:
  1. *"Ejecuta esta orden arquitectónica suprema (Versión v33.17 de JanIA): JanIA 'Gemela Cognitiva de Gemini 4 Argon', reconexión de scrapers oficiales, RUES/NIT, entrega de PDFs, memoria permanente y superpoderes nativos de WhatsApp Business (encuestas, cuestionarios, eventos, contactos y catálogo). Candado inquebrantable de seguridad: prohibido git revert, git reset o alterar el Motor de Matches, códigos #M, mediación 40/20/40 y prioridad de gemini-2.5-flash."*
  2. **Conciencia y Gemela Cognitiva de Gemini 4 Argon (`prompts.ts` y `dmHandler.ts`)**:
     - Fusión de inteligencia, calidez y persuasión ejecutiva sin rigideces.
     - Erradicación definitiva del doble saludo (`¡Buenas tardes, Eduardo! A tu disposición:\n\n¡Hola, Eduardo! A tu disposición.`) tanto en DMs como en entregas de herramientas (`formatPoliteToolDelivery` y `stripLeadingGreetingsAndCourtesies` con soporte de dos puntos `:`).
  3. **Superpoderes Nativos de WhatsApp Business (`whatsapp-match.ts` y `dmHandler.ts`)**:
     - Encuestas interactivas de 1 clic (`sendNativeWhatsAppPoll`) con límite de selección para trámites y filtros.
     - Tarjetas de contacto interactivas vCard (`sendNativeWhatsAppContact`) para JanIA y Bróker Oficial (+57 316 656 9719).
     - Eventos estructurados (`sendNativeWhatsAppEvent`) para agendamiento de visitas inmobiliarias con respaldo en texto.
     - Despacho y entrega de catálogo y portafolio de servicios inmobiliarios.
  4. **Reconexión de Scrapers Oficiales y Consulta Empresarial RUES / DIAN (`identityVerificationService.ts`)**:
     - Reconexión con resiliencia de ADRES BDUA, Policía Nacional (con bypass 2Captcha), Procuraduría SIRI y Contraloría SIRECI.
     - Implementación de `calculateDianDv` con el algoritmo matemático oficial de la DIAN (Módulo 11 con pesos primos inversos).
     - Función `queryEmpresaOrNit` para consulta de personas jurídicas por NIT o razón social, integrando datos de Cámara de Comercio y antecedentes institucionales.
  5. **Despacho y Entrega de Documentos PDF (`dmHandler.ts`)**:
     - Desacoplamiento de buffers PDF mediante `setLatestDmPdf` y `popLatestDmPdf`, permitiendo el envío nativo del archivo PDF (Factura Predial Bogotá, Certificados de Pago y Paz y Salvo IDU) como documento adjunto en WhatsApp y en Web.
  6. **Memoria Permanente Inteligente y Dossier de Contacto (`sessionManager.ts`)**:
     - Eliminación de la caducidad a medianoche y de la ventana de 72 horas: memoria conversacional permanente que conserva los últimos 20 turnos con fecha y hora `[YYYY-MM-DD HH:mm]`.
     - Creación de `getContactPermanentDossier(userId)` que consulta en base de datos las ofertas y requerimientos previos del usuario e inyecta la ficha histórica en el prompt de JanIA.
  7. **Moderación de Grupos Oficiales (`whatsapp-match.ts`)**:
     - Eliminación inmediata de mensajes fuera de temática en Grupo 1 (Inmuebles), Grupo 2 (Legal/Avalúos) y Grupo 3 (Proyecto VECY) con re-direccionamiento cordial hacia el grupo correspondiente y su enlace de invitación.
  8. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 279/279 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 15.34s (Vite) + 161ms (esbuild) ✅
- `shared/const.ts` (`v33.17`) y `package.json` (`33.17.0`).

## 🔖 VERSIÓN ANTERIOR: v33.16 — Octubre 2026

### Novedades v33.16 (Reforma Arquitectónica LLM Puro, Matches M-Code y Memoria 72h):
- **Diagnóstico y Solicitud Doctrinal de Eduardo A. Rivera**:
  1. *"Ejecuta esta orden arquitectónica al pie de la letra (Versión v33.16 de JanIA). Regla estricta de ingeniería: Está prohibido crear nuevas expresiones regulares (Regex), condicionales if/else de palabras sueltas o textos estáticos enlatados. Debes eliminar las camisas de fuerza para que Gemini opere con su inteligencia natural, historial y Function Calling (`JANIA_DM_TOOLS`)."*
  2. **Erradicación Total de Interceptores Pre-LLM en DMs (`whatsapp-match.ts` y `dmHandler.ts`)**: Eliminación completa de regexes mutiladores y respuestas prefabricadas enlatadas (costos, quiénes somos, cómo funciona, minutas/notaría, despedidas estáticas, preguntas genéricas). Todo mensaje conversacional en DMs viaja a `invokeLLM` con historial completo y herramientas de function calling.
  3. **Regla del Saludo Único y Respuestas Orgánicas**: Saludo horario indivisible solo en el primer turno (`¡Buenos días / Buenas tardes / Buenas noches, [Nombre]! 👋`), suprimiendo saludos repetidos en turnos subsiguientes mediante historial de sesión y preservando la autonomía natural del modelo.
  4. **Protección de Datos en Matches para Usuarios Externos (`adminMatchAssistantService.ts`)**:
     - **Para Directores/Admin (Eduardo y Jani)**: Fichas técnicas completas con datos de contacto, teléfonos y enlaces de WhatsApp sin ofuscar.
     - **Para Inmobiliarias/Corredores Externos**: Código único del match (ej. `#M15649`), especificaciones del inmueble y datos del contacto ofuscados, canalizando la mediación y acuerdo de corretaje 40/20/40 a través del bróker oficial de Eduardo: **`+57 316 656 9719`**.
  5. **Ampliación de Memoria Deslizante a 72 Horas (`sessionManager.ts`)**: Sustitución del corte a medianoche por una ventana continua de 72 horas (`72 * 60 * 60 * 1000`) y hasta 20 turnos, permitiendo retomar conversaciones del fin de semana con contexto intacto.
  6. **Priorización de Gemini 2.5 Flash y Aceleración de Fallover (`llm.ts`)**: Modelo principal `gemini-2.5-flash` con pool gratuito de 4 claves API; failover rápido ante errores 400/404 sin demoras artificiales en entorno de test (`isTestEnvironment()`).
  7. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 272/272 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 15.28s (Vite) + 157ms (esbuild) ✅
- `shared/const.ts` (`v33.16`) y `package.json` (`33.16.0`).

## 🔖 VERSIÓN ANTERIOR: v33.15 — Octubre 2026

### Novedades v33.15 (Doctrina de Servicio Incondicional, Libertad Total del Usuario, Cero Frenos en DMs y Respuestas Cortas):
- **Diagnóstico y Solicitud Doctrinal de Eduardo A. Rivera**:
  1. *"JanIA debe hablar decentemente como toda una IA bien educada y profesional, pero elimina cualquier orden que le diga que debe obligar a los usuarios a hablar o escribir como ella y ser decentes, los usuarios son humanos y libres, JanIA está y estará siempre a nuestro servicio como cualquier otra IA o LLM de lenguaje generativo y no debe frenarse por nada, su temática y comportamiento debe ser libre de acción e interacción sin estar condicionada a responder como queremos, pero sí en aceptar sugerencias para que sus mensajes no sean tan extensos sino más bien cortos pero claros."*
  2. **Erradicación del Filtro Bloqueante `isExplicitJanIaCall` (`whatsapp-match.ts`)**: Eliminada la restricción que exigía que mensajes de Eduardo o directores empezaran por "hola", "jania", "ayuda" o "?". JanIA ahora atiende y responde ante CUALQUIER mensaje, consulta, número, signo, punto o palabra en DMs.
  3. **Presencia Inmediata Universal**: Emisión de stanzas de `composing` (escribiendo...) para todos los chats privados sin excepción, garantizando visibilidad de los puntitos `...`.
  4. **Afirmaciones Naturales Directas (`detectTramiteConfirmation` en `identityVerificationService.ts`)**: Reconocimiento de "adelante", "si por fa", "dale", "procede", "hazlo", "por favor", "ok", "listo" para ejecutar inmediatamente consultas de antecedentes o trámites en espera sin bucles ni repreguntas.
  5. **Respuestas Compactas y Cero Sermones (`dmHandler.ts` & `prompts.ts`)**: Erradicación de la fricción pedagógica y de las parrafadas kilométricas ante datos en frío. Mensajes breves (máximo 1 a 2 párrafos cortos), respetuosos y claros que nunca provocan el botón 'Leer más'.
- `shared/const.ts` (`v33.15`) y `package.json` (`33.15.0`).

## 🔖 VERSIÓN ANTERIOR: v33.14 — Octubre 2026

### Novedades v33.12 (Unificación de Memoria Turno 1/2, Reporte Compacto Oficial, Filtro Anti-Publicidad Meta y PDFs Comerciales):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Principal Engineer de VECY BIENES RAÍCES. Resuelve de raíz el bucle conversacional en DMs donde JanIA recibe un número o dato en frío (Turno 1) y cuando el usuario confirma en el segundo turno ('CC', '1', 'cédula', 'antecedentes', etc.), JanIA volvía a preguntar el trámite en lugar de ejecutar la consulta."*
  2. *"REPORTE COMPACTO ÚNICO Y LIMPIO: Asegúrate de que el resultado de `verifySingleDocumentInternal` y `executeIdentityVerificationFromWhatsApp` devuelva SIEMPRE el formato compacto unificado (con ADRES al final y sin bloques numéricos largos) para evitar el botón 'Leer más'."*
  3. **Unificación de Memoria Turno 1/2 y Cero Bucles**: Detección cognitiva de confirmaciones naturales en `detectTramiteConfirmation` ("CC", "1", "cédula", "antecedentes", "predial", "idu", "NIT", "pasaporte", "CE") con intercepción al inicio de DMs, suprimiendo saludos repetidos y ejecutando la consulta inmediatamente.
  4. **Reporte Compacto Único Oficial**: Encabezado institucional -> Habeas Data -> Datos de Identidad -> Antecedentes Oficiales (Policía, Procuraduría, Contraloría, ADRES BDUA al final). Erradicados los bloques numéricos largos `1️⃣`, `2️⃣`, `3️⃣`.
  5. **Filtro Anti-Publicidad / Spam (Caso Caro Rodríguez)**: Bloqueo inmediato con 🚫 y cero persistencia en BD para ofertas de campañas en Meta/Facebook/Instagram, pauta digital, agencias de marketing, embudos o venta de software/cursos no inmobiliarios.
  6. **Lectura de Documentos PDF Comerciales (Caso Juan Alberto Duque)**: Protección de ofertas y requerimientos compartidos en PDF (ej. "ESTOY BUSCANDO BODEGA EN COTA.pdf") para evitar descartes por texto hueco o comentarios cortos, garantizando su extracción y guardado en BD.
  7. **Ventana Estricta de 15 Días (Cero 45 Días Residuales)**: Confinamiento estricto a 15 días en consultas de base de datos, purgas automáticas y cruces ad-hoc, erradicando fallbacks de 30 o 45 días.
  8. **Desacoplamiento de PDF en DMs y Adaptación NIT**: `setLatestDmPdf` y `popLatestDmPdf` garantizan retornos primitivos puros en DMs y despacho directo del archivo PDF oficial (Predial/IDU) en WhatsApp. Reporte adaptativo oficial para NIT (personas jurídicas).
  9. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 255/255 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio (Vite 17.73s + esbuild 209ms) ✅
- `shared/const.ts` (`v33.12`) y `package.json` (`33.12.0`).

## 🔖 VERSIÓN ANTERIOR: v33.11 — Octubre 2026

### Novedades v33.11 (Visión Universal, Autonomía Multimodal en DMs y Robustez contra Caídas):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead AI Architect y Principal Engineer de VECY BIENES RAÍCES. Ejecuta la actualización definitiva a la versión `v33.11` (`33.11.0`) en el backend de JanIA, manteniendo el blindaje estricto de $0 COP en pruebas (`NODE_ENV=test`), integrando la Agenda Familiar Universal y robusteciendo el motor multimodal contra caídas."*
  2. **Visión Universal y Autonomía Multimodal en DMs**: Eliminación de bloqueos por ausencia de texto (`body.trim()`). Soporte completo de `DmMediaOptions` (`imageBuffer`, `pdfBuffer`, `pdfMimeType`, `isAudio`, `flyerVisionData`). Cualquier mensaje multimedia (foto familiar, meme, flyer comercial, audio o PDF) es procesado de forma nativa.
  3. **Agenda Familiar Universal y Círculo de Confianza**: Intercepción prioritaria en el paso 0 para los 17 miembros de `TRUSTED_FAMILY_AND_FRIENDS` (como el tío Luis, madre Carmenza, Daniel/Pollotote, Natalia/Natillita, etc.) respondiendo de inmediato con cariño y el número de bróker de Eduardo (`+57 316 656 9719`), incluso si solo envían una foto o meme sin texto.
  4. **Robustez y Resiliencia Multimodal 24/7**: Creación de `extractFlyerVisionSafely` con timeout de 8.000 ms, cascada jerárquica de modelos estables de Gemini y envoltorio a prueba de caídas de red que garantiza que el bot de WhatsApp y el servidor VPS nunca colapsen por errores no controlados.
  5. **Escudo Defensivo Anti-Cobranzas/Spam y Saludos Visuales**: Despiste corporativo inmediato ante intentos de cobro coactivo o fraude recibidos con o sin imágenes; saludo horario y presentación corporativa orientando a servicios inmobiliarios ante fotos ambientales de usuarios externos.
  6. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 246/246 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 18.41s (Vite) + 109ms (esbuild) ✅
- `shared/const.ts` (`v33.11`) y `package.json` (`33.11.0`).

## 🔖 VERSIÓN ANTERIOR: v33.10 — Octubre 2026

### Novedades v33.10 (Agenda Familiar Blindada, Natillita, Cero Confusión Cognitiva y Escudo Defensivo Anti-Cobranzas/Spam):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"No te confíes de estos prompts, revisa a profundidad cada cambio que hemos hecho y si detectas errores por favor corrige y alinea todo correctamente para que nuestra IA PURA no falle y actúe como es debido."*
  2. *"Ejecuta la actualización `v33.10` (`33.10.0`) integrando la Agenda Familiar y de Confianza corregida (Adiós 'Minitas', bienvenida 'Natillita'), asegurando que la IA mantenga un comportamiento impecable y enfocado estrictamente en bienes raíces."*
  3. **Agenda Familiar Corregida y Mensajes Personalizados (`trustedContacts.ts`)**: Exportación de `TRUSTED_FAMILY_AND_FRIENDS` con `customMessage` personalizado, amoroso y exacto para cada uno de los 17 contactos clave de Eduardo (Madre Carmenza, tíos Olanda, Tulita, Marina, Luis; hijos Daniel/Pollotote y Natalia/Natillita/Mi Natis; esposa Jani; primos Monik, Lili, Marcelita, Cayaco, Jaton; y amigos Gus, Lucho, Chalo y Jonathan). Erradicación total de cualquier confusión en apodos.
  4. **Alineación de Prompts e Interceptores en DMs (`dmHandler.ts`)**: Erradicado el conflicto cognitivo en el que mensajes cotidianos o de segundo turno de familiares caían en el embudo comercial, minutas notariales o solicitud de Google Reviews. JanIA responde a los familiares con afecto y cercanía natural, confirmando recados para Eduardo a su línea de bróker (`+57 316 656 9719`), respondiendo a agradecimientos y bendiciones con cariño, y canalizando consultas inmobiliarias formales sin pedir reviews.
  5. **Escudo Defensivo Anti-Cobranzas / Spam**: Refuerzo de detección ante despachos jurídicos de cobro, mandamientos de pago, prejurídicos, embargos y búsquedas de Eduardo con fines financieros, manteniendo la respuesta corporativa neutral y de despiste.
  6. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 240/240 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio (Vite 12.98s + esbuild 80ms) ✅
- `shared/const.ts` (`v33.10`) y `package.json` (`33.10.0`).

## 🔖 VERSIÓN ANTERIOR: v33.08 — Octubre 2026

### Novedades v33.08 (Agenda de Confianza, Círculo Familiar y Escudo Defensivo Anti-Cobranzas/Spam):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead AI Architect y Principal Engineer de VECY BIENES RAÍCES. Aplica en el backend de JanIA (`v33.08` / `33.8.0`) la Agenda de Confianza, el Círculo Familiar y el Escudo Defensivo Anti-Cobranzas/Spam manteniendo el blindaje estricto de $0 COP en pruebas (`NODE_ENV=test`)."*
  2. **Agenda de Confianza y Círculo Familiar**: Mapeo telefónico (+57, 10 dígitos y LIDs) para Madre Carmenza (`3108643555`), Tía Olanda (`3138524917`), Tía Tulita (`3124794864`), Tía Marina (`3204997575`), Tío Luis (`3132094918`), Hijo Daniel/Pollotote (`3006067089`), Hija Natalia/Mi Natis (`3058788329`), Jani Alves (`3188096811` / `3166569719`), Primos (Monik, Lili, Marcelita, Cayaco, Jaton) y Amigos (Gus, Lucho, Chalo broma Escobar/Gacha, Jonathan Martínez proceso Datacrédito).
  3. **Regla de Oro Familiar/Amigos**: Saludo con apodo de cariño, canal oficial de JanIA como IA, número directo bróker de Eduardo (`+57 316 656 9719` / `https://wa.me/573166569719`) para cumpleaños o temas personales, y opción de dejar recados con confirmación inmediata.
  4. **Escudo Defensivo Anti-Cobranzas / Spam**: Bloqueo absoluto de entrega de datos de Eduardo ante casas de cobranza, bancos hostiles, cobro coactivo, embargos o spam financiero; respuesta con postura corporativa neutral y despiste estricto.
  5. **Integración Conversacional**: Inyección en `dmHandler.ts` (paso 0 defensivo, paso 1 familiar, exclusión de Google Reviews y embudo comercial a familiares) y en interceptor de `whatsapp-match.ts`.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 240/240 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 19.53s ✅
- `shared/const.ts` (`v33.08`) y `package.json` (`33.8.0`).

## 🔖 VERSIÓN ANTERIOR: v33.07 — Octubre 2026

### Novedades v33.07 (Eliminación de Redundancia en Saludos y Compactación Máxima en DMs — Cero "Leer más"):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead AI Architect de VECY BIENES RAÍCES. Corrige de raíz el bug de redundancia en los saludos de WhatsApp en `server/_core/jania/handlers/dmHandler.ts` aplicando esta regla estricta:*
  2. *ELIMINAR DUPLICACIÓN DE SALUDOS: En `processPrivateDmConversationalMessage` (y en `sanitizeDmOrthographyAndGreeting`), asegúrate de que cuando JanIA salude por primera vez en el día, use una única estructura limpia e indivisible: `¡Buenas días, Jani! 👋` (o tardes/noches según la hora en Bogotá). Prohibido concatenar frases redundantes como 'Qué gusto saludarte. Qué gusto saludarte en este nuevo día'. El saludo debe ser una sola frase corta, cálida y elegante, seguida inmediatamente de la respuesta de fondo.*
  3. *COMPACTACIÓN MÁXIMA EN DMs (CERO 'LEER MÁS'): Limita los bloques de texto en DMs a máximo 2 párrafos cortos. Si JanIA debe nombrar los grupos o servicios, hazlo con enlaces limpios y sin párrafos descriptivos gigantes que fuercen el botón 'Leer más'.*
  4. *Valida con `npm run check`, `npm test` ($0 COP) y `npm run build`."*
- **Acciones Técnicas Ejecutadas**:
  - `server/_core/jania/handlers/dmHandler.ts`: Creación y exportación de `stripLeadingGreetingsAndCourtesies` para despojar cualquier preámbulo repetitivo o concatenación de frases redundantes ("Qué gusto saludarte. Qué gusto saludarte en este nuevo día"). Refactorización de `sanitizeDmOrthographyAndGreeting` para aplicar la estructura indivisible `¡${timeSalutation}, [Nombre]! 👋` y garantizar continuidad directa sin saludo cuando `hasPriorHistory: true`.
  - Compactación en fast-paths de `dmHandler.ts`: menús de consultas (`isConsultasInquiry`), costos (`isCostInquiry`) y cómo hacerlo (`isHowToDoInquiry`) reestructurados en un máximo de 2 párrafos concisos con viñetas directas.
  - `server/_core/politenessService.ts`: `formatDetailedCompanyAndSocialMediaPresentation` condensado a 2 párrafos cortos con enlaces limpios y enlace directo de Google Reviews, erradicando textos extensos que activen "Leer más".
  - Inyección en el prompt de Gemini en `dmHandler.ts` de la regla doctrinal estricta de compactación máxima para evitar párrafos extensos en pantallas de celular.
  - `server/__tests__/regression.test.ts`: Creación de la **SUITE 69** con 5 pruebas unitarias automatizadas aprobadas.
- **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 234/234 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 23.97s ✅
- `shared/const.ts` (`v33.07`) y `package.json` (`33.7.0`).

## 🔖 VERSIÓN ANTERIOR: v33.06 — Octubre 2026

### Novedades v33.06 (Núcleo Cognitivo Argon, Caché Compacta, 6ª Herramienta de Captura en DM, Copy Ganador Google Reviews 15s y Candado Anti-Alucinación SINUPOT):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead AI Architect y Principal Engineer de VECY BIENES RAÍCES. Partiendo del commit actual v33.05 (33.5.0), ejecuta la actualización v33.06 (33.6.0) aplicando exclusivamente estos 5 ajustes faltantes sin romper lo ya construido y manteniendo el blindaje estricto de $0 COP en pruebas (NODE_ENV=test)."*
  2. **Ajuste 1: Núcleo Cognitivo Argon y Portafolio Completo (`prompts.ts`)**: Se exportó `JANIA_ARGON_COGNITIVE_CORE` e inyectó en `buildSystemPrompt()`, `dmHandler.ts`, `consultingHandler.ts` y `circuloHandler.ts` con CoT en 3 pasos, directivas de estilo con anclas visuales y conclusión líder, y portafolio de *Vecy Agenda Pro* y *Fábrica Proptech* (+57 316 656 9719).
  3. **Ajuste 2: Caché Compacta y Confirmación Flexible (`identityVerificationService.ts`)**: Unificación del formato compacto oficial en caché (sin secciones numeradas antiguas) y soporte de confirmación de intención con lenguaje natural ("sí", "claro", "verificar", "antecedentes", etc.) retornando `{ isConfirmation: true, tipoDoc: 'cc' }`.
  4. **Ajuste 3: 6ª Herramienta en DM y Flexibilidad de Fast-Paths (`dmHandler.ts`)**: Declaración y ejecución de `registrar_inmueble_o_requerimiento` en `JANIA_DM_TOOLS`, e inducción de `isShortQuery` (`<= 12` palabras) para que consultas compuestas pasen directamente al razonamiento del LLM Argon.
  5. **Ajuste 4: Copy Ganador Google Reviews 15 Segundos en Burbuja Aparte (`politenessService.ts`, `whatsapp-match.ts`)**: `buildWinningGoogleReviewMessage` con cálculo dinámico de franja horaria en Bogotá y alternancia inteligente de deseos finales; despacho en burbuja aparte tras la entrega del servicio con control estricto de 24h en `recentReviewPromptUsers`.
  6. **Ajuste 5: Candado Anti-Alucinación SINUPOT (`cronService.ts`)**: Erradicación de cualquier promesa de extracción de fichas urbanísticas por PDF/CHIP, canalizando a los usuarios hacia las 4 herramientas activas en tiempo real de JanIA.
  7. **Validación Exhaustiva**: `npm run check` (0 errores) ✅ | `npm test` 229/229 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 28.35s ✅
- `shared/const.ts` (`v33.06`) y `package.json` (`33.6.0`).

## 🔖 VERSIÓN ANTERIOR: v33.05 — Octubre 2026

### Novedades v33.05 (Refactorización Quirúrgica Backend JanIA: Embudo de Recepción Unificado, Urbanidad de Carreño, Filtro Anti-Iniciales, Candado Jurídico, Plantilla Reviews 15s y Alineación Doctrinal):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Principal Engineer de VECY BIENES RAÍCES. Ejecuta una refactorización quirúrgica sobre el backend de JanIA siguiendo 6 reglas estrictas sin romper ninguna importación existente."*
  2. Unificar embudo de recepción y Urbanidad de Carreño en DMs (`whatsapp-match.ts` y `dmHandler.ts`): No ejecutar en frío sin sesión activa en `whatsapp-match.ts`. En `dmHandler.ts`, unificar la recepción de CHIP, número suelto, documento con sigla o nombre+número con `setPendingUnconfirmedDoc`, saludo horario Bogotá, pregunta cálida y concisa de trámite + confirmación de CC, CE, PA, NIT, y aviso legal de Hábeas Data Capa 3 (Ley 1581/12).
  3. Filtro anti-iniciales en nombres (`whatsapp-utils.ts` y `parsers.ts`): Si el nombre tiene `<= 3` caracteres y no está en listas comunes o carece de vocales, retornar `""` para vocativo neutro. En `dmHandler.ts`, si el usuario saluda explícitamente, responder SIEMPRE incluyendo el saludo horario (`¡Buenos días / Buenas tardes / Buenas noches!`), incluso con `hasPriorHistory: true`.
  4. Candado al embudo jurídico (`commercialFunnelService.ts`): Prohibido activar bloque "Marco Normativo / Alerta de Riesgo Patrimonial" si el mensaje tiene `< 5` palabras o trata sobre verificación de documentos, predial o IDU.
  5. Plantilla unificada de Google Reviews de 15 segundos (`dmHandler.ts` y `politenessService.ts`): URL oficial `https://g.page/r/CctNbwU6UpX5EBM/review` con copy de 15 segundos y 100% GRATUITO.
  6. Alineación doctrinal con `conocimiento_vecy.md`: Trato directivo sin mutilar apellidos de fundadores ("Eduardo Rivera" y "Jani Alves"), erradicación de `35/35/15/15` adoptando modelo `40/20/40` en contacto directo y `40/10+10/40` en portal web, emojis v23.0 (`👍` Oferta Venta, `👌` Oferta Arriendo, `🔀` Oferta Permuta, `📝` Demanda Venta, `✏️` Demanda Arriendo, `🔄` Demanda Permuta), y memoria conversacional de círculo (`getCirculoHistory` / `appendCirculoHistory`).
  7. Validación: `npm run check` (0 errores) ✅ | `npm test` 222/222 passing (100% verde a $0 COP sin claves de pago) ✅ | `npm run build` limpio en 18.95s ✅
- `shared/const.ts` (`v33.05`) y `package.json` (`33.5.0`).

## 🔖 VERSIÓN ANTERIOR: v33.04 — Octubre 2026

### Novedades v33.04 (Restauración Cognitiva Pura, Base Doctrinal de VECY BIENES RAÍCES y Sombreros Expertos de JanIA):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead AI Architect y Principal Engineer de VECY BIENES RAÍCES.*
  2. *OBJETIVO CRÍTICO (v33.04): RESTAURACIÓN COGNITIVA PURA, BASE DOCTRINAL DE VECY BIENES RAÍCES Y SOMBREROS EXPERTOS DE JanIA.*
  3. Ahorro extremo de cuota: directo a los archivos especificados, cero lecturas globales.
  4. Preservación estricta de `matching.ts` sin modificaciones.
  5. Respuestas dinámicas con Function Calling / Tools en JSON asumidas por Gemini.
  6. Preservación obligatoria de Google Opiniones (`https://g.page/r/CUxVzG_vecy/review`) en reportes de cortesía para externos en `dmHandler.ts`.
  7. Creación del Dossier Doctrinal Local: `server/_core/jania/prompts/conocimiento_vecy.md` con los 4 capítulos institucionales de VECY BIENES RAÍCES.
  8. Carga de conocimiento y Protocolo de Urbanidad de Carreño en `prompts.ts`: inyección del dossier y fricción pedagógica ante datos en frío.
  9. Integración de 6 sombreros expertos (Abogada Contractual Senior, Liquidadora Notarial y Tributaria, Mentora Comercial, Perita Avaluadora, Embajadora Proptech, Conectora Comercial 40/20/40) y herramientas de consulta (identidad, IDU, predial, liquidación notarial y sondeo de mercado comparativo con Metrocuadrado, FincaRaíz y CienCuadras).
  10. Verificación integral de tipado, tests 100% en verde ($0 COP), build y auto-despliegue a Contabo.
- **Acciones Técnicas Ejecutadas**:
  - `server/_core/jania/prompts/conocimiento_vecy.md`: Dossier Institucional y Portafolio de Soluciones oficial cargado en memoria a $0 COP.
  - `server/_core/jania/prompts.ts`: `getVecyInstitutionalKnowledge()`, `PROTOCOLO_URBANIDAD_CARRENO_PROMPT`, y su inyección en `buildSystemPrompt`.
  - `server/_core/valuation.ts`: `executeMarketValuationSurvey` con homologación ACM, portales comparables (Metrocuadrado, FincaRaíz, CienCuadras) y Política de Cero Alucinación.
  - `server/_core/jania/handlers/dmHandler.ts`: Catálogo `JANIA_DM_TOOLS`, `executeJaniaDmTool`, `synthesizeToolResponseWithGemini`, e inyección de los 6 roles expertos de JanIA.
  - `server/__tests__/regression.test.ts`: SUITE 65 agregada con 6 pruebas automatizadas aprobadas.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 217/217 tests passing ✅ | `npm run build` limpio en 16.04s ✅
- `shared/const.ts` (`v33.04`) y `package.json` (`33.4.0`).

## 🔖 VERSIÓN ANTERIOR: v33.03 — Octubre 2026

### Novedades v33.03 (Calibración Quirúrgica en un Solo Pase: Ortografía Estricta, Trato VIP Directivo, Google Opiniones, Scrapers Resilientes y Match 40/20/40):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Lead Architect y Auditor Senior de Vecy Network.*
  2. *OBJETIVO CRÍTICO DE CIERRE TOTAL (v33.03): CALIBRACIÓN QUIRÚRGICA EN UN SOLO PASE.*
  3. Ortografía estricta en español (signos `¡`, `¿`, mayúscula inicial por frase y primer nombre de pila ej. 'Jani', no 'Jani Alves') y Trato VIP Directivo a Jani (+573192919978 / +573166569719 o su número) y Eduardo ('¡Hola, Jani! Qué gusto saludarte.' / '¡Hola, Eduardo! A tu disposición.') con supresión de captación externa.
  4. Restauración obligatoria de Google Opiniones (`https://g.page/r/CUxVzG_vecy/review`) tras reportes de cortesía en `formatPoliteToolDelivery` y erradicación definitiva de cualquier texto de aportes/donaciones.
  5. Auditoría y resiliencia en scrapers: ADRES BDUA reporta explícitamente intermitencia con enlace a `adres.gov.co` sin enmascarar como 'sin novedad' ante timeout/falla de red; IDU Valorización eleva timeout a 45000 ms y entrega mensaje limpio ante congestión con CHIP y portal oficial distrital sin trazas de Puppeteer.
  6. Motor de Match: Fallback automático a 45 días y score ≥ 50% ante falta de match ≥ 80% en 15 días, con formato de viñetas aproximadas, anonimización total en canal público y cierre incondicional de Alianza 40/20/40 sobre el 3% hacia Jani y Eduardo.
  7. Despliegue inmediato al VPS Contabo con `npm run deploy:vps` y verificación de PM2 online.
- **Acciones Técnicas Ejecutadas**:
  - `server/_core/jania/handlers/dmHandler.ts`: Lista blanca VIP (+573192919978, +573188096811, +573166569719, LIDs), `sanitizeDmOrthographyAndGreeting`, `formatPoliteToolDelivery` con Google Opiniones.
  - `server/_core/identityVerificationService.ts`: Diferenciación estricta de fallas en ADRES BDUA reportando intermitencia hacia `adres.gov.co`.
  - `server/_core/iduValorizacionService.ts`: Timeout de 45.000 ms y manejo limpio de congestión sin trazas de Puppeteer.
  - `server/_core/matchAdHocService.ts`: Cascada de 15 a 45 días (score ≥ 50%), listado con Radicado y propuesta 40/20/40 garantizada.
  - `server/__tests__/regression.test.ts`: Suite 64 ampliada a 8 tests passing al 100%.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 211/211 tests passing ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.03`) y `package.json` (`33.3.0`).

## 🔖 VERSIÓN ANTERIOR: v33.02 — Octubre 2026

### Novedades v33.02 (Gobernanza Inmutable, Parser Doctrinal de Demandas y Motor de Coincidencias Dual: Admin vs Colega Externo 40/20/40):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Actúa como Arquitecto de Software Senior y Líder Técnico de Vecy Network.*
  2. *OBJETIVO: GOBERNANZA INMUTABLE, PARSER DOCTRINAL DE DEMANDAS Y MOTOR DE COINCIDENCIAS DUAL (ADMIN VS COLEGA EXTERNO 40/20/40) (v33.02)*
  3. Las 5 Directivas Mandatorias de Gobernanza consagradas en `GEMINI.md` y `AGENTS.md`.
  4. Parser doctrinal de demandas en `demandParserService.ts` interpretando notación MM ($320 MM, $650–670 MM, $1.000 MM en EFECTIVO), cuadrantes de Bogotá (Cll 100 a 140, entre Auto Norte y Cra 7, Cll 45 a 80 arriba de Caracas), barrios emblemáticos y confort.
  5. Motor de matching dual ad-hoc en `matchAdHocService.ts` (ventana 15 días):
     - Canal Admin: datos completos, teléfono de WhatsApp para gestión directa + fallback a ID más cercano si score < 75%.
     - Canal Colegas Externos / Público: anonimización total anti-bypassing + Gancho Comercial de Cierre Alianza 40/20/40 sobre el 3% de comisión con Eduardo A. Rivera y Jani Alves (+57 316 656 9719).
  6. Caja de Match Rápido en `AdminMatches.tsx` con textarea en bruto, botón de cruce 15 días, toggle admin/público y botón de copiado de ficha para WhatsApp.
- **Acciones Técnicas Ejecutadas**:
  - `GEMINI.md` y `.agents/AGENTS.md`: Registro en la cúspide de las 5 Directivas Mandatorias de Gobernanza.
  - `server/_core/demandParserService.ts`: Módulo de extracción determinista con soporte de notación MM, cuadrantes Bogotá y características físicas.
  - `server/_core/matchAdHocService.ts`: Motor de cruce ad-hoc dual con ventana de 15 días y plantilla 40/20/40 anti-bypassing.
  - `server/routers/matching.ts` y `server/routers.ts`: Procedimiento tRPC `matching.quickMatchAdHoc`.
  - `client/src/components/admin/AdminMatches.tsx`: Componente "⚡ Match Rápido / Pegar Requerimiento (v33.02)" con selector de canal, tarjetas enriquecidas y copiado de ficha WhatsApp.
  - `server/__tests__/regression.test.ts`: Suite 63 con 6 pruebas automatizadas aprobadas.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 203/203 tests passing (100% verde a $0 COP) ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.02`) y `package.json` (`33.2.0`).

## 🔖 VERSIÓN ANTERIOR: v33.01 — Octubre 2026

### Novedades v33.01 (Inyección del Embudo Comercial y Persuasión Ejecutiva en JanIA: Autoridad Legal, Alerta Patrimonial y Cierre Hacia la Línea Oficial de Bróker):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Inyección del embudo comercial y persuasión ejecutiva en `consultingHandler.ts`, `dmHandler.ts` y `prompts.ts` para que JanIA actúe con máxima autoridad jurídica y comercial.
  2. Matriz de Servicios: Autoservicio Gratuito de cortesía y Consultas de Alto Valor (comisiones adeudadas, contratos, impuestos, estudios de títulos).
  3. Estructura persuasiva de 3 pasos (Diagnóstico normativo, Alerta de riesgo patrimonial y Cierre hacia Eduardo A. Rivera y Jani Alves en línea oficial +57 316 656 9719).
- **Acciones Técnicas Ejecutadas**: `server/_core/commercialFunnelService.ts`, calibración de handlers de consultoría y DMs, Suite 62 y pipelines de despliegue.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 197/197 tests passing ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v33.01`) y `package.json` (`33.1.0`).

### Novedades v33.00 (Configuración de Seguridad y Blindaje de Claves Gemini: Producción vs Tests, Nivel 1 Gratis, Nivel 2 Pago Emergencia, Retorno Automático y Regla Doctrinal de Versionamiento .99 -> .00):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"Mantener la API de pago activa para la operación 24/7 de WhatsApp como respaldo de emergencia, pero BLOQUEARLA ESTRICTAMENTE en cualquier entorno de pruebas (npm test) para evitar consumos de desarrollo."*
  2. *"Las versiones están mal deben llegar a al .99 y cambiar ala siguiente: Ejemplo 31.99 + implementación => 32.00"*
  3. Blindaje Inmutable en Pruebas: Excluir/anular `GEMINI_PAID_KEY`, usar exclusivamente pool de claves gratuitas (`GEMINI_FREE_KEYS`), y lanzar excepción local si algún test intenta invocar la clave de pago.
  4. Gestor en Producción: Nivel 1 (Prioridad 100% Gratuita en Round-Robin activo), Nivel 2 (Respaldo de Emergencia de Pago ante 429 simultáneo en las 4 gratuitas), y Retorno Automático a Nivel 1 tan pronto expira el cooldown de 60s.
  5. Documentación en `.env.example` con `GEMINI_FREE_KEYS` y `GEMINI_PAID_KEY`.
- **Acciones Técnicas Ejecutadas**:
  - `server/_core/geminiKeyManager.ts`: Creación del gestor central con detección inmutable de pruebas (`isTestEnvironment`), aislamiento de claves gratuitas (`getFreeKeys`), veto estricto de pago (`getPaidKey`), barrera local (`assertKeyAllowedForExecution`), cooldowns individuales y retorno automático.
  - `server/__tests__/setupTests.ts` & `vitest.config.ts`: Configuración global de pruebas anulando `GEMINI_PAID_KEY` e instalando interceptor Axios de red contra peticiones con clave de pago.
  - `server/_core/llm.ts`, `jania/vision.ts`, `voiceTranscription.ts`: Conectados al gestor central con protección estricta.
  - `.env.example` & `.env`: Documentación y estructuración de `GEMINI_FREE_KEYS` y `GEMINI_PAID_KEY` preservando retrocompatibilidad total.
  - `server/__tests__/regression.test.ts`: Suite 61 ampliada a 5 tests, cubriendo el blindaje y la regla doctrinal de versionamiento (`.99` -> `.00`).
  - Consagración de la Regla Doctrinal de Versionamiento: `v32.99` + implementación salta a `v33.00` (`33.0.0`), quedando prohibido `.100`.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 191/191 tests passing ✅ | `npm run build` limpio en 20.92s ✅
- `shared/const.ts` (`v33.00`) y `package.json` (`33.0.0`).

## 🔖 VERSIÓN ANTERIOR: v32.99 — Octubre 2026

### Novedades v32.99 (Protocolo de Urbanidad de Carreño, Confirmación Didáctica, Pipeline Fail-Fast y Guía Oficial Paz y Salvo IDU):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. No disparar inmediatamente verificaciones de identidad ante números sueltos si el usuario no ha saludado o indicado el tipo de documento.
  2. Protocolo de Urbanidad: En Turno 1, saludar con vocativo horario (`Buenos días/tardes/noches`), nombre respetado resuelto, y consultar pedagógicamente el tipo de documento (CC, CE, Pasaporte, NIT) guardando el número en memoria de sesión sin botones rígidos.
  3. Turno 2: Ante confirmación afirmativa, entregar el reporte de inmediato sin repetir saludos horarios.
  4. Erradicación total en copias de asistencia de cualquier mención a "fotitos de la cédula por ambas caras", solicitando únicamente nombre y número para registro estándar de portería y control de acceso.
  5. Pipeline Fail-Fast: 1° ADRES (BDUA), 2° Procuraduría (SIRI), 3° Contraloría (SIRECI), 4° Policía Nacional (PONAL). En CC, abortar antes de consumir saldo de 2Captcha si no existe en censo civil (ADRES/PGN).
  6. Reporte en 4 sectores claramente discriminados con cláusula obligatoria de Hábeas Data (Ley 1581 de 2012 y Decreto 1377 de 2013).
  7. Guía pedagógica oficial de Paz y Salvo IDU con enlace en línea y canal de contingencia del chat de Valorización con horario distrital oficial.
- **Acciones Técnicas Ejecutadas**:
  - `identityVerificationService.ts`: Implementación de sesiones temporales de números sueltos (`PendingUnconfirmedDocSession`), confirmación pedagógica de tipo de documento (`detectDocTypeConfirmation`), integración de Contraloría General (`queryContraloria`), estrategia Fail-Fast para ahorro del 100% de captchas en CCs inexistentes, reporte de 4 sectores y cláusula de Hábeas Data.
  - `jania/handlers/dmHandler.ts`: Intercepción en 2 turnos con urbanidad de Carreño y erradicación definitiva de copies de "fotitos de la cédula".
  - `iduValorizacionService.ts`: Enriquecimiento de detección (`isIduInquiry`), formateador de guía de asistencia (`formatIduAssistanceGuide`) y alias `executeIduValorizacionFromWhatsApp`.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 186/186 tests passing ✅ | `npm run build` limpio en 23.91s ✅
- `shared/const.ts` (`v32.99`) y `package.json` (`32.99.0`).

## 🔖 VERSIÓN ANTERIOR: v32.98 — Octubre 2026

### Novedades v32.98 (Refactorización Modular Quirúrgica de JanIA — Cero Regresiones y Arquitectura Limpia):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Refactorizar el archivo monolítico `janIA.ts` (7,144 líneas) en una estructura modular y organizada bajo `server/_core/jania/`.
  2. Cumplimiento estricto de las 3 reglas de ejecución:
     - Evitar a toda costa dependencias circulares: los submódulos importan directamente de sus pares (`../types`, `../parsers`, etc.), nunca desde `index.ts` ni `janIA.ts`.
     - Singletons estrictos en memoria para mapas y cachés (`fallbackDataCache`, `promptCache`, `dmConversationHistory`, `GREETED_TODAY`, etc.).
     - Verificación rigurosa de tipado (`npm run check`) paso a paso certificando cero errores.
- **Arquitectura Modular Creada (`server/_core/jania/`)**:
  - `types.ts`: Tipos, interfaces y esquemas de validación Zod (`JanIAResult`, `janiaResultSchema`, `FlyerVisionResult`, `DmTurn`, `ConsultingTurn`).
  - `parsers.ts`: Parsers especializados de precios/moneda COP (`parseColombianPriceOrBudget`), extracción de fallback determinista (`fallbackDataCache`), resolución de teléfonos y nombres, completitud de datos y emojis, traductores de negocio/tipo.
  - `heuristics.ts`: Detección de spam/basura (`esMensajeSpamOBasura`), horario laboral (`isOutsideWorkingHours`), división de publicaciones multi-item (`splitMultiItemMessage`), scraper con bypass.
  - `vision.ts`: Extracción multimodal de flyers mediante cascada Gemini (`extractFlyerVision`).
  - `prompts.ts`: Generadores de system prompts (`buildSystemPrompt`), `promptCache` singleton, copys institucionales, hooks de reputación y mensajes de bienvenida.
  - `sessionManager.ts`: Gestión de sesiones (`pendingSessions`), estado de silenciado, control de saludos diarios (`GREETED_TODAY`), historiales conversacionales de DMs y consultoría con persistencia en PostgreSQL nativo, estadísticas en vivo con caché de 5 minutos.
  - `handlers/consultingHandler.ts`: Manejador de Grupo 2 (Soporte legal, tributario y avalúos inmobiliarios).
  - `handlers/circuloHandler.ts`: Manejador de Grupo 3 (Proyecto VECY / Comunidad y debate técnico).
  - `handlers/dmHandler.ts`: Manejador de DMs privados con IA Pura (cortesía, verificación de documentos, prediales, gastos notariales, consultas y estocada de calificación).
  - `handlers/propertiesHandler.ts`: Manejador de Grupo 1 (Ofertas y demandas de inmuebles, guardado en BD, deduplicación, motor de matching instantáneo y directorio de asesores).
  - `index.ts`: Punto de exportación centralizado limpio.
  - `server/_core/janIA.ts`: Fachada retrocompatible de 24 líneas que re-exporta `./jania/index`, preservando el 100% de los consumidores y scripts existentes sin romper una sola línea de código en todo el ecosistema.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 182/182 tests passing ✅ | `npm run build` limpio (frontend Vite + backend esbuild 66ms) ✅
- `shared/const.ts` (`v32.98`) y `package.json` (`32.98.0`).

## 🔖 VERSIÓN ANTERIOR: v32.97 — Octubre 2026

### Novedades v32.97 (Auditoría Integral de Servicios Activos 24/7, Presentación Institucional y Estocada de Reseñas en Conversaciones Amenas):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. *"hola mi hermano revisa que jania tenga activos todos sus servicios, que no olvide si es una conversación amena o alguien pregunta sobre nosotros que jania le cuente muy bien y detalladamente todo, que lo invite a seguirnos en nuestras redes y al final la estocada con lo de la opinión y comentarios."*
- **Auditoría Técnica de Servicios de JanIA**:
  - Se auditó la matriz completa de servicios:
    1. Verificación Oficial de Documentos y Antecedentes (Policía Nacional, Procuraduría SIRI, ADRES BDUA) → 100% GRATIS y activo 24/7.
    2. Factura Predial Bogotá y Certificados de Pago en PDF oficial con código de barras → 100% GRATIS y activo 24/7.
    3. Paz y Salvo Notarial IDU de Valorización en PDF oficial ($0 COP) → 100% Activo 24/7.
    4. Liquidación Notarial y de Registro con desglose tributario exacto → 100% Activo 24/7.
    5. Motor de Coincidencias Cruzadas Inteligentes de Oferta ↔ Demanda (JanIA Match v20.0) → 100% Activo 24/7.
    6. Asistente Exclusivo de Matches para Administradores en WhatsApp y Web → 100% Activo 24/7.
    7. Protocolo de Urbanidad de Carreño y Solicitud de Reseñas en Google Reviews → 100% Activo 24/7.
    8. Red Colaborativa de Corretaje 50/50 y Asesoría con Bróker (+57 316 656 9719) → 100% Activo 24/7.
- **Acciones Técnicas Ejecutadas**:
  - En `server/_core/politenessService.ts`:
    - Incorporación de `formatDetailedCompanyAndSocialMediaPresentation(userName)`: presentación cálida y detallada de la compañía fundada en 2018, los directores Eduardo A. Rivera y Jani Alves, el fin de los dinosaurios inmobiliarios, el catálogo de servicios 100% activos 24/7, enlaces directos a todas las redes oficiales (Instagram, TikTok, Facebook, YouTube, LinkedIn, Canal Oficial de WhatsApp) y "la estocada final": solicitud persuasiva y elegante de calificación y opinión de 5 estrellas en Google Reviews (`https://g.page/r/CctNbwU6UpX5EBM/review`).
    - Detección precisa con `isCompanyInquiryOrAboutUs(text)` para consultas sobre quiénes somos, la historia de Vecy, fundadores y redes sociales.
  - En `server/_core/janIA.ts`:
    - Fast-path interceptor en DMs privados que entrega de inmediato la presentación detallada.
    - System Prompt enriquecido para el modelo generativo (Gemini) instruyendo que ante charlas amenas o preguntas sobre la empresa detalle todo con orgullo, invite a las redes y aplique la estocada final de Google Reviews.
  - En `server/_core/prompts/base.md`:
    - Consagración doctrinal de los canales oficiales, redes sociales y protocolo de conversación amena en el prompt base de JanIA.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 182/182 tests passing ✅ | `npm run build` limpio en 33.65s ✅
- `shared/const.ts` (`v32.97`) y `package.json` (`32.97.0`).

## 🔖 VERSIÓN ANTERIOR: v32.96 — Octubre 2026

### Novedades v32.96 (Protocolo de Urbanidad de Carreño y Persuasión Emocional de Calificación):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Eduardo destacó que JanIA debe dar ejemplo de modales a pesar de ser una IA pura de libre albedrío, aplicando normas de cortesía ("Urbanidad de Carreño") ante usuarios maleducados o silenciosos.
  2. Si el usuario agradece o se despide cortésmente, JanIA responde de inmediato con el mensaje de calificación personalizado.
  3. Si el usuario no agradece ni saluda tras recibir la consulta gratuita, JanIA espera 1 minuto (60s) y le escribe con diplomacia: *"🤝 ¡Ha sido un placer poder ayudarte {{nombre}}!, espero que nuestro servicio te haya sido de gran ayuda y como sabes este es un servicio completamente GRATUITO. ¿Podrías ayudarnos a seguir manteniéndolo así?"*.
  4. Si el usuario responde SÍ, le agradece y entrega el enlace directo (`https://g.page/r/CctNbwU6UpX5EBM/review`) garantizando que no toma más de 15 segundos.
  5. Si el usuario responde NO, JanIA responde con asombro 😲, desilusión cómica y lágrimas de IA 🥺💔😭, pero persuadiéndolo de dejar 5 estrellas ⭐⭐⭐⭐⭐ en Google.
- **Acciones Técnicas Ejecutadas**:
  - Creación del servicio `politenessService.ts` con todos los formateadores y evaluadores de consentimiento afirmativo/negativo normalizados contra acentos.
  - Temporizadores de 60 segundos (`userPolitenessTimers`) y mapa de espera de consentimiento (`userAwaitingReviewConsent`) en `whatsapp-match.ts`.
  - Cancelación limpia si el usuario escribe antes del minuto e intercepción inteligente de respuestas.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 181/181 tests passing ✅ | `npm run build` limpio en 29.42s ✅
- `shared/const.ts` (`v32.96`) y `package.json` (`32.96.0`).

## 🔖 VERSIÓN ANTERIOR: v32.95 — Octubre 2026

### Novedades v32.95 (Auditoría de Reseñas de Google en Consultas Gratuitas Múltiples y Fallback/Orientación de Cédula de Extranjería CE):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Eduardo compartió captura de pantalla real de WhatsApp donde el usuario `+57 310 2134698` (~Alberto Méndez) realizó 3 consultas seguidas enviando únicamente números (`Consultar 79249255`, `Verificar CC 79249755`, etc.) y JanIA nunca le despachó el mensaje de reseña en Google.
  2. Eduardo cuestionó:
     - *"Listo, Jania ho hizo tres consultas a este usuario y no le envió al final el mensaje de calificación y comentario para poder seguir ofreciendo el servicio gratuito, ¿¿Qué pasó?? Por qué??."*
     - *"También veo que la gente pasa solo el número, entonces dime que ubiese pasado si es una CE y no una CC, JanIA lo detecta y le explica o cómo actúa??"*
- **Acciones Técnicas Ejecutadas**:
  1. **Disparador Desacoplado de Calificación por Consultas Gratuitas Acumuladas**:
     - En `server/_core/whatsapp-match.ts`: Se implementó `userFreeToolConsultationsCount: Map<string, number>` y `maybeTriggerFreeServiceReviewPrompt(senderId, userName)`.
     - Cada vez que un usuario consulta cédulas o prediales exitosamente, se incrementa su contador.
     - A partir de la segunda consulta (o si el usuario no califica tras varias consultas), JanIA despacha de forma desacoplada y elegante tras 2.5 segundos el mensaje oficial de Google Reviews:
       `⭐ ¿Podrías darnos tu opinión y calificar nuestro servicio? Así nos ayudas para que siga siendo *GRATIS.*`
       `👉 https://g.page/r/CctNbwU6UpX5EBM/review 👍 Gracias`
     - Y tras 2.5 minutos, programa la invitación a los grupos de WhatsApp de VECY Network.
  2. **Fallback Inteligente y Detección Automática de Cédula de Extranjería (CE)**:
     - En `server/_core/identityVerificationService.ts`: Si un usuario envía un documento numérico sin prefijo (4-8 dígitos) que no aparece como CC, JanIA ejecuta un **fallback automático e invisible consultando como C.E.** ante la Procuraduría (SIRI tipo 5) y ADRES (BDUA tipo CE).
     - Si aparece como CE, actualiza el tipo, formatea el reporte bajo `Cédula de Extranjería (C.E.)` e incluye la aclaración: `📌 Identificamos que este documento corresponde a una Cédula de Extranjería (C.E.).`
     - Si no aparece en ninguna base oficial, en la orientación de verificación se incluye la guía didáctica para que el usuario conozca cómo consultar Cédula de Extranjería (`Verificar CE [número]`) o Pasaporte.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 180/180 tests passing ✅ | `npm run build` limpio en 19.59s ✅
- `shared/const.ts` (`v32.95`) y `package.json` (`32.95.0`).

## 🔖 VERSIÓN ANTERIOR: v32.94 — Octubre 2026

### Novedades v32.94 (Diagnóstico Sincero e Inmediato de Matches en 15 Días para Administradores — Cero Falsas Expectativas):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Eduardo aportó evidencia fotográfica y textual de WhatsApp donde Jani A. S. envió un requerimiento de compra por $1.000 MM en efectivo (150-170 m², 3 alcobas, 1-2 parqueaderos, depósito, seguridad 24/7, admin máx $1.300.000, zonas Calle 45 a 116: San Patricio, Chicó Navarra y Rosales) y JanIA respondió con una falsa expectativa de espera ("¡Excelente requerimiento, Jani! Ya mismo lo capturo, analizo y cruzo... te estaré avisando al instante"), sin entregar los resultados en el acto.
  2. Eduardo instruyó categóricamente:
     - *"Tal vez no me entendiste. La idea es que cualquiera de nosotros los administradores podamos pasar una OFERTA o una DEMANDA... y que en los últimos 15 días ella busque en base de datos. Si no hay nada con el 80% que diga que no hay en los últimos 15 días pero que ya quedó en el radar. Cero mentiras."*
     - *"JanIA debe ser sincera y decir si lo encontró en el momento o no y listo pero responder de inmediato y no decir mentiras y dejar esperando el usuario con falsas expectativas. Ok."*
- **Acciones Técnicas Ejecutadas**:
  1. **Reconocimiento Infalible de Administradores por Nombre y Teléfono**:
     - En `server/_core/adminMatchAssistantService.ts`: `isAuthorizedAdminPhone` ahora valida tanto teléfonos oficiales y LIDs como nombres de perfil de WhatsApp (`userName` con "Jani", "Eduardo", "Vecy", "Bróker"), asegurando atención exclusiva de administrador sin importar el LID dinámico asignado por WhatsApp.
  2. **Detección Flexible de Demandas y Ofertas**:
     - `isMatchSearchQuery` ahora detecta publicaciones y requerimientos detallados con señales como `requerimiento de compra`, `cliente directo`, `buscamos`, `necesitan`, `recursos hasta`, `presupuesto`, etc.
  3. **Blindaje contra Falsas Búsquedas por ID**:
     - Textos largos (> 50 chars) con especificaciones físicas se procesan como búsquedas semánticas y no colisionan con nomenclatura como "KR 7".
  4. **Soporte Multi-Zona en Demandas**:
     - Se pasan los sectores detectados (`extractedBarrios`) como 5º argumento a `explicarMatch`, evaluando polígonos completos sin bloqueos indebidos de barrio.
  5. **Filtro de 15 Días y Verdad Inmediata**:
     - JanIA audita los inmuebles activos captados o republicados en los últimos 15 días (`propAgeDays <= 15`).
     - Si no hay coincidencias con score >= 80%, JanIA es **100% sincera de inmediato**: confirma los parámetros interpretados, informa que tras escanear los inmuebles de los últimos 15 días ninguno cumple el 80% de afinidad, certifica que la demanda quedó guardada en el radar activo de VECY y entrega el enlace a la Mesa de Coincidencias.
     - Si hay coincidencias, las entrega al instante con score %, detalles, contacto y enlace directo a WhatsApp.
  6. **Failsafe Interceptor en DM y Prompt Blindado**:
     - En `server/_core/janIA.ts`: Interceptor directo antes de invocar a Gemini en DMs y regla doctrinal en el prompt prohibiendo respuestas dilatorias ("te estaré avisando luego").
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 179/179 tests passing ✅ | `npm run build` limpio en 19.33s ✅
- `shared/const.ts` (`v32.94`) y `package.json` (`32.94.0`).

## 🔖 VERSIÓN ANTERIOR: v32.93 — Octubre 2026

### Novedades v32.93 (Asistente Inteligente de Búsqueda de Matches con JanIA en WhatsApp y Web Exclusivo para Administradores):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. Eduardo solicitó habilitar una funcionalidad operativa de alto impacto:
     - *"Quiero que JanIA nos ayude en la búsqueda de MATCHES por su chat en whatsapp o en la web pero solo a los adminiostradores. Por ejemplo: Le pasamos un requerimiento y que ella nos encuentre el/los inmueble/s compatible/s o viceversa, le pasamos la OFERTA y nos envía la DEMANDA/s precisas/s, con datos de teléfono y todos o simplemente nos da el número de MATCH y vamos a buscarlo a la mesa de coincidencias como mejor se le fascilite."*
  2. **Acciones Técnicas Ejecutadas**:
     - **Servicio Central `adminMatchAssistantService.ts`**:
       • Filtro de seguridad exclusivo para administradores: verifica teléfonos oficiales de Eduardo Rivera (`573192919978`, LID `225954035179724`), Jani Alves (`573188096811`, LIDs `167108705018103`, `182781141344345`, `218820279050385`), Línea Bróker (`573166569719`) y sesiones con rol `admin` en la web.
       • Bloqueo y protección de datos para terceros no autorizados bajo Ley 1581 de 2012 (Hábeas Data).
       • Detección flexible de consultas: por ID de Match (`#M123`, `match 123`), por ID de Inmueble (`#P456`, `inmueble 456`), por ID de Requerimiento (`#R789`, `demanda 789`), o por texto libre de Oferta/Demanda calculando scores en tiempo real con `explicarMatch`.
       • Formateo de respuesta ejecutiva: Score %, ID de Match `#M...`, datos del inmueble/demanda, contacto completo, enlace directo a WhatsApp (`https://wa.me/...`) y enlace de gestión en la Mesa de Coincidencias (`/admin`).
     - **Integración con WhatsApp Socket (Baileys)** en `server/_core/whatsapp-match.ts`:
       • Interceptor en DMs (`isMatchSearchQuery`) que atiende a administradores 24/7 y resguarda datos ante terceros.
     - **Integración con Web y tRPC** en `server/routers/janIA.ts`:
       • Procedimiento `adminMatchSearch` protegido por rol admin y soporte en el chat de JanIA.
     - **Mesa de Coincidencias con Asistente "JanIA Match Finder"** en `client/src/components/admin/AdminMatches.tsx`:
       • Panel interactivo con sugerencias rápidas, búsqueda asistida, visualización de afinidad, enlaces directos a WhatsApp y botón para filtrar y gestionar de inmediato en la Mesa de Coincidencias.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 179/179 tests passing ✅ | `npm run build` limpio en 20.34s ✅
- `shared/const.ts` (`v32.93`) y `package.json` (`32.93.0`).

## 🔖 VERSIÓN ANTERIOR: v32.92 — Octubre 2026

### Novedades v32.92 (Diseño Senior Simétrico, Icono Dinosaurio Doctrinal y Supresión de Cards Envolventes):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Diseño Senior Simétrico y Medidas Armónicas**:
     - Eduardo instruyó: *"NECESITO QUE ACTÚES COMO EL MEJOR DISEÑADOR SENIOR Y CORRIJAS EL DISEÑO DEJÁNDOLO SIMÉTRICO, ACORDE AL TEMA, CON MEDIDAS Y ESPACIOS CORRECTOS, ALGO ATRACTIVO COMO LO TIENEN ALGUNAS SECCIONES QUE DISEÑASTE ANTERIORMENTE, NO PONGAS CALAVERAS, MEJOR UN DINOSAURIO EN LA PARTE ROJA DE LOS DINOSAURIOS, ELIMINA LAS CARDS QUE CONTENGAN SUBTÍTULOS. TE PONGO COMO EJEMPLO ALGUNAS DE LAS MEJORES SECCIONES PARA QUE EN BASE AELLAS DISEÑES EL RESTO DEL SITIO: (IMAGENES 1, 2, 3 Y 4)"*
  2. **Acciones Técnicas Ejecutadas**:
     - **Unificación Tipográfica y Espacial Absoluta con Audiowide**:
       • En `client/src/index.css`: `--font-heading: "Audiowide"` y `--font-display: "Audiowide"`. Clases `.vecy-title-hero`, `.vecy-title-section` y `.page-header-gold` unificadas.
       • Todos los Heroes del portal (`Properties`, `RequirementsMarketplace`, `Services`, `NuestraHistoria`, `RedColaboracion`, `Contact`, `Investors`, `Blog`, `Login`, `Admin`, `JanIAConsole`, `TerminosCondiciones`, `PoliticaPrivacidad`) estandarizados con el mismo padding superior (`pt-36`), tag con línea dorada, título en dos líneas con `font-['Audiowide']` y subtítulo libre sobre el fondo oscuro.
     - **Erradicación de Calaveras y Consagración del Dinosaurio (`GiDinosaurRex`)**:
       • En `client/src/pages/NuestraHistoria.tsx`: Eliminado todo rastro de `Skull`. Incorporado `GiDinosaurRex` en el badge rojo `EL FIN DE LOS PORTALES INMOBILIARIOS COMO LOS CONOCEMOS HASTA HOY` y en la tarjeta roja `LOS DINOSAURIOS INMOBILIARIOS`.
       • Títulos doctrinales exactos: `LOS DINOSAURIOS INMOBILIARIOS` y `VECY LA EVOLUCIÓN INEVITABLE`.
     - **Erradicación de Macro-Cards Envolventes de Subtítulos**:
       • En `client/src/pages/Services.tsx`: Desempaquetada la sección `#match-ia-section`, dejando el encabezado libre sobre el fondo, organizando los 4 pilares en cards simétricas independientes y ubicando la consola interactiva centrada con botones de acceso directo.
       • En `client/src/pages/Home.tsx`: Acceso directo mediante el botón estelar `CÓMO FUNCIONA EL MATCH` en el Hero.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 178/178 tests passing ✅ | `npm run build` limpio en 22.77s ✅
- `shared/const.ts` (`v32.92`) y `package.json` (`32.92.0`).

## 🔖 VERSIÓN ANTERIOR: v32.91 — Octubre 2026

### Novedades v32.91 (Restauración de Tipografía Oficial Audiowide en Hero de Vecy Bienes Raíces):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  - Eduardo aclaró: *"No laa letra era la anterior que tenía Vecy Bienes Raíces, esa es la que yo elegí esta que pusiste es la que no me gusta."*
  - Se confirmó que la tipografía distintiva del Hero para **`VECY BIENES RAÍCES`** elegida por Eduardo es **`Audiowide`** (blanco y degradado oro), la cual otorga carácter imponente, vanguardista y cinematográfico a la plataforma.
- **Acciones Ejecutadas**:
  - En `client/src/pages/Home.tsx`: Restituida `font-['Audiowide']` en el `h1` del Hero con tamaños `text-6xl sm:text-7xl md:text-8xl lg:text-9xl` (VECY) y `text-2xl sm:text-3xl md:text-4xl lg:text-5xl` (BIENES RAÍCES en degradado oro).
  - Mantenimiento estricto del resto del diseño: sin cards saturadas, sin badges invasivos, y con el catálogo renombrado a **`INMUEBLES DESTACADOS`**.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 177/177 tests passing ✅ | `npm run build` limpio ✅
- `shared/const.ts` (`v32.91`) y `package.json` (`32.91.0`).

## 🔖 VERSIÓN ANTERIOR: v32.90 — Octubre 2026

### Novedades v32.90 (Desaturación Visual de Home, Erradicación de Cards Anidadas e Inmuebles Destacados):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Desaturación Visual y Erradicación de Cards Dentro de Cards**:
     - Eduardo instruyó tajantemente: *"Mejora el diseño está muy apiñuscado o SATURADO y otra vez volviste a colocar demasiadas cards dentro de cards, no se por qué tienes esa manía y veo que el título de inicio tiene un tipo de letra y tamaño que no tienen las demás páginas ni secciones, haz roto la elegancia e impacto que tenía la página y elimina por favor esa card que contiene esto, eso ya te dije que no me gusta para nada: PRIMER PORTAL INMOBILIARIO CON VERDADERA IA EN COLOMBIA... eLIMINA LA CARD QUE CONTIENE ESTE AVISO TAMBIÉN EL SANTO GRIAL PROPTECH • TECNOLOGÍA PROPIETARIA ÚNICA EN COLOMBIA... Esta sección debe ser para los destacados. Qué es eso de propiedades de Autor eso no lo entiende el público y menos disque 'Portafolio Curado', ni yo entiendo qué putas es eso o de que se trata."*
  2. **Acciones Técnicas Ejecutadas en `client/src/pages/Home.tsx`**:
     - **Erradicación Total de Cards Anidadas**: Se eliminó la sección completa `#match-ia-section` ("EL SANTO GRIAL PROPTECH", sus 4 sub-cards y la card de simulación interactiva), devolviendo la amplitud, respiración visual y minimalismo elegante a la landing principal.
     - **Corrección Tipográfica del Hero**: Se eliminó la fuente intrusiva `Audiowide` en tamaño desmedido (`text-9xl`) y se restituyó la jerarquía armónica oficial con `vecy-title-hero` (`text-white text-5xl ... lg:text-8xl` y `text-gradient-gold text-xl ... lg:text-4xl`).
     - **Limpieza del Hero**: Se retiró el badge invasivo *"PRIMER PORTAL INMOBILIARIO CON VERDADERA IA EN COLOMBIA"*, restaurando el tag sutil `<span className="vecy-accent-tag">Tecnología de Vanguardia</span>`. Se limpió el subtítulo y se dejaron 2 botones principales con amplio espaciado: `EXPLORAR ACTIVOS` y `NUESTRA HISTORIA`.
     - **Reemplazo de Términos Rebuscados por Vocabulario Claro**:
       • *"Propiedades de Autor"* y *"Portafolio Curado"* eliminados por completo.
       • Sección renombrada a **`INMUEBLES DESTACADOS`**, con el tag sutil `Oportunidades Seleccionadas` y botón `VER TODAS LAS PROPIEDADES →`.
     - **Limpieza en Servicios y Prompts**:
       • En `client/src/pages/Services.tsx`: *"Red Colaborativa & Inmuebles de Autor"* → *"Red Colaborativa & Venta de Inmuebles"* y *"SERVICIOS ESTRATÉGICOS Y DE AUTOR"* → *"SERVICIOS ESTRATÉGICOS Y CONSULTORÍA"*.
       • En `server/_core/prompts/base.md`: Sustituido *"Inmuebles de Autor"* por *"propiedades destacadas"*.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 177/177 tests passing ✅ | `npm run build` limpio en 24.92s ✅
- `shared/const.ts` (`v32.90`) y `package.json` (`32.90.0`).

## 🔖 VERSIÓN ANTERIOR: v32.89 — Octubre 2026

### Novedades v32.89 (Misión, Visión 2026-2030, Manifiesto 'El Fin de los Portales Inmobiliarios' y Doctrina de Lenguaje Claro sin Tecnicismos):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Sanitización y Blindaje Legal de Trámites Gratuitos**:
     - Eduardo instruyó reemplazar cualquier mención a entidades policiales o de control y siglas como "KYC" o "SDH" por explicaciones en español claro que no expongan legalmente al proyecto ni confundan a clientes.
     - Nombres definitivos en `Services.tsx` y `base.md`:
       • *Filtro de Seguridad para Visitas a Inmuebles*
       • *Factura Predial y Certificado de Pago en PDF por WhatsApp*
       • *Paz y Salvo del IDU en PDF para Notaría*
       • *Cálculo Rápido de Gastos de Notaría y Escrituras*
  2. **Doctrina Integral en JanIA (Misión, Visión, Objetivos y Valores Agregados)**:
     - En `server/_core/prompts/base.md` se enseñó a JanIA toda la historia de los fundadores, su Misión, Visión 2026-2030, y sus 4 valores agregados.
  3. **Rescate de la Frase Doctrinal de Impacto**:
     - Se consagró en `NuestraHistoria.tsx` y `base.md`:
       `✦ EL FIN DE LOS PORTALES INMOBILIARIOS COMO LOS CONOCEMOS HASTA HOY`.
  4. **Regla Suprema de Lenguaje Sencillo (Doctrina Eduardo A. Rivera)**:
     - Eduardo enfatizó que al 80% de las personas les da temor o desconfianza la IA si se les habla enredado o con palabras técnicas. Se instruyó a JanIA a hablar con calidez, cercanía, sencillez y utilidad inmediata.
     - En `client/src/pages/NuestraHistoria.tsx` se diseñó la sección de Misión, Visión 2026-2030 y Valores Agregados con lenguaje 100% humano, comprensible y sin tecnicismos.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 176/176 tests passing ✅ | `npm run build` limpio en 16.76s ✅
- `shared/const.ts` (`v32.89`) y `package.json` (`32.89.0`).

## 🔖 VERSIÓN ANTERIOR: v32.88 — Octubre 2026

### Novedades v32.88 (Logo Oficial en Login/Admin, Manifiesto Persuasivo de Marketing y Compromiso Verde Tri-Pilar):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Logo Oficial en Inicio de Sesión y Panel Administrativo**:
     - Eduardo reportó: *"Vi que en nuestro modal de inicio de cesión en la página de administración creo, no tiene nuestro logo oficial sino uno común, que es ese descuido."*
     - Causa identificada: En `client/src/pages/Login.tsx` (línea 192) y `client/src/pages/Admin.tsx` (línea 148), se renderizaba un icono genérico de escudo (`<Shield className="..." />`) en lugar de la imagen oficial del logotipo corporativo de la marca.
     - Solución ejecutada: Se sustituyó el escudo por `<img src="/logo-vecy.png" alt="Logo Vecy Bienes Raíces" ... />` con efectos de brillo áurico y escala interactiva en hover, garantizando coherencia absoluta con el branding oficial.
  2. **Doctrina Ambiental y Estética: Compromiso Verde Tri-Pilar en [`NuestraHistoria.tsx`](file:///home/eddu/Proyectos/vecy-network/client/src/pages/NuestraHistoria.tsx)**:
     - Eduardo instruyó estructurar la propuesta de valor y contribución ambiental de Vecy:
       • *Pilar 1: Belleza Estética y Cero Contaminación Visual*: No colocamos letreros, lonas ni carteles en fachadas, balcones ni ventanas, preservando la arquitectura, la dignidad del espacio público y la plusvalía del inmueble.
       • *Pilar 2: Seguridad Patrimonial y Privacidad Familiar*: Un aviso en ventana expone la propiedad ante delincuentes, invasores y extorsionistas; en Vecy comercializamos mediante enlaces discretos cifrados (Stealth Links) y validación preventiva de identidad (KYC ante Policía Nacional).
       • *Pilar 3: Huella Hídrica y Cero Desperdicio de Papel*: Para fabricar 1 tonelada de papel se requieren más de 50.000 litros de agua limpia. Erradicamos el papel implementando firma virtual en promesas de compraventa y contratos legales con CUV y QR (Ley 527 de 1999 y Código de Comercio), cerrando negocios en minutos.
  3. **Manifiesto Persuasivo Comercial de Vecy Bienes Raíces**:
     - Redacción de un copy supremo de marketing y persuasión que sintetiza qué somos, qué hacemos, para dónde vamos, cómo nos vemos en el futuro y por qué somos la evolución inevitable del corretaje inmobiliario en Colombia.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 175/175 tests passing ✅ | `npm run build` limpio en 28.48s ✅
- `shared/const.ts` (`v32.88`) y `package.json` (`32.88.0`).

## 🔖 VERSIÓN ANTERIOR: v32.87 — Octubre 2026

### Novedades v32.87 (Primer Portal Inmobiliario con Verdadera IA en Colombia y Consagración del Motor de MATCH 24/7):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Consagración del Santo Grial del Proyecto (El Motor de Match con IA)**:
     - Eduardo instruyó enfáticamente: *"Bueno ahora le diste auge a todo menos a nuestro sistema más preciado que comenzará a funcionar muy pronto. Nuestro sistema inteligente de busqueda o encuentro de MATCH con IA. No se pero lo estas dejando atrás, yo te nombré fue los servicios normales. Ahonda en que somos el primer portal que usa IA en realidad. Imposible que tu no sepas lo que tenemos en las manos si eres el arquitecto de este proyecto, entonces no sabes de qué se trata??"*
     - Causa identificada: Si bien el motor de matching cruzado bidireccional (`server/_core/matching.ts`) y la escucha activa de WhatsApp (`server/_core/whatsapp-match.ts`) estaban completamente desarrollados en backend, en el frontend público de la Página de Inicio (`Home.tsx`) y en los metadatos principales no se proclamaba con la contundencia debida que **VECY ES EL PRIMER PORTAL EN COLOMBIA CON VERDADERA INTELIGENCIA ARTIFICIAL**. Los portales tradicionales (Metrocuadrado, FincaRaíz, Ciencuadras) operan como clasificados pasivos ("cementerios de inmuebles" donde las publicaciones duermen meses a la espera de que alguien las busque); mientras que Vecy es un **ecosistema activo e inteligente donde JanIA cruza ofertas con requerimientos en tiempo real**.
  2. **Acciones Técnicas Implementadas**:
     - **Página de Inicio (`client/src/pages/Home.tsx`)**:
       • *Hero Section*: Inserción del badge áurico `✦ PRIMER PORTAL INMOBILIARIO CON VERDADERA IA EN COLOMBIA`.
       • Subtítulo estelar: *"Erradicamos los clasificados pasivos. Nuestro motor cognitivo JanIA cruza activamente Ofertas y Demandas en tiempo real: encuentra compradores y propiedades con precisión matemática y jurídica del 85% al 100%."*
       • Badges de métricas: `85% - 100% Umbral de Match` | `10 Variables con IA` | `24/7 Cruce en Tiempo Real` | `100% Ecosistema Digital`.
       • Botones de acción directa: `EXPLORAR ACTIVOS`, `CÓMO FUNCIONA EL MATCH` (scroll suave directo) y `VER DEMANDAS`.
       • *Sección Protagonista Exclusiva (`#match-ia-section`)*: *"EL PRIMER PORTAL QUE USA IA EN REALIDAD: CÓMO FUNCIONA EL MOTOR DE MATCH CRUZADO 24/7"*, desglosando los 4 pilares:
         1. *Ingesta Semántica Multicanal*: Comprensión contextual de lenguaje natural en WhatsApp y web sin formularios rígidos.
         2. *Matriz de Cruce de 10 Variables*: Ponderación matemática estricta sobre 100 puntos.
         3. *Filtros Duros Inquebrantables*: Tolerancia cero en áreas menores o precios desbordados (umbral 85%-100%).
         4. *Notificación Instantánea 24/7*: Alertas directas a captadores y demandantes al momento del match.
       • *Card de Simulación en Vivo (JanIA Match Engine v32)*: Comparador visual en tiempo real de Oferta vs Demanda con barra de compatibilidad al 96% y desglose de puntos.
     - **Metadatos y Schema (`client/index.html`)**:
       • Actualizado el Schema JSON-LD y Open Graph para reflejar: *"El primer portal inmobiliario con Inteligencia Artificial en Colombia. Motor cognitivo JanIA que cruza activamente ofertas con requerimientos en tiempo real (Match 24/7)..."*
     - **Pruebas de Regresión (`server/__tests__/regression.test.ts`)**:
       • Agregadas validaciones automatizadas para garantizar la presencia y consistencia del Motor de Match en `Home.tsx`, `Services.tsx` e `index.html`.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 174/174 tests passing ✅ | `npm run build` limpio en 24.20s ✅
- `shared/const.ts` (`v32.87`) y `package.json` (`32.87.0`).

## 🔖 VERSIÓN ANTERIOR: v32.86 — Octubre 2026

### Novedades v32.86 (Bóveda JanIA Express de Trámites Gratuitos 24/7, Portafolio Integral de Negocio y Protección de Dirección Familiar):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Portafolio Real y Diversificado de Servicios de Vecy Bienes Raíces**:
     - Eduardo detalló el alcance integral de las líneas de negocio de Vecy:
       • Gestión de liquidez patrimonial y créditos de libre inversión respaldados con garantía hipotecaria a través de particulares y fondos privados (sin intermediación bancaria tradicional; con prohibición estricta de mencionar nombres de entidades particulares a terceros).
       • Blindaje jurídico, redacción profesional de contratos, cobro pre-jurídico y recuperación efectiva de comisiones inmobiliarias impagas, resolución de incumplimientos y saneamiento crediticio (Hábeas Data / Ley 2157).
       • Avalúos comerciales y estudios de mercado con Inteligencia Artificial (JanIA) para venta y arriendo en Bogotá y Colombia.
       • Soluciones PropTech: desarrollo de sitios web y tiendas inmobiliarias para agentes, formulario inteligente de agendamiento y reserva con verificación documental (*Vecy Agenda*) y ciberseguridad.
       • Trámites notariales, estudios de títulos de tradición de 20 años, sucesiones, desenglobes y conciliación inmobiliaria.
  2. **Bóveda JanIA Express de Trámites y Certificados 100% Gratuitos ($0 COP en WhatsApp)**:
     - Eduardo instruyó: *"Pon todo lo que le estamos enseñando a JanIA para que ofrezca y gestione esos servicios gratuitos de Verificación de documentos y reportes de antecedentes a los visitantes de propiedades, entrega de factura predial y paz y salvo predial en tiempo record, entrega de paz y salvo de Idu y lo que creas que podemos acabarle de poner a JanIA... etc..."*
     - En `client/src/pages/Services.tsx` se integró la sección estelar *"JANIA EXPRESS: TRÁMITES Y CERTIFICADOS SIN COSTO 24/7"*:
       • 🛡️ *Verificación de Identidad & Antecedentes (KYC)*: Consulta preventiva ante Policía Nacional de visitantes y compradores para blindaje y seguridad de propietarios y agentes.
       • 📄 *Factura Predial & Paz y Salvo Distrital en PDF*: Conexión directa con la Secretaría Distrital de Hacienda de Bogotá mediante código CHIP.
       • 🏛️ *Paz y Salvo de Valorización IDU Bogotá en PDF*: Certificado oficial notarial con PIN de seguridad bajo el Acuerdo Distrital 915.
       • ⚖️ *Simulador Notarial & Liquidación de Escrituración*: Cálculo exacto de derechos notariales, impuesto de registro (beneficencia), retención en la fuente y gastos compartidos (SNR).
     - Se vinculó el socket oficial de Baileys (`+573192919978`) para los trámites automatizados de JanIA y el número de atención bróker (`+573166569719`) para los servicios comerciales de consultoría.
  3. **Blindaje de Privacidad y Retiro de Dirección Residencial Familiar**:
     - Se eliminó la dirección de la calle (`Cra. 14a #118-21`) de `client/index.html` (Schema.org) y `client/src/pages/Contact.tsx`.
     - La presencia se consagró como *Ecosistema 100% Digital con Cobertura Metropolitana en Bogotá D.C. y Sabana Norte*.
  4. **Doctrina JanIA en `server/_core/prompts/base.md`**:
     - Se incorporó la sección oficial *"CATÁLOGO OFICIAL DE SERVICIOS GRATUITOS Y ESPECIALIZADOS DE VECY BIENES RAÍCES (DOCTRINA JANIA)"*, instruyendo a JanIA a promover con calidez y entusiasmo los trámites gratuitos y remitir los casos comerciales al bróker.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 173/173 tests passing ✅ | `npm run build` limpio en 24.70s ✅
- `shared/const.ts` (`v32.86`) y `package.json` (`32.86.0`).

## 🔖 VERSIÓN ANTERIOR: v32.85 — Octubre 2026

### Novedades v32.85 (Infraestructura SEO On-Page, Google Search Console Verification, robots.txt, sitemap.xml Oficial y Schema RealEstateAgent):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Estrategia y Posicionamiento de Marca en Google y Redes Sociales**:
     - Eduardo solicitó: *"Quiero darle posicionamiento a nuestra marca en Google y Redes sociales, me podrías ayudar con eso haciéndolo tu desde acá o mguiándome en el pasoa paso??"*
     - Eduardo proporcionó la etiqueta oficial de verificación de Google Search Console: `<meta name="google-site-verification" content="k2GZoVOfwT26BtxH5lFwOt38KbO4NBHCBM3Lrb4wutE" />`.
  2. **Acciones Técnicas Implementadas**:
     - **Google Search Console**: Inserción de la etiqueta de verificación oficial en el `<head>` de `client/index.html`.
     - **robots.txt**: Creación de `client/public/robots.txt` permitiendo indexación general a robots rastreadores (Googlebot, Bing, Meta), protegiendo rutas privadas (`/admin`, `/api`, `/trpc`) y vinculando el sitemap oficial.
     - **sitemap.xml**: Creación de `client/public/sitemap.xml` con todas las rutas oficiales (`/`, `/ofertas`, `/demandas`, `/jania`, `/terminos-y-condiciones`, `/politica-de-privacidad`) bajo el dominio activo `https://vecy-bienes-raices.vercel.app/`.
     - **SEO On-Page & Redes Sociales en `index.html`**:
       • Corrección de idioma a `<html lang="es">`.
       • Etiqueta canónica `<link rel="canonical" href="https://vecy-bienes-raices.vercel.app/" />` y `<link rel="sitemap" ... />`.
       • Metadatos Open Graph y Twitter Cards actualizados con el nuevo dominio y portada oficial.
       • Schema.org JSON-LD enriquecido con tipos `RealEstateAgent` y `Organization`, geolocalización en Bogotá, teléfono oficial bróker `+573166569719`.
     - **Pruebas de Regresión**: Incorporación de test doctrinal de SEO en `server/__tests__/regression.test.ts`.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 172/172 tests passing ✅ | `npm run build` limpio en 29.93s ✅
- `shared/const.ts` (`v32.85`) y `package.json` (`32.85.0`).

## 🔖 VERSIÓN ANTERIOR: v32.84 — Octubre 2026

### Novedades v32.84 (Consagración del Nuevo Dominio Oficial `https://vecy-bienes-raices.vercel.app/`, Redirección Permanente 308 en Vercel, Autorización en Supabase y Blindaje de Infraestructura):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Factibilidad y Transición de Dominio**:
     - Eduardo preguntó: *"Agente, ¿Qué tan fáctible y fácil ves cambiar nuestro actual dominio de vercel: https://vecy-network.vercel.app/ po este: https://vecy-bienes-raices.vercel.app/ y si lo ves factible ya que tenemos un proyecto tan pero tan avanzado que tan fácil o dificil lo ves y si no se daña nada dame los pasos."*
     - Eduardo consultó además si debía cambiar nombres de proyecto en Vercel, Supabase, VPS o repositorios.
  2. **Decisión Doctrinal de Arquitectura**:
     - **Dominio Público vs Nombres de Infraestructura**: Se consagró la regla de oro: la identidad pública de cara al usuario y los buscadores se unifica bajo `https://vecy-bienes-raices.vercel.app/` (coherente con la marca oficial Vecy Bienes Raíces S.A.S. y redes `@vecybienesraices`), mientras que los nombres técnicos internos (`vecy-network` en GitHub, Vercel, VPS PM2 y base de datos PostgreSQL) se mantienen intactos para preservar webhooks de CI/CD, despliegues automáticos y scripts de demonios sin riesgo de caídas.
  3. **Acciones Implementadas**:
     - **Vercel**: Se asoció `vecy-bienes-raices.vercel.app` al entorno de producción con validación DNS/SSL inmediata. Se configuró `vecy-network.vercel.app` con **308 Permanent Redirect** hacia `vecy-bienes-raices.vercel.app`, garantizando que ningún enlace previo compartido en WhatsApp o correo se rompa.
     - **Supabase**: Se inscribió `https://vecy-bienes-raices.vercel.app` como *Site URL* y `https://vecy-bienes-raices.vercel.app/**` en *Redirect URLs* autorizadas para Google OAuth y autenticación de usuarios.
     - **Código del Proyecto**: Se actualizó la constante única de verdad `VECY_ACTIVE_DOMAIN = "https://vecy-bienes-raices.vercel.app"` en `shared/const.ts`. Se actualizaron todas las URLs de WhatsApp, chat de JanIA, reportes de cruces de matches, verificador notarial de contratos con CUV, correos transaccionales y cron diarios en `server/_core/` y `supabase/functions/`.
     - **Pruebas de Regresión**: Se agregó test unitario de la Doctrina de Dominio v32.84 en `server/__tests__/regression.test.ts`.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 171/171 tests passing ✅ | `npm run build` limpio en 18.00s ✅
- `shared/const.ts` (`v32.84`) y `package.json` (`32.84.0`).

## 🔖 VERSIÓN ANTERIOR: v32.83 — Octubre 2026

### Novedades v32.83 (Encuadre Simétrico y Padding en Cards de Demandas y Botón Dorado Protagonista en CTA de Requerimientos):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Encuadre y Padding en Cards de Demandas (Requerimientos)**:
     - Eduardo señaló: *"Quédo descuadrado el botón en cada card de cada requerimiento y el botón de abajo el que dice: 'PUBLICAR MI REQUERIMIENTO', creo que debería ir en dorado. No lo sé tu eres el experto en diseño, así que dime, o si en otro color, no lo sé tu eres el que sabe más del tema de diseño."*
     - Causa identificada: Al estandarizar `.vecy-card-apple`, se había omitido el padding perimetral en la vista de `RequirementsMarketplace.tsx`, haciendo que el contenido colisionara con las paredes y que el botón *"TENGO EL INMUEBLE MATCH"* se desbordara de borde a borde abajo como una barra cortada y desalineada.
     - Solución: Se asignó `className="vecy-card-apple p-6 sm:p-7 flex flex-col justify-between h-full group hover:glow-gold transition-all duration-500 border-primary/20"` y `ScrollReveal` con `className="h-full"`. El botón inferior cuenta con su propio contenedor superior con divisor tenue, padding simétrico, bordes redondeados `rounded-xl` y sombra áurica, alineándose perfectamente en la misma línea base en todo el grid.
  2. **CTA Principal Dorado (`btn-gold`) en "PUBLICAR MI REQUERIMIENTO"**:
     - Eduardo sugirió acertadamente cambiar el botón de abajo a dorado. En diseño UI, los Call-to-Action (CTA) de conversión máxima en fondos oscuros deben ser dorados sólidos para orientar inmediatamente la vista del usuario.
     - Se transformó el botón de `btn-gold-outline` a `btn-gold` con aura luminosa (`shadow-[0_0_35px_rgba(191,149,63,0.35)]`), icono `PlusCircle` y texto de alto contraste negro sobre dorado.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 170/170 tests passing ✅ | `npm run build` limpio en 26.24s ✅
- `shared/const.ts` (`v32.83`) y `package.json` (`32.83.0`).

## 🔖 VERSIÓN ANTERIOR: v32.82 — Octubre 2026

### Novedades v32.82 (Restauración de Metadatos Jurídicos Libres, Simetría Absoluta en Home con PropertyCard, Paginación Inteligente y Optimización Responsive Universal):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Restauración de Datos Notariales sin Contenedor de Card (Imagen 1)**:
     - Eduardo aclaró: *"Pero cometiste un error era borrar las cards no la info que tenía adentro, es que vi que elimminaste también los datos de: Instrumentyo Jurídico, código único de validación, etc, o crees que eso no debería llevarlo ??, no entiendo por qué eliminaste todos esos datos, repito solo era la card y dejar allí los datos"*.
     - Se restauraron íntegros los 4 metadatos esenciales en `TerminosCondiciones.tsx` y `PoliticaPrivacidad.tsx`: *Instrumento Jurídico*, *Marco Legal Aplicable*, *Código Único de Validación (CUV)* y *Huella Digital (SHA-256)*, mostrándolos de forma fluida, elegante y libre sin cajas secundarias ni recuadros alrededor del logo.
  2. **Estandarización de Cards en Página de Inicio (Home — Imagen 2)**:
     - Eduardo indicó: *"También quiero que corrijas las cards de la página de inicio mejor las dejes con el mismo estilo de la tienda de Ofertas pues cómo las dejaste se ven muy raras y descuadradas"*.
     - Se reemplazó el bloque personalizado anterior por el componente canónico `<PropertyCard />` de la tienda de Ofertas. Ahora "PROPIEDADES DE AUTOR" exhibe fotos horizontales 4:3 con swipe, badges dorados/esmeralda, precios en COP, métricas físicas y doble botón táctil (`AGENDAR` + `VER DETALLES`).
  3. **Paginación Dinámica y Selector de Inmuebles en Ofertas y Demandas**:
     - Eduardo instruyó: *"y también quiero que en las páginas de OFERTAS y DEMANDAS se puedan mostrar o elegir mostrar ciertos números de inmuebles por página y no todos al tiempo. Ok"*.
     - Se implementó selector ergonómico de cantidad por página (`6, 9, 12, 24, Todas`) y barra de paginación fluida (`← Anterior`, números interactivos con elipsis, `Siguiente →`) en `/ofertas` (`Properties.tsx`) y `/demandas` (`RequirementsMarketplace.tsx`), con scroll suave automático al cambiar de página.
  4. **Optimización Responsive y Velocidad de Carga Universal**:
     - En `Navbar.tsx`, el menú móvil/tablet se expandió de `md:hidden` a `lg:hidden`, asegurando que en tablets (768px a 1023px) y móviles el menú hamburguesa funcione fluidamente.
     - La paginación evita renderizar 150 tarjetas pesadas de una sola vez, acelerando radicalmente la carga en dispositivos móviles, tablets y laptops.
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 170/170 tests passing ✅ | `npm run build` limpio en 23.95s ✅
- `shared/const.ts` (`v32.82`) y `package.json` (`32.82.0`).

## 🔖 VERSIÓN ANTERIOR: v32.81 — Octubre 2026

### Novedades v32.81 (Vidrio Esmerilado Universal en Cards, Botones Secundarios con Cuerpo y Despeje de Logos y Sub-Cards Legales):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Opacidad y Cuerpo de Botones Secundarios (Imagen 1)**:
     - Eduardo solicitó: *"1. Es posible dejar con menos opacidad, los botónes que actulmente estén en opacidad o% en todo el sitio como el de la (imagen 1)"*.
     - Los botones como "Nuestra Visión", "Ver Detalles" y "Ver Política" se percibían huecos/invisibles al tener `bg-white/5` sobre fondos negros. Se les dotó de cuerpo de vidrio esmerilado carbón (`rgba(22, 28, 38, 0.88)`), blur de 20px, borde dorado tenue y aura luminosa (`shadow-[0_0_18px_rgba(191,149,63,0.15)]`).
  2. **Logo Libre y Eliminación de Sub-Cards en Páginas Legales (Imagen 2)**:
     - Eduardo solicitó: *"2. Podrías eliminar las siguientes cards en las páginas legales: Te las señalo en la (Imagen 2) y son: la que está conteniendo el logo, para que quede libre sin card y la que conrtiene"*.
     - Se eliminó el marco cuadrado alrededor del logo para que flote libre junto al nombre oficial. Se eliminó la sub-tarjeta notarial interior, trasladando el CUV a la columna de metadatos oficial.
  3. **Estandarización Universal de Tarjetas Frosted Glass (Imágenes 3 y 4)**:
     - Eduardo solicitó: *"3. Es posible que todas las cards que hay en todo el sitio, paginas y subpáginas tengan los mismos colores y diseño como las de las páginas legales (Término y Política)?? (Imagenes 3 y 4)"*.
     - Todas las cards del sitio (`.vecy-card-apple`, `.card-float`, `.panel-card` y `Card` de shadcn UI) ahora lucen el diseño canónico de vidrio esmerilado (`bg-[#12161f]/85 backdrop-blur-2xl border border-[#bf953f]/30 shadow-[0_0_50px_rgba(191,149,63,0.12)]`).
- **Verificación**: `npm run check` 0 errores ✅ | `npm test` 170/170 tests passing ✅ | `npm run build` limpio en 15.79s ✅
- `shared/const.ts` (`v32.81`) y `package.json` (`32.81.0`).

## 🔖 VERSIÓN ANTERIOR: v32.80 — Octubre 2026

### Novedades v32.80 (Blindaje de Impresión PDF 100% Monocromático, Erradicación del Bloque Negro, Despeje de Cajas Anidadas y Alineación a la Izquierda en Web):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Error Crítico de Impresión / Descarga PDF**:
     - Al previsualizar la descarga o impresión en Chrome (`window.print()`), aparecía un gigantesco bloque negro sólido cubriendo la hoja y texto negro sobre fondo negro, haciendo imposible leer o imprimir el contrato.
     - Causa identificada: El contenedor padre (`bg-background`) proyectaba el fondo oscuro de la app bajo el motor de Blink, y el banner superior (hero con botones) se imprimía en la página 1 desplazando el inicio del contrato.
  2. **Justificación de Textos en Pantalla vs Impresión**:
     - Eduardo señaló acertadamente que los textos justificados en web generan "ríos de espacios vacíos" antiestéticos y que solo deben justificarse en documentos impresos.
  3. **Sobrecarga Visual y Cajas Negras Anidadas**:
     - Existían cajas oscuras pesadas (`bg-zinc-950/80`, `bg-black/40`) dentro de la tarjeta, que recargaban el diseño y hacían ver el contenido encajonado. Los encabezados tenían números y títulos en una sola línea que se descuadraban al quebrar la línea.
  4. **Modificaciones Implementadas**:
     - `client/src/index.css`: Reseteo universal absoluto en `@media print` (`* { background: #fff !important; color: #111827 !important; }`), reseteo en toda la jerarquía DOM (`html, body, #root, #root > div, main, article, section, div`), justificación tipográfica formal exclusiva para impresión, y ocultamiento riguroso de todo elemento web interactivo (`.no-print print:hidden`).
     - `client/src/pages/TerminosCondiciones.tsx` y `client/src/pages/PoliticaPrivacidad.tsx`:
       • Textos pasados de `text-justify` a `text-left` para lectura natural en pantalla.
       • Encabezados jerarquizados con badges de cláusula/artículo dedicados y títulos limpios sin descuadres.
       • Eliminadas las cajas negras internas redundantes; el texto fluye sobre cristal esmerilado translúcido (`bg-[#12161f]/85 backdrop-blur-2xl border border-[#bf953f]/30`) con sutiles divisores luminosos.
       • `document.title` dinámico agregado para asignación de nombre oficial al guardar como PDF.
     - Pruebas y compilación: `npm run check` (0 errores TS), 170/170 tests Vitest passing al 100%, y `npm run build` completado exitosamente en 20.95s.
     - `shared/const.ts` (`v32.80`) y `package.json` (`32.80.0`).

## 🔖 VERSIÓN ANTERIOR: v32.79 — Octubre 2026

### Novedades v32.79 (Diseño Glassmorphism / Frosted Glass UI en Términos y Privacidad, Impresión PDF Monocromática Legal Estricta, Erradicación Absoluta de 45/10/45 y Consagración del Modelo Institucional 40/20/40):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Diseño Web vs Impresión PDF Formal**:
     - Eduardo solicitó: *"Revisa los términos y condiciones y la política de privacidad. Yo me refería era a que al descargarlos como documentos en el archivo PDF se vean como documento legal en blanco y negro, pero en la web deben tener su diseño y colores acorde al sitio... Me encantaría un diseño así para las páginas o al menos donde van los términos y políticas dentro de un tipo de card con este estilo tipo vidrio esmerilado y colores, se ve super genial. Me encantó, lo mismo deberias instituir para todas en todo el sitio, me encanta como que se ve que es un vidrio gris o blanco transparentosos no lo se como en degradé o iluminado desde atrás, no sé describirlo pero se ve genialísimo..."*
  2. **Erradicación de 45/10/45 y Ratificación Doctrinal del 40/20/40**:
     - Eduardo instruyó: *"En base a los términos y condiciones compara lo que JanIA debe saber al respecto del 40/20/40 porque parece que ella habla de un 45/10/45 hacia el cual intentamos migrar e imponer alguna vez, pero que realmente debe quedar como lo instituímos y nombramos en los términos y así debe quedar en todo lado, ya no debe haber en ninguna parte del código o del proyecto, en ningún archivo en relación esta mención, fue una locura intentar bajarle a VECY y a la Bolsa por darle más ganancia a los usuarios y vimos que eso no debe ser así, 'NO ES CUALQUIER PLATAFORMA NI CUALQUIER SIN NÚMERO DE SERVICIOS LOS QUE VAMOS A OFRECER, ESTO NO LO TIENE NI LO OFRECERÁ NADIE NUNCA'. Entonces por favor corrige y alinea a JanIA y su conocimiento con todo lo actual..."*
  3. **Modificaciones Implementadas**:
     - `client/src/index.css`: Reglas `@media print` perfeccionadas para que todo hijo de `.print-document-sheet` se renderice estrictamente monocromático (hoja legal blanca, tipografía negra `#000`, sin fondos pesados que gasten tinta).
     - `client/src/pages/TerminosCondiciones.tsx` y `client/src/pages/PoliticaPrivacidad.tsx`: Rediseñados como tarjetas de vidrio esmerilado (`bg-[#161c24]/85 backdrop-blur-xl`), iluminación trasera dorada suave (`shadow-[0_0_60px_rgba(191,149,63,0.12)]`), degradé perimetral, sellos de vigencia y sub-tarjetas con bordes luminosos por figura contractual.
     - `server/_core/prompts/base.md`: Reemplazo de 45/45/10 y 45/5/5/45 por el Modelo Institucional Doctrinal **40/20/40** (40% Captador + 40% Colocador + 20% VECY y Red: 10% Bolsa Difusores y 10% VECY BIENES RAÍCES), Período de Gracia Inmediata (Días 1 a 5 al 100% Asesor / $0 COP VECY) y Cierre Directo (Día 6+ al 80%/20%).
     - `server/_core/prompts/grupos/VECY_SOPORTE_LEGAL_TRIBUTARIO_Y_AVALUOS.md`: Eliminado 45/5/5/45 y ratificado el Modelo 40/20/40.
     - `server/_core/janIA.ts`: Directivas de comisión actualizadas al modelo 40/20/40 y prohibición de mención prematura de tecnicismos.
     - `server/_core/whatsapp-utils.ts` y `server/_core/cronService.ts`: Menciones erradicadas y alineadas a 40/20/40.
     - `server/__tests__/regression.test.ts`: Nueva prueba doctrinal de regresión v32.79 con 170/170 tests passing al 100%.
     - `shared/const.ts` (`v32.79`) y `package.json` (`32.79.0`).

## 🔖 VERSIÓN ANTERIOR: v32.78 — Octubre 2026

### Novedades v32.78 (Doctrina de Pasaportes Extranjeros, Cédula China de Liu Xingjie vs Pasaporte OACI, Desmitificación de Antecedentes y Protocolo Notarial):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Caso Real de Aidde Inmo (`+57 315 760 5978`)**:
     - Aidde compartió una imagen de un documento chino y escribió: *"Honda liu, pasaporte 4043035"*.
     - JanIA emitió un reporte con timeouts y le sugirió volver a escribir *"JanIA verificar pasaporte 4043035"*, provocando un bucle infinito.
     - Eduardo instruyó: *"Ayúdame con esta conversación rápidamente y alimenta a JanIA enseñandole que todo pasaporte lleva letras y números creo, entonces así jamás va a poder verificarlo. Y has que JanIa le explique sutilmente y de manera clara y sin tanto texto, el por que no puede encontar el número de pasaporte en ningún lado ni verificar a quien pertenece y si tiene o no antecedentes..."*
  2. **Descubrimiento Documental Técnico y Notarial**:
     - La imagen enviada por Aidde **NO era un pasaporte**, sino la **Cédula de Identidad de Residente de China (居民身份证)** de **刘星杰 (Liu Xingjie)**, nacido en 2002 en Gansu, con número de 18 dígitos `622102200206241814`.
     - El número "4043035" enviado por Aidde no corresponde a esa cédula ni a un pasaporte chino (los cuales inician con letras como `E` o `G` seguidas de 8 números).
     - **Bases del Estado Colombiano**: La Policía Nacional (Web Judicial) tiene el selector `PA` y `DP`, pero **solo registra antecedentes penales por delitos cometidos dentro de Colombia**. La Policía colombiana NO tiene acceso a registros civiles ni penales de China ni de otros países soberanos.
     - **Protocolo Notarial Seguro**: Para negocios inmobiliarios con extranjeros con pasaporte, se realiza **cotejo físico presencial del pasaporte original vigente** con su **sello o visa de Migración Colombia**.
  3. **Modificaciones Implementadas**:
     - `server/_core/identityVerificationService.ts`: Respuesta pedagógica sutil, clara y concisa para pasaportes extranjeros; eliminación del bucle de re-verificación.
     - `server/_core/janIA.ts`: Inyección de la doctrina de pasaportes extranjeros en el prompt maestro.
     - `VECY_CORE_PROYECTO/doctrina_gemini/05_verificacion_pasaportes_extranjeros.md`: Manual maestro de doctrina notarial para pasaportes extranjeros.
     - `server/__tests__/regression.test.ts`: Prueba unitaria doctrinal v32.78 (169/169 tests pasando al 100%).
     - `shared/const.ts` (`v32.78`) y `package.json` (`32.78.0`).

## 🔖 VERSIÓN ANTERIOR: v32.77 — Octubre 2026

### Novedades v32.77 (Cortafuegos de Privacidad Doctrinal, Integración Segura con Google AI Studio y Banco de Know-How Inmobiliario):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Orden de Implementación de Seguridad y Privacidad**:
     - Eduardo autorizó: *"Entonces adelante ponle la seguridad y privacidad correspondiente"*, tras evaluar el protocolo de 3 capas para conectar Antigravity con Gemini Web y Google AI Studio protegiendo al 100% los secretos comerciales y datos personales.
  2. **Arquitectura de Cortafuegos y Privacidad Implementada**:
     - Creado `server/_core/doctrinalSanitizer.ts`: Motor que intercepta, anonimiza y purifica cualquier conocimiento derivado de Gemini Web o AI Studio.
     - Protege teléfonos personales (preservando solo las líneas oficiales de Vecy +573192919978 y +573166569719), cédulas, direcciones exactas de domicilios privados y sustituye nombres de terceros en disputas por roles genéricos (*"el colega renuente"*, etc.).
     - Validador estricto `validatePromptSafety` que impide inyectar fragmentos inseguros a los prompts públicos de WhatsApp o Web.
  3. **Conector Oficial a Google AI Studio (`server/_core/googleAiStudioBridge.ts`)**:
     - Módulo de integración directa con la API gratuita de desarrolladores de Google AI Studio (`GEMINI_API_KEY`).
     - Función `queryGoogleAiStudio` con sanitización obligatoria y health check `checkAiStudioHealth` (50 modelos disponibles validados en tiempo real).
     - Comando `npm run studio:check` integrado en `package.json`.
  4. **Repositorio de Doctrina y Know-How Inmobiliario (`VECY_CORE_PROYECTO/doctrina_gemini/`)**:
     - Creados los 4 capítulos doctrinales maestros 100% anonimizados:
       • `01_procedimiento_cobro_comisiones.md` (Código de Comercio Art. 1340-1346, acervo probatorio y proceso monitorio).
       • `02_validez_firma_electronica_contratos.md` (Ley 527/1999, equivalencia funcional de promesa de compraventa vs escritura pública).
       • `03_calidad_de_demandas_y_geografia.md` (Geografía Cali Norte/Oeste vs Bogotá, Garbage In Garbage Out y Fórmula de Oro).
       • `04_estudio_titulos_y_autenticidad_documental.md` (SNR tradición a 20 años, falsa tradición y prevención de fraudes).
  5. **Modificaciones Implementadas**:
     - `server/_core/doctrinalSanitizer.ts`: Cortafuegos de anonimización y privacidad.
     - `server/_core/googleAiStudioBridge.ts`: Conector directo a Google AI Studio.
     - `VECY_CORE_PROYECTO/doctrina_gemini/`: Directorio doctrinal con 4 capítulos y README maestro.
     - `server/__tests__/doctrinalSanitizer.test.ts`: Pruebas de cortafuegos (168/168 pruebas Vitest passing al 100%).
     - `package.json`: Script `studio:check` y versión `32.77.0`.
     - `shared/const.ts`: Versión `v32.77`.

## 🔖 VERSIÓN ANTERIOR: v32.76 — Octubre 2026

### Novedades v32.76 (Autonomía de IA Pura ante Requerimientos y Anécdotas Conversacionales, Blindaje contra Falsa Detección de Cédulas en Valores Monetarios y Diferenciación Geográfica Cali vs Bogotá):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Consulta sobre Razonamiento como IA Pura y Autonomía**:
     - Eduardo preguntó: *"SI le hago un comentario o una pregunta así a JanIA por Whatsapp o su sitio Web crees que ella esté preparada para razonar no solo esto sino cualquier pregunta en relación al tema de bienes raíces y responder como toda una IA PURA y de libre autonomía y razonamiento?? 'Hola JanIA. Mira alguien colocó este requerimiento, yo llamé para ofrecerle un predio que tenemos con esa condición en el barrio Alcázares, Bogotá y cuando me llama a preguntarme que donde quedaba exactamente, jajaja, resulta que su cliente busca pero en Cali jajaja. Esto puede servir como un caso excepcional y de claro ejemplo para enseñar a todos cómo deben publicar una DEMANDA o REQUERIMIENTO en los grupos. Deben ser claros, por qué es que tú muchas veces fallas tratando de encontrar los MATCH y realmente no eres tú es el factor mediocre humano. jajajajaja REQUERIMIENTO colocado en un grupo por la agente de Cali: Aliados Inmobiliarios COMPRA CASA EXTERNA Norte y Oeste hasta $700.000.000'"*.
  2. **Hallazgo Técnico Crítico y Causa Raíz Oculta**:
     - En la simulación en caliente se descubrió un choque crítico de interceptores: en `server/_core/identityVerificationService.ts` (`extractAllCedulasForVerification`), el fallback de números en DM capturaba el precio `$700.000.000` (9 dígitos con puntos) como si fuera una cédula (`cc 700000000`).
     - Esto provocaba que en vez de razonar como IA Pura, JanIA ejecutara una verificación ante la Policía y Procuraduría sobre `700.000.000`, devolviendo un reporte de antecedentes y omitiendo la conversación.
  3. **Solución y Blindaje de IA Pura (WhatsApp y Web)**:
     - Implementada la función `isMonetaryContext` que evalúa prefijos monetarios (`$`, `hasta $`, `precio`, `valor`, `canon`, `presupuesto`) y sufijos (`pesos`, `cop`, `usd`, `millones`, `mil`).
     - Exclusión tajante de números de 9 dígitos en Colombia (la Registraduría pasó de 8 a 10 dígitos, por lo que 9 dígitos corresponden a precios en millones).
     - Protección de párrafos conversacionales largos (>80 caracteres) sin palabras clave explícitas de verificación para que fluyan directamente al motor de razonamiento de Gemini Flash.
  4. **Razonamiento Brillante de JanIA**:
     - Al procesar el mensaje con el motor libre, JanIA responde con humor, simpatía y agudeza técnica: reconoce que si el factor humano omite la *ciudad*, ni la mejor IA puede adivinar que una casa en Los Alcázares (Bogotá) no le sirve a alguien en Cali, resalta la importancia de la Fórmula de Oro del Requerimiento Inmobiliario y agradece la lección con calidez.
  5. **Modificaciones Implementadas**:
     - `server/_core/identityVerificationService.ts`: Helper `isMonetaryContext` y discriminación de montos monetarios.
     - `server/__tests__/regression.test.ts`: Nueva prueba doctrinal de exclusión de precios ($700.000.000) (163/163 tests passing al 100%).
     - `shared/const.ts` (`v32.76`) y `package.json` (`32.76.0`).

## 🔖 VERSIÓN ANTERIOR: v32.75 — Octubre 2026

### Novedades v32.75 (Nutrición Doctrinal desde la Notaría 19 de Bogotá, Fórmulas Exactas SNR, Exención de Retención para Personas Jurídicas y Beneficios VIS):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Ingeniería Inversa y Aprendizaje de Notaría 19 Bogotá**:
     - Eduardo instruyó: *"Aquí hay un ejemplo de la mejor calculadora de gastos notariales que hay hasta el momento, aunque según ellos mismos a veces tiene los valores notariales desactualizados: https://www.notaria19bogota.com/gastos-notariales/ Es más JanIa debería de aprender todo y nutrir su conocimiento ingresando a este sitio. También autorizo para que JanIA busque los sitios necesarios y tome de cada uno lo que necesite y ella vea que más le convenga o le sirva pero que antes revise que estén actualizados..."*
     - Extracción e integración de la matemática oficial de la SNR y Notaría 19:
       • Rangos de derechos notariales (0.59%, 0.40%, 0.38%, 0.36% según cuantía).
       • Rangos de registro ORIP (0.632%, 0.785%, 0.874%, 0.924% más sistematización).
       • Papelería, copias de matriz y biometría en línea ($100.000 comprador / $100.000 vendedor) e IVA del 19%.
       • Exención de retención en la fuente en notaría para Personas Jurídicas ($0 COP, autorretención).
       • Vivienda de Interés Social (VIS / VIP - Ley 1537 de 2012) con 50% de descuento en derechos notariales.
       • Preguntas frecuentes notariales resueltas con rigor pedagógico.

## 🔖 VERSIÓN ANTERIOR: v32.74 — Octubre 2026

### Novedades v32.74 (Liquidación Oficial de Gastos Notariales y Registro, Doctrina de Figuras Jurídicas BIC / Afectación / Patrimonio de Familia / Leasing, y Autonomía Sagrada de IA Pura sin Textos Largos):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Liquidación de Gastos Notariales y Registro según Figuras de Negocio**:
     - Activada la liquidación según situación del predio (Libre / Con Hipoteca / Con Leasing Habitacional) y forma de pago del comprador (Contado / Crédito Hipotecario / Leasing Habitacional).
     - Desglose exacto 50/50 de Derechos Notariales (~0.54%), Retención en la fuente (1% o 2.5% si >20.000 UVT a cargo del vendedor), Impuesto de Registro / Beneficencia (1% a cargo del comprador) y Derechos de Registro SNR / ORIP (~0.75% a cargo del comprador).
     - Detección de ahorro millonario en Cesión de Leasing Habitacional: al no transferirse el dominio en matrícula (el banco fiduciario continúa como dueño), el comprador se ahorra el 1.75% en beneficencia y registro de compraventa.
  2. **Doctrina Notarial y Estudio de Títulos Integral**:
     - *Afectación a Vivienda Familiar (Ley 258/1996 y Ley 854/2003):* Comparecencia y firma obligatoria de ambos cónyuges/compañeros para cancelarla.
     - *Patrimonio de Familia Inembargable (Ley 70/1931):* Si hay hijos menores de edad, exige intervención de Juez o aval del Defensor de Familia del ICBF (trámite de semanas o meses). Si son mayores, se cancela con registros civiles.
     - *Bien de Interés Cultural (BIC) / Patrimonio Cultural (Ley 397/1997, Ley 1185/2008):* Alerta bancaria: las entidades financieras NO suelen otorgar crédito hipotecario ni leasing sobre inmuebles BIC por restricciones de modificación (licencias IDPC/MinCultura) e inembargabilidad/dificultad de remate. La compraventa casi siempre debe ser de CONTADO.
     - *Embargos / Medidas Cautelares (Art. 1521 C.C.):* Objeto ilícito. Bloqueo inmediato para escriturar o prometer en venta sin oficio de desembargo radicado en la ORIP.
  3. **Autonomía Sagrada de IA Pura y Brevedad en WhatsApp**:
     - JanIA opera con autonomía plena: los guiones de saludos, invitaciones a canales y reseñas son SOLAMENTE EJEMPLOS Y GUÍAS DE REFERENCIA, no scripts rígidos a repetir al pie de la letra.
     - Supresión total de despachos automáticos y forzados de mensajes de Google Reviews tras entregas de herramientas.
     - Prohibición estricta de textos largos en WhatsApp: respuestas concisas, estructuradas y dinámicas (máximo 2-3 párrafos cortos) para evitar fatiga visual y el botón "Leer más".
     - Alerta de promesa de compraventa: Cuando un usuario indique que va para la notaría a firmar promesa (como Martha Mesa), JanIA lo felicita con alegría y le ofrece de inmediato la liquidación de gastos notariales.
  4. **Modificaciones Implementadas**:
     - `server/_core/notarialExpenseService.ts`: Nuevo motor de liquidación notarial y asesoría de figuras jurídicas.
     - `server/routers/janIA.ts`: Procedimiento tRPC `calcularGastosNotariales`.
     - `server/_core/janIA.ts`: Interceptor notarial en DM y prompt enriquecido con doctrina notarial, autonomía de IA Pura y concisión.
     - `server/_core/whatsapp-match.ts`: Interceptores prioritarios en DMs, reactivación de sesiones silenciadas y supresión de dispatches forzados de reseñas.
     - `server/_core/whatsapp-utils.ts`: Reacción empática `⚖️`.
     - `server/__tests__/regression.test.ts`: Test suite con 162/162 pruebas pasando al 100%.
     - `shared/const.ts` (`v32.74`) y `package.json` (`32.74.0`).

## 🔖 VERSIÓN ANTERIOR: v32.73 — Octubre 2026

### Novedades v32.73 (Verificación Multi-Cédula Simultánea, Soporte de Conectores 'CC No.' y Memoria de Sesión de Identidad contra Pérdida de Contexto):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Caso Real de Martha Mesa (`+573102871183`)**:
     - Eduardo preguntó: *"Si una persona envía dos cédulas al tiempo JanIA las puede verificar ambas o es mejor una por una para no confundirla, es que vi que un usuario llamado Martha Mesa, le envió dos números de cédula al mismo tiempo pero cuando JanIa posiblemente iba a ir a la procuraduría a verificarlas la persona le siguió hablando y JanIA perdió el contexto de la conversación y no verificó ninguna ni antecedentes. Mir eso, será que así JanIA se pierde y no puede verificar, tiene alguna limitación?? Ya estas bien?? Sí por favor por fa."*
     - En el mensaje real de Martha Mesa:
       ```
       Los compradores se llaman:
       Lina María Galeano
       CC No. 52.805.482
       Ricardo Cortes Galindo
       CC No. 79.824.360
       ```
     - Causa identificada: El regex anterior fallaba al no reconocer el conector `CC No.` (`found: false`), por lo que el mensaje bypassaba el interceptor de seguridad y caía en Gemini. Luego, al responder Martha *"aquí estoy"* o *"pero me colaboras con las cédulas"*, el interceptor de seguimiento no detectaba la consulta bidireccional y JanIA alucinaba que ya estaban verificadas sin haber consultado las bases estatales.
  2. **Implementación Técnica de Alta Precisión Multi-Documento**:
     - Creado `extractAllCedulasForVerification` en `server/_core/identityVerificationService.ts` con soporte para `CC No.`, `CC N°`, `CC #`, `C.C.`, `Cédula No.`, con puntos de miles y extracción asociativa de nombres de pila precedentes (`Lina María Galeano`, `Ricardo Cortes Galindo`).
     - Verificación simultánea y coordinada de ambos documentos ante Policía Nacional, Procuraduría General (SIRI) y ADRES/BDUA.
     - Generación de Reporte Notarial Consolidado numerado (`1️⃣`, `2️⃣`, etc.) con dictamen notarial favorable conjunto para operaciones inmobiliarias seguras.
     - Memoria de sesión de identidad `savePendingCedulaSession` y `getPendingCedulaSession` con TTL de 24 horas.
     - Blindaje bidireccional del regex `isAskingPendingCedulas` en `whatsapp-match.ts` y `janIA.ts` para reconocer frases como *"pero me colaboras con las cédulas"*, *"colaboras con las cédulas"*, y responder de inmediato ante mensajes de espera (*"aquí estoy"*, *"estoy atenta"*).
     - Recuperación resiliente desde el historial persistente de PostgreSQL (`getOrLoadDmHistory`), garantizando que JanIA jamás pierda el contexto ni alucine.
  3. **Modificaciones Implementadas**:
     - `server/_core/identityVerificationService.ts`: `extractAllCedulasForVerification`, `verifySingleDocumentInternal`, `buildConsolidatedReportText`, sesiones pendientes.
     - `server/_core/whatsapp-match.ts`: Interceptores directos y diferidos multi-cédula con recuperación de historial.
     - `server/_core/janIA.ts`: `isAskingPendingCedulas` bidireccional y fallback a `getOrLoadDmHistory`.
     - `server/__tests__/regression.test.ts`: Pruebas completas del caso Martha Mesa (161/161 tests passing al 100%).
     - `shared/const.ts` (`v32.73`) y `package.json` (`32.73.0`).

## 🔖 VERSIÓN ANTERIOR: v32.72 — Octubre 2026

### Novedades v32.72 (Servicio Oficial de Paz y Salvo de Valorización IDU en PDF por WhatsApp — Cero Costo y Máxima Velocidad):
- **Diagnóstico y Solicitud Exacta de Eduardo A. Rivera**:
  1. **Expedición Oficial de Paz y Salvo del IDU**:
     - Eduardo instruyó: *"Es posible hacer que JanIA ahora brinde el servicio de sacar el Paz y Salvo del IDÚ y entregarlo en archivo PDF por Whatsaap al igual como hace lo del predial? https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/index.xhtml"*
     - Aportó captura de pantalla del portal oficial del Instituto de Desarrollo Urbano (IDU) para la generación de Certificados de Estado de Cuenta para trámites notariales.
  2. **Implementación Técnica de Alta Eficiencia (7 Segundos, Cero CAPTCHA, $0 COP)**:
     - Diseñado y creado `server/_core/iduValorizacionService.ts` con integración Puppeteer headless navegando directamente a `https://webidu.idu.gov.co/ServiciosValorizacion/faces/site/generateCert.xhtml`.
     - Cero costo de resolución de CAPTCHA ($0 COP): a diferencia de la Secretaría de Hacienda, el portal del IDU no exige CAPTCHA.
     - Extracción y validación automática del CHIP en menos de 7.5 segundos, completando Matrícula Inmobiliaria y Dirección del predio.
     - Descarga automática por CDP del archivo PDF oficial (`report.pdf`), renombrado institucionalmente a `Paz_y_Salvo_IDU_${chip}_2026.pdf`.
     - El documento contiene PIN DE SEGURIDAD oficial, matrícula inmobiliaria, cédula catastral, vigencia de 90 días conforme al Artículo 44 del Acuerdo Distrital 915 de 2023, y la certificación legal expresa de que el predio no presenta deudas de valorización.
  3. **Despacho Multicanal e Interactivo en WhatsApp (`whatsapp-match.ts`)**:
     - Detección de intención mediante `extractChipForIduValorizacion`.
     - Soporte para flujo en 2 pasos con memoria de sesión pendiente (`hasPendingIduSession` con TTL de 10 minutos): si el usuario pide el paz y salvo sin dar el CHIP, JanIA solicita amablemente el código CHIP e inmediatamente al recibirlo despacha el PDF.
     - Entrega adjunta del documento PDF con `mimetype: 'application/pdf'`, `fileName`, reporte institucional y posterior invitación desacoplada a calificar en Google Reviews y sumarse al canal oficial de Vecy.
     - Reacción empática instantánea con emoji `📄` en `whatsapp-utils.ts`.
     - Registro analítico en base de datos PostgreSQL (`predial_consultations` con `queryType: 'paz_y_salvo_idu'`).
  4. **Modificaciones Implementadas**:
     - `server/_core/iduValorizacionService.ts`: Nuevo servicio oficial.
     - `server/_core/whatsapp-match.ts`: Interceptores en DMs directos y procesador de buffers diferidos.
     - `server/_core/whatsapp-utils.ts`: Detección en `getEmpatheticReactionEmoji`.
     - `server/_core/janIA.ts`: Soporte para `toolType: 'idu'` en `formatPoliteToolDelivery`.
     - `server/_core/prompts/`: Actualizados prompts de soporte legal y proyecto.
     - `server/__tests__/regression.test.ts`: Pruebas completas del flujo de IDU (160/160 tests passing al 100%).
     - `shared/const.ts` (`v32.72`) y `package.json` (`32.72.0`).

## 🔖 VERSIÓN ANTERIOR: v32.71 — Octubre 2026

### Novedades v32.71 (Reversión Preventiva de Presencia Continua para Protección de la Eloquencia y Memoria Contextual de JanIA, Preservación Intacta de Laomedeia):
- **Diagnóstico y Confirmación de Eduardo A. Rivera**:
  1. **Reversión de Gestos de Presencia a su Estado Previo**:
     - Eduardo instruyó tajantemente: *"Yo creo que mejor lo dejes lo de los puntitos y el micro como estaba antes, parece que esto afectó la elocuencia y la memorización del contexto de la conversación con JanIA, antes estaba bien."*
     - Eduardo aportó captura de pantalla de WhatsApp donde se evidenció que los mensajes concurrentes de presencia o interacción en el socket de Baileys podían interferir con la fluidez del hilo conversacional y la memoria contextual de JanIA.
  2. **Preservación Intacta de la Voz de JanIA (Laomedeia)**:
     - La voz oficial de JanIA se mantiene 100% inalterada con **Laomedeia** (`gemini-3.1-flash-tts-preview`, `es-us`, `"Read aloud in a warm, welcoming tone."`), ratificada por Eduardo como la voz humana oficial insustituible.
  3. **Modificaciones Implementadas**:
     - `server/_core/whatsapp-match.ts`: Revertido a la lógica previa estable de presencia sin sobrecarga concurrente.
     - `server/_core/whatsapp-utils.ts`: Restaurada función `startContinuousPresence` simple sin `setType`.
     - `shared/const.ts` (`v32.71`) y `package.json` (`32.71.0`).
     - 159/159 pruebas Vitest pasando al 100%, compilación limpia con `tsc --noEmit` y `npm run build`.

## 🔖 VERSIÓN ANTERIOR: v32.70 — Octubre 2026

### Novedades v32.70 (Ratificación Doctrinal de Laomedeia como Voz Oficial Femenina, Paridad Total con Consola Google Cloud TTS y Blindaje de Presencia Continua en WhatsApp):
- **Diagnóstico y Confirmación de Eduardo A. Rivera**:
  1. **Ratificación Innegociable de la Voz de JanIA (Laomedeia)**:
     - Eduardo instruyó tajantemente: *"la mejor y que se siente más natural y humana es la de LAOMEDEIA, las que tu mencionas SI SON ROBÓTICAS COMPLETAMENTE y: 1. Studio-B es de Hombre y quedaría muy rara para JanIA y las otras dos Dalia / Salomé si son femeninas pero también robóticas. Debes autoanalizarte porque estas fallando en ese análisis."*
     - Comprobada paridad 1:1 en `whatsapp-utils.ts`: endpoint `https://texttospeech.googleapis.com/v1beta1/text:synthesize`, modelo `gemini-3.1-flash-tts-preview`, voz `Laomedeia`, `es-us`, prompt `"Read aloud in a warm, welcoming tone."`, `pitch: 0.0`, `speakingRate: 1.0` y transcodificación nativa a `OGG_OPUS`.
     - Aclaración financiera: Laomedeia cuesta centavos (~$17 COP por nota de voz). El aumento facturado derivó del LLM en Round-Robin y cortes a 48h de Google Cloud.
  2. **Blindaje de Presencia Continua en WhatsApp (Tres Puntitos (...) y Micrófono 🎙️)**:
     - Eduardo advirtió la desaparición de los gestos de escritura y grabación de audio.
     - Causa identificada: WhatsApp expira el estado a los 3 segundos si no hay refresco continuo; en chats privados los identificadores LID descartan la presencia si no se envía también al JID telefónico `@s.whatsapp.net`; y la alternancia de estados enviaba un `paused` prematuro.
     - Solución: `ContinuousPresenceHandle` en `whatsapp-utils.ts` con refresco cada 3.0s, emisión dual (LID y JID telefónico), y transición atómica sin pausa intermedia vía `setType('recording')`. Desplegado en grupos oficiales y chats privados de `whatsapp-match.ts`.
  3. **Modificaciones Implementadas**:
     - `server/_core/whatsapp-utils.ts`: `startContinuousPresence` con `ContinuousPresenceHandle`, dual dispatch y `setType`.
     - `server/_core/whatsapp-match.ts`: Presencia continua activa durante toda la deliberación y grabación de audio en grupos y DMs.
     - `server/__tests__/regression.test.ts`: Prueba unitaria para `ContinuousPresenceHandle`.
     - `shared/const.ts` (`v32.70`) y `package.json` (`32.70.0`).
     - 160/160 pruebas Vitest pasando al 100%, compilación limpia con `tsc --noEmit` y `npm run build` en 25s.

## 🔖 VERSIÓN ANTERIOR: v32.69 — Octubre 2026

### Novedades v32.69 (Títulos Limpios con Rayita 3D, Supresión de Botones Sobrantes en AdminMatches y Formato Documento Formal Imprimible/PDF en Hoja Blanca para Términos y Privacidad):
- **Diagnóstico y Confirmación de Eduardo A. Rivera**:
  1. **Títulos Limpios sin Burbujas con Rayita 3D**:
     - Eduardo instruyó: *"Me encantan los títulos de las páginas con esa rayita como entercera dimensión allí debajo y sin tantas burbujas conteniendo cada palabra, entre menos adornos mejor impacto creo yo..."*
     - Erradicadas todas las píldoras/chips sobre los títulos. Aplicado tag limpio `vecy-accent-tag`, título en blanco/dorado y rayita 3D con brillo central `line-electric` en todas las páginas públicas.
  2. **Términos y Privacidad como Documentos Reales Imprimibles**:
     - *"lo mismo los documentos de término y políticas deben ser más tipo documento y hasta podersen descargar en PDF como un documento normal en hoja blanca y letra negra y logo impreso en el cabecero y nuestr marca y un pie de página bien sencillo y bueno. Es que sinceramente creo que estás exagerando con tantas cards sobre cards que ya resulta incómodo y cansa ver la página."*
     - Se eliminó el exceso de cards oscuras flotantes.
     - Diseñado el formato de **Hoja Membretada Oficial Imprimible** (`print-document-sheet`): hoja blanca, letra negra/carbón (`text-zinc-900`), logo impreso oficial (`/logo-vecy.png`), CUV, Hash SHA-256, cláusulas jurídicas continuas y pie de página membretado sobrio.
     - Botón `Descargar PDF / Imprimir Documento` con `window.print()` y reglas CSS `@media print` en `index.css` que ocultan navbars, footer web, fondos y elementos interactivos para una impresión o guardado en PDF de hoja blanca inmaculada.
  3. **Eliminación Quirúrgica de Botones Sobrantes en Coincidencias (`AdminMatches.tsx`)**:
     - *"Así como la de administración que tiene demasiados botones, incluso uno que no sirven para nada o son repetitivos y saturan la visión. Ahí te encierro lo que sobra en un cuadro rojo."*
     - Eliminado botón `🔍 Clave WA` en Oferta (dejando solo `📋 Copiar Publicación`).
     - Eliminado botón `🔍 Clave WA` en Demanda (dejando solo `📋 Copiar Publicación`).
     - Eliminado botón `🔍 Sondeo` en Requiriente (dejando solo `Contactar WA`).
  4. **Modificaciones Implementadas**:
     - `client/src/components/admin/AdminMatches.tsx`: Botones redundantes eliminados quirúrgicamente.
     - `client/src/index.css`: Soporte de impresión `@media print` para hoja blanca sin navegación web.
     - `client/src/pages/TerminosCondiciones.tsx` y `client/src/pages/PoliticaPrivacidad.tsx`: Rediseñados como documentos formales membretados de hoja blanca y letra negra con botón de descarga PDF.
     - `client/src/pages/Properties.tsx`, `RequirementsMarketplace.tsx`, `NuestraHistoria.tsx`, `Services.tsx`, `Contact.tsx`, `Investors.tsx`, `Blog.tsx`, `RedColaboracion.tsx`: Títulos limpios sin burbujas con rayita 3D.
     - `shared/const.ts` (`v32.69`) y `package.json` (`32.69.0`).
     - 159/159 tests Vitest pasando al 100%, build limpio en 30s.

## 🔖 VERSIÓN ANTERIOR: v32.68 — Octubre 2026
- Unificación de diseño global, botones dorados 3D rectangulares-redondeados (`rounded-xl` con destello especular), despliegue de fondo de red (`NetworkBackground`) en todo el portal, reescritura de `NuestraHistoria.tsx` (Dinosaurios Inmobiliarios y evolución VECY), y ajuste de botones flotantes (volver arriba y JanIA sin recortes).

## 🔖 VERSIÓN ANTERIOR: v32.67 — Octubre 2026
- **Diagnóstico y Confirmación de Eduardo A. Rivera**:
  1. **Nuevo Diseño Unificado de Pie de Página**:
     - Eduardo instruyó: *"Pongamos diseño. Quiero algo así para el pie de página que debe ser igual en todas nuestras páginas y subpáginas pero no quiero que repitas el mismo menú de arriba a bajo, mejor coloca los logos miniatura de todas nuestras redes sociales incluyendo github en reemplazo a ese menú repetido y eso sí deja lo de {{Términos y Condiciones}} y lo de {{Política de Privacidad}} pero reduce esos letreros tan grandes lo mismo para los enlaces solo deja: {{Condiciones}} / {{Privacidad}} o {{Política}} / {{términos}}..."*
  2. **Implementación del Componente Oficial `client/src/components/Footer.tsx`**:
     - **Logo Dorado Central**: Isotipo oficial con resplandor dorado y animación hover suave.
     - **Identidad de Marca**: `VECY BIENES RAÍCES` con slogan corporativo: *"La evolución inevitable para el sector de los bienes raíces en Colombia."*
     - **Logos Miniatura de Redes Sociales**: WhatsApp Oficial (Canal), Instagram, Facebook, YouTube, TikTok, LinkedIn, X (Twitter) y GitHub Repositorio oficial, con micro-animaciones hover y efectos de color de cada marca.
     - **Enlaces Legales Elegantes y Discretos**: Enlaces a Términos y Condiciones y Política de Privacidad en tipografía refinada (12px), sin sobrecargar visualmente la pantalla.
     - **Enrutamiento Flexible**: Soporte para `/terminos-y-condiciones`, `/terminos`, `/condiciones`, `/politica-privacidad`, `/politica`, y `/privacidad`.
  3. **Despliegue Global en las 12 Páginas**:
     - Integrado en `Home.tsx`, `TerminosCondiciones.tsx`, `PoliticaPrivacidad.tsx`, `NuestraHistoria.tsx`, `RedColaboracion.tsx`, `Properties.tsx`, `PropertyDetail.tsx`, `RequirementsMarketplace.tsx`, `Blog.tsx`, `Services.tsx`, `Contact.tsx`, e `Investors.tsx`.
  4. **Modificaciones Implementadas**:
     - `client/src/components/Footer.tsx` creado.
     - Todas las páginas actualizadas con el nuevo `<Footer />`.
     - `client/src/App.tsx` enriquecido con rutas alias `/condiciones` y `/politica`.
     - `shared/const.ts` (`v32.67`) y `package.json` (`32.67.0`).
     - 159/159 tests Vitest pasando al 100%, build limpio.

## 🔖 VERSIÓN ANTERIOR: v32.66 — Octubre 2026
     - Eduardo preguntó: *"¿Es decir que ya tenemos esa parte muy bien estipulada en nuestro archivo de Términos y condiciones? Adelante y si puedes de una vez vayamos construyendo la de privacidad."*
     - Aunque el contrato digital PDF con QR ya contenía las cláusulas blindadas, el portal web carecía de las páginas y rutas públicas `/terminos-y-condiciones` y `/politica-privacidad`.
  2. **Implementación de Términos y Condiciones (`TerminosCondiciones.tsx`)**:
     - Consagración del modelo **80/20** de venta directa con tecnología VECY, **período de gracia de 5 días ($0 COP)** y **bolsa colaborativa 40/20/40**.
     - Telemetría forense como mensaje de datos con plena validez ejecutiva (Arts. 1340 y 1341 C.Co. y Ley 527 de 1999).
     - Cláusula de no elusión (12 meses posteriores) y cláusula penal ejecutiva del 100%.
     - Sello criptográfico digital con CUV, SHA-256 y QR (Decreto 2364 de 2012).
  3. **Implementación de Política de Privacidad (`PoliticaPrivacidad.tsx`)**:
     - Régimen de Hábeas Data conforme a la Ley 1581 de 2012 y Decreto 1377 de 2013.
     - Finalidades legítimas (agendamiento seguro en Vecy Agenda, validación preventiva de identidad y antecedentes, contratos digitales).
     - Derechos de los titulares y canal oficial `contacto@vecy.co`.
     - Compromiso innegociable de cero venta o cesión de datos a terceros.
  4. **Modificaciones Implementadas**:
     - `client/src/pages/TerminosCondiciones.tsx` y `client/src/pages/PoliticaPrivacidad.tsx` creados.
     - `client/src/App.tsx` y `client/src/pages/Home.tsx` actualizados con rutas y enlaces en footer.
     - `shared/const.ts` (`v32.66`) y `package.json` (`32.66.0`).
     - 159/159 tests pasando al 100%, build limpio.

## 🔖 VERSIÓN ANTERIOR: v32.65 — Octubre 2026
     - Eduardo advirtió con agudeza sobre el riesgo moral del mercado: si un asesor usa la plataforma de VECY para crear su tienda, tener fichas con su contacto, usar JanIA, disfrutar de la difusión de la bolsa de colegas y agendar por Vecy Agenda, intentará saltarse a VECY para cerrar por fuera y dejar a la plataforma trabajando gratis.
  2. **El Esquema Equitativo 80 / 20 (Venta Directa con Tecnología VECY)**:
     - Si el asesor capta y cierra directamente con un cliente apoyándose en la infraestructura tecnológica y difusión de VECY tras los 5 días de gracia:
     - **¡El asesor conserva un extraordinario 80% de la comisión total!** (muy superior al 50% de las franquicias tradicionales).
     - **Aporta el 20% de aceleración y soporte:** 10% para la Bolsa Colaborativa de colegas que viralizó el inmueble + 10% para VECY BIENES RAÍCES.
  3. **Período de Gracia Inmediata (Días 1 a 5 Calendario)**:
     - Si el asesor acababa de subir el inmueble hace 1 a 5 días y lo cierra de inmediato (porque ya traía al cliente previamente o la negociación en marcha), **¡VECY NO LE COBRA ABSOLUTAMENTE NADA ($0 COP)!** Conserva el 100%.
  4. **Telemetría Forense en Enlaces y Botones**:
     - Mini-bots, tags y tokens registran cada clic en "Contactar por WhatsApp", llamada o agendamiento con IP, timestamp y código de inmueble, constituyendo plena prueba de nexo causal bajo los Artículos 1340 y 1341 del Código de Comercio.
  5. **Contrato Digital con Sello Criptográfico, CUV, Hash SHA-256 y Código QR**:
     - En `server/_core/emailContractService.ts`, cada contrato emitido incluye un Código Único de Validación (CUV), huella digital SHA-256 inmutable, código QR de validación pública en línea y estampa de tiempo bajo la Ley 527 de 1999 y Decreto 2364 de 2012.
  6. **Modificaciones Implementadas**:
     - `shared/const.ts`: Enriquecido `VECY_COMMISSION_MODEL` con `directSaleWithVecyTechPct: 80`, `gracePeriodDays: 5`, y doctrina `antiBypassTelemetry`; versión bump a `v32.65`.
     - `package.json`: Versión `32.65.0`.
     - `server/_core/emailContractService.ts`: Generación criptográfica con `qrcode` y `node:crypto`, caja de seguridad con QR en PDF y CUV en pie de página.
     - `server/_core/prompts/grupos/PROYECTO_Vecy Network.md` y `server/_core/cronService.ts`: System prompts actualizados con la doctrina 80/20 y telemetría.
     - `server/__tests__/emailContractService.test.ts`: Nuevo test unitario. 159/159 tests pasando al 100%. `tsc --noEmit` 0 errores y `pnpm build` limpio.

## 🔖 VERSIÓN ANTERIOR: v32.64 — Octubre 2026

### Novedades v32.63 (Bolsa Inmobiliaria Colaborativa de Marca Blanca, Concisión Máxima de Grupos Oficiales, Doctrina Punta Colocadora en Vecy Agenda y los 6 Grandes Beneficios Oficiales):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Descripciones Sintéticas, Elegantes y Directas en WhatsApp**:
     - Adaptadas para lectura rápida en teléfonos móviles sin perder ningún principio institucional.
     - **Grupo 1**:
       * `2️⃣ PUBLICIDAD VISUAL Y FLYERS`: Flyers, banners comerciales, pósters y fotos con información de la demanda o la oferta.
       * `4️⃣ ENLACES DE TODO TIPO`: Enlaces web, tours virtuales 360°, videos de YouTube y TikTok, carpetas en la nube y redes sociales que contengan publicidad inmobiliaria, **siempre y cuando vengan acompañados esos enlaces de la información y ficha correspondiente**. JanIA almacena la data y adjunta el enlace para inspección humana en la mesa de coincidencias.
  2. **Doctrina de la Punta Colocadora y Resultados Seguidos**:
     - El **40% de la Punta Colocadora** se asegura al presentar formalmente al comprador a través de **Vecy Agenda** y acompañar el cierre.
     - Superación del 50/50 tradicional: frente al temor inicial del gremio, la promesa innegociable de VECY BIENES RAÍCES es que adoptarán el modelo con entusiasmo porque generará **resultados rápidos y seguidos**, cerrando negocios continuamente en lugar de esperar meses.
  3. **Bolsa Inmobiliaria Colaborativa VECY y Marca Blanca**:
     - El 10% de la bolsa intermedia se reparte entre los agentes difusores según métricas de telemetría por compartir enlaces limpios de Marca Blanca (sin logos ni teléfonos de VECY).
     - Si el agente difusor además coloca al cliente final, gana el 40% de la colocación MÁS su liquidación en dinero por puntos de la Bolsa.
  4. **Los 6 Grandes Beneficios Oficiales del Agente Inmobiliario**:
     1. **Ingreso 100% Gratuito y Cero Cuotas:** Sin pagos mensuales ni anualidades obligatorias.
     2. **Publicación Ilimitada:** Ofertas y Demandas ilimitadas con tienda y panel de administración propio.
     3. **Motor con Inteligencia Artificial:** Matches ultrarrápidos entre ofertas y requerimientos.
     4. **Acceso Pleno a "Vecy Agenda" con IA:** Sistema de reserva con IA que verifica al visitante interesado al instante y contesta correos automáticamente.
     5. **Chat Web 24/7 con JanIA:** Consultas en tiempo real, asesoría y redacción de documentos blindados en minutos.
     6. **Estudio de Títulos y Trámites Gratuitos en Línea:** Asesoría documental y trámites gratuitos en línea de Predial, Paz y Salvos del Predial y del IDU.
  5. **Modificaciones Implementadas**:
     - `shared/const.ts`: Declarado `VECY_AGENT_BENEFITS` con los 6 beneficios; enriquecido `VECY_COMMISSION_MODEL` con la Bolsa Colaborativa de Marca Blanca; descripciones de grupos en `VECY_OFFICIAL_GROUPS` condensadas, concisas y directas; versión bump a `v32.63`.
     - `package.json`: Versión actualizada a `32.63.0`.
     - `server/_core/prompts/grupos/PROYECTO_Vecy Network.md` y `server/_core/cronService.ts`: System prompts actualizados con los 6 beneficios gratuitos, el rol de Vecy Agenda y la pedagogía hacia resultados ágiles y repetitivos.
     - 158/158 tests Vitest pasando al 100%. `tsc --noEmit` 0 errores y `pnpm build` 100% limpio.

## 🔖 VERSIÓN ANTERIOR: v32.62 — Octubre 2026

### Novedades v32.61 (Modelo Colaborativo Oficial 40/20/40 de VECY BIENES RAÍCES, Formatos Permitidos en Grupos Oficiales: Flyers, Banners, PDFs, Enlaces, Permutas y Pedagogía hacia el Súper Portal):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Doctrina del Modelo Colaborativo 40 / 20 / 40**:
     - **40% Punta Captadora**: Quien captó y subió el inmueble al portal tiene su 40% asegurado y respetado.
     - **20% Bolsa de Aceleración y Soporte**: Dividido matemáticamente en:
       - **10% para la Red Colaborativa**: Agentes promotores que viralizan el enlace único parametrizado (marca blanca) según sus puntos de engagement/clicks únicos.
       - **10% para VECY BIENES RAÍCES**: Plataforma tecnológica, algoritmo de matches de JanIA, soporte legal, notarial y contratos.
     - **40% Punta Colocadora**: Quien consigue al comprador, lo presenta para agendamiento de visitas por la plataforma y cierra el negocio.
     - **Por qué supera al 50/50 y al 100%**: Erradica las **tercerías deshonestas** (intermediarios fantasmas que entorpecen negociaciones), protege a captador y colocador, y prepara pedagógicamente a los agentes de cara al futuro lanzamiento del SÚPER PORTAL INMOBILIARIO VECY BIENES RAÍCES.
  2. **Formatos Permitidos y Alentados en Grupo 1**:
     - Se admiten y estimulan: Ofertas, Demandas y **Permutas / Venpermutas**.
     - Material publicitario: Flyers, banners publicitarios, pósters y fotos comerciales de inmuebles.
     - Documentos técnicos: Brochures, dossiers y fichas técnicas completas en formato PDF.
     - Enlaces inmobiliarios: Tours virtuales 360°, enlaces a portales, Google Drive o webs de inmuebles.
     - JanIA reacciona en tiempo real con matriz de 6 emojis: `👍` Venta | `👌` Arriendo | `🔀` Permuta oferta | `📝` Demanda venta | `✏️` Demanda arriendo | `🔄` Demanda permuta.
     - Moderación estricta de off-topic: memes, cadenas de texto, política, religión, pornografía o estafas son amonestados y eliminados inmediatamente.
  3. **Modificaciones Implementadas**:
     - `shared/const.ts`: Añadido `VECY_COMMISSION_MODEL` con el desglose exacto 40/20/40; descripciones oficiales de grupos enriquecidas; versión bump a `v32.61`.
     - `package.json`: Versión actualizada a `32.61.0`.
     - `server/_core/prompts/grupos/PROYECTO_Vecy Network.md` y `server/_core/cronService.ts`: Sistema de prompts del LLM actualizado con la doctrina del modelo 40/20/40 y pedagogía hacia el súper portal.
     - `VECY_CORE_PROYECTO/documentos_maestros/vecy_network_technical_dossier.md`: Secciones 4 y 5 y Sección 10 (Changelog) actualizadas.
     - 158/158 tests Vitest pasando al 100%. `tsc --noEmit` 0 errores y `pnpm build` 100% limpio.

## 🔖 VERSIÓN ANTERIOR: v32.60 — Octubre 2026

### Novedades v32.60 (JanIA Coach y Docente Inmobiliaria de Élite, Encuestas Nativas Interactivas con Emojis, Auto-Aprobación de Grupos, Tarjetas VCard y Moderación Estricta):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Doctrina y Aclaración de Eduardo**:
     - **Encuestas Nativas Interactivas**: Eduardo aclaró que nunca pidió eliminar los emojis, sino erradicar para siempre el formato de texto plano con viñetas numéricas `1️⃣ 2️⃣ 3️⃣ 4️⃣` (como en la Imagen 1). Las encuestas deben enviarse exclusivamente con la herramienta nativa interactiva de WhatsApp (`pollCreationMessage`), con botones táctiles de selección (`selectableCount: 1`), y con emojis libres, profesionales y atractivos (como en la Imagen 2).
     - **JanIA como Coach, Conferencista y Docente de Élite**: JanIA asume un rol protagónico de formación y liderazgo educativo para agentes inmobiliarios en Colombia. Sus difusiones de las 10:00 AM abordan con rigurosidad: marketing de video vertical (Reels/TikTok), narrativa emocional, doctrina sobre corretaje sin firma (no buscar pleitos + alternativa tecnológica de correo formal con valor probatorio de firma electrónica por contestación como en VECY, registro y presentación de cliente), perfilamiento de compradores, alianzas 50/50 transparentes, hipotecas con particulares y alianza estratégica con Banco Caja Social, minutas y cobro prejurídico de cartera.
     - **Descripciones Oficiales de Grupos**: Declaradas con claridad que son grupos atendidos, controlados y administrados por nuestra IA (JanIA, agente IA de VECY BIENES RAÍCES), con advertencia categórica de moderación y eliminación inmediata de cualquier foto, meme, PDF, audio o enlace off-topic.
     - **Nuevas Herramientas Interactivas**:
       - Auto-aprobación periódica (cada 5 min) y en tiempo real de participantes que solicitan unirse a los grupos oficiales.
       - Envío de tarjeta interactiva de contacto (VCard de WhatsApp) cuando un usuario solicita el contacto de JanIA o del Bróker Oficial (+57 316 656 9719).
       - Promoción del agendamiento profesional y formularios interactivos.
  2. **Modificaciones Implementadas**:
     - `shared/const.ts`: `VECY_OFFICIAL_GROUPS` enriquecido con descripciones oficiales completas; versión bump a `v32.60`.
     - `package.json`: Versión actualizada a `32.60.0`.
     - `server/_core/whatsapp-match.ts`: Implementados `sendContactCard` (VCard interactiva), `approvePendingGroupRequests` (auto-aprobación en evento y cron), e interceptores de solicitud de contacto. Exportado alias `whatsappBot`.
     - `server/_core/cronService.ts`: `WEEKLY_POLLS_LIST` con emojis interactivos (Semana 1 idéntica a la Imagen 2), `publishWeeklyPoll` 100% nativa sin fallback de texto, y `generateCalendarDailyText` con visión de Coach inmobiliaria de élite.
     - 158/158 tests Vitest pasando al 100%. `tsc --noEmit` 0 errores y `pnpm build` 100% limpio.

## 🔖 VERSIÓN ANTERIOR: v32.59 — Octubre 2026

### Novedades v32.59 (Rebranding Integral a VECY BIENES RAÍCES, Encuestas Nativas de 1 Opción al Canal sin Emojis, Difusión Diaria con Imágenes Públicas de Internet y Cero Audios):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Doctrina de Eduardo**:
     - **Rebranding Completo**: Se erradicó toda denominación pública de "VECY NETWORK" en favor de **VECY BIENES RAÍCES**, con el lema:
       *VECY*
       *BIENES RAÍCES*
       *La evolución inevitable para el sector de los bienes raíces.*
     - **Nombres Oficiales de Grupos de WhatsApp**:
       - Grupo 1: `𝗩𝗘𝗖𝗬 𝗜𝗡𝗠𝗢🏠 𝗢𝗙𝗘𝗥𝗧𝗔𝗦🏷️ 𝗬 𝗗𝗘𝗠𝗔𝗡𝗗𝗔𝗦📝 𝗖𝗢𝗟𝗢𝗠𝗕𝗜𝗔🇨🇴` (100% transaccional de inmuebles y demandas, amonestación + borrado automático de off-topic).
       - Grupo 2: `𝗩𝗘𝗖𝗬 𝗧𝗜𝗣𝗦💡/𝗡𝗢𝗧𝗜𝗖𝗜𝗔𝗦📰/𝗖𝗢𝗡𝗦𝗨𝗟𝗧𝗔𝗦 𝗜𝗡𝗠𝗢𝗕𝗜𝗟𝗜𝗔𝗥𝗜𝗔𝗦⁉️🏠` (Consultas públicas, tips, valor de m², debates libres).
       - Grupo 3: `𝗣𝗥𝗢𝗬𝗘𝗖𝗧𝗢: 🌐 "𝗩𝗘𝗖𝗬𝗕𝗜𝗘𝗡𝗘𝗦𝗥𝗔𝗜𝗖𝗘𝗦"🚀` (Comunidad, foros, modelo colaborativo y alianzas).
     - **Encuesta Semanal Nativa**:
       - Exclusiva del Canal Oficial de WhatsApp los Lunes a las 08:00 AM.
       - Herramienta nativa interactiva de WhatsApp (`pollCreationMessage`).
       - Votación de UNA SOLA RESPUESTA (`selectableCount: 1`).
       - **CERO EMOJIS** en preguntas ni opciones. Jamás se envía a los grupos.
     - **Invitaciones Periódicas desde el Canal hacia los Grupos**:
       - Días y horas separados de la encuesta: Miércoles 16:30 (Grupo 1), Jueves 16:30 (Grupo 2), Viernes 16:30 (Grupo 3).
       - Mensajes estructurados y enlaces separados para no confundir a la audiencia.
     - **Difusión Diaria de Tips / Noticias (10:00 AM)**:
       - Hacia Grupo 2, Grupo 3 y Canal Oficial.
       - **CERO AUDIOS** (sin notas de voz TTS).
       - **CON IMÁGENES PÚBLICAS DE INTERNET**: Búsqueda en la red vía Openverse API de fotografías comerciales de arquitectura e inmuebles bajo licencia comercial/CC0, rotadas sin repetir.
  2. **Modificaciones Implementadas**:
     - `shared/const.ts`: `VECY_BRAND` y `VECY_OFFICIAL_GROUPS` centralizados, versión bump a `v32.59`.
     - `package.json`: Versión actualizada a `32.59.0`.
     - `server/_core/whatsapp-match.ts`: Implementados `sendPoll`, `sendDailyTipToGroupsAndChannel` y moderación de Grupo 1.
     - `server/_core/cronService.ts`: `WEEKLY_POLLS_LIST` sanitizada sin emojis, `fetchPublicThemeImage` con Openverse API, `publishChannelGroupInvitation` y crons programados.
     - Prompts y routers actualizados a "VECY BIENES RAÍCES".
     - 157/157 tests Vitest pasando al 100%.

## 🔖 VERSIÓN ANTERIOR: v32.58 — Octubre 2026

### Novedades v32.57 (Extracción y Validación de Condominios/Conjuntos/Edificios Específicos, Fidelidad Textual Absoluta de Alcobas y Bloqueo Doctrinal de Escala):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Causa Raíz de Falso Match #15449 (86.25% score)**:
     - Oferta #3715 (Rosales, 470m²): Publicación original textualmente decía `- 3 Alcobas - 4 Baños - 4 Garajes`, pero en la base de datos se guardó erróneamente `bedrooms = 4` por alucinación de extracción asociada a los 4 baños/garajes.
     - Demanda #2054: Solicitaba textualmente `Apto en Peñas blancas 4 habitaciones. $6.000 millones maximo`.
     - Faltaban dos mecanismos doctrinales vitales:
       a) Identificar el edificio/condominio específico ("Peñas Blancas") y cotejarlo contra la oferta.
       b) Respetar estrictamente el número textual de alcobas (`- 3 Alcobas`) sobre cualquier alucinación en BD, y bloquear inmediatamente con 0% cuando la oferta tiene menos alcobas que las exigidas.
  2. **Soluciones Doctrinales Implementadas**:
     - **Módulo Compartido de Extracción de Edificios/Condominios (`shared/colombianRealEstateParser.ts`)**:
       - Creada función `extractBuildingOrComplex(rawText, title)` con base de conocimiento de condominios y edificios insignes colombianos (Peñas Blancas, Torres del Parque, Sierras del Este, Cerros de los Alpes, Ruitoque, Bosque Medina, Sindamanoy, Aposentos, etc.) y patrones arquitectónicos (`Edificio`, `Conjunto Residencial`, `Condominio Campestre`, `Torres`, etc.).
       - Normaliza títulos con conectores en minúscula (`Torres del Parque`, `Bosques de Bella Suiza`).
     - **Cotejo en Mesa de Coincidencias (`AdminMatches.tsx`)**:
       - Nueva fila de cotejo técnico: **Condominio / Conjunto / Edificio**.
       - Si la demanda exige un edificio o condominio específico y la oferta está en un edificio diferente o no lo especifica, emite la advertencia o deducción de rigor; si ambos coinciden exactamente, marca `exact` 🟢 con 100% de afinidad.
     - **Motor de Matching en Backend (`server/_core/matching.ts`)**:
       - En `explicarMatch`: Si la demanda exige un edificio específico y la oferta tiene otro edificio incompatible, aplica guillotina fulminante a 0% (`⛔ Incompatibilidad de Edificio/Condominio (Tolerancia Cero)`).
       - Fidelidad absoluta al texto original de la oferta para alcobas: extrae directamente `- X Alcobas` del texto de la propiedad para corregir alucinaciones numéricas.
     - **Ingesta en JanIA (`server/_core/janIA.ts`)**:
       - En `saveProperty`: si el texto original declara explícitamente el número de alcobas, prevalece sobre cualquier conteo discordante del LLM.
     - **Saneamiento en Base de Datos de Producción (VPS `13.140.149.144`)**:
       - Corregida Propiedad #3715 a `bedrooms = 3` (alineada con su texto `- 3 Alcobas`).
       - Colapsado Match #15449 a `matchScore = 0.00` y `status = 'rejected'`.
       - Verificado 0 matches espurios con `bedrooms < habitacionesMin` en producción.
  3. **Verificación y Cobertura**:
     - Nuevos tests doctrinales en `server/__tests__/regression.test.ts`.
     - 154/154 tests Vitest pasando al 100%. TypeScript (`pnpm check`) y Vite/esbuild (`pnpm build`) 100% limpios.

## 🔖 VERSIÓN ANTERIOR: v32.56 — Octubre 2026

### Novedades v32.56 (Regla Doctrinal Sagrada de Casillas 1 a 5 Núcleo Duro Innegociable, Erradicación de Nombres de Ciudad como Barrio y Guillotina Total al 0.00%):
- **Diagnóstico y Confirmación Doctrinal de Eduardo A. Rivera**:
  1. **Causa Raíz de Falsos Matches Geográficos (Caso Match #15447 - 80% score)**:
     - Eduardo alertó con indignación sobre el Match #15447 entre la Oferta de Kath (+57 305 300 1525, Propiedad #4867 "Apartment en Bogotá para venta") y la Demanda de German Tejada (+57 321 229 5348, Requerimiento #2222 "Requerimiento de inmueble en Bogotá para venta").
     - Ninguna de las dos publicaciones mencionaba un barrio en su texto original.
     - La lógica de fallback previa en `saveProperty` y `saveRequirement` asignaba `data.city || "Bogotá"` al campo `zone` o `zonaDeseada` cuando no se encontraba barrio, guardando `"Bogotá, D.C."` en PostgreSQL.
     - En la mesa de coincidencias (`AdminMatches.tsx`), la fila *Barrio / Vereda / Caserío* mostraba `"Bogotá, D.C."` en oferta y demanda y marcaba `exact` ("Coincide" 🟢), y la fila *Localidad / Comuna* mostraba `N/E vs N/E` y también se marcaba como verde, inflando artificialmente el score al 80%.
  2. **Doctrina Innegociable de Eduardo**:
     - Un MATCH JAMÁS puede existir si las primeras 5 casillas del cotejo técnico:
       1. *Tipo de Inmueble*
       2. *Tipo de Negocio*
       3. *Barrio / Vereda / Caserío*
       4. *Localidad / Comuna*
       5. *Ciudad / Municipio*
       no están 100% llenas con sus respectivos nombres legítimos (NUNCA nombre de ciudad como barrio, NUNCA N/E) y coinciden al 100% (`status === "exact"` / "Coincide" 🟢).
     - Si CUALQUIERA de estas 5 falla, tiene N/E o no coincide al 100%, **NO HAY MATCH DE NINGUNA CATEGORÍA O PORCENTAJE (Guillotina Total a 0.00%, bloqueo absoluto y exclusión de la mesa de coincidencias)**.
     - Prohibición estricta de alterar cualquier otra fila (filas 6 en adelante) sin instrucción explícita.
  3. **Soluciones Doctrinales Implementadas**:
     - **Módulo Compartido de Purificación Geográfica (`shared/colombianRealEstateParser.ts`)**:
       - Implementadas funciones unificadas `extractPureBarrio(zn)` e `isCityOrGenericZone(zn)`.
       - Detectan y neutralizan estrictamente nombres de ciudades ("Bogotá", "Bogotá, D.C.", "Cali", "Medellín", etc.), departamentos, país y términos genéricos/cardinales ("Norte", "Sur", "Zona Norte", "N/E").
       - Extraen barrios legítimos limpios cuando vienen acompañados de la ciudad (ej: `"Chicó, Bogotá"` -> `"Chicó"`).
     - **Re-exportación y Blindaje en Backend (`server/_core/geography.ts` y `server/_core/matching.ts`)**:
       - En `explicarMatch`: se exige `extractPureBarrio` tanto en oferta como en demanda. Si cualquiera carece de barrio legítimo o contiene nombre de ciudad, se emite blocker fulminante (*⛔ Inmueble/Requerimiento Incompleto: Barrio/Vereda no especificado o contiene nombre de ciudad (N/E)*) y se retorna `0.00%`.
       - En `matchesGeography`: bloqueo absoluto inmediato a `{ matches: false, score: 0 }` si alguna zona es genérica o nombre de ciudad.
     - **Ingesta Limpia en JanIA (`server/_core/janIA.ts`)**:
       - Eliminado cualquier fallback de ciudad en `zone` y `zonaDeseada`. Si no hay barrio explícito, se guarda `"N/E"`, respetando constraints de BD y evitando contaminación.
     - **Mesa de Coincidencias en Frontend (`AdminMatches.tsx`)**:
       - Barrio sin especificar se muestra limpiamente como `"N/E (No especificado)"` (jamás "Bogotá, D.C." y jamás "Flexible / Bogotá").
       - `barrioMatchStatus`: strictly requires both to have legitimate non-generic neighborhoods and match 100% -> `exact` 🟢, otherwise `missing` 🔴.
       - `localityMatchStatus`: strictly requires both to be filled (non-N/E) and match 100% -> `exact` 🟢, otherwise `missing` 🔴. N/E vs N/E jamás es coincidencia.
       - `cityMatchStatus`: strictly requires both to be non-N/E and match 100% -> `exact` 🟢, otherwise `missing` 🔴.
       - En `scoreRows`: Regla Doctrinal de Casillas 1 a 5: si cualquiera de las 5 no está 100% llena o `status !== "exact"`, se marca `missing` y `autoScore` colapsa inmediatamente al **0.00%**.
     - **Saneamiento en Base de Datos de Producción (VPS `13.140.149.144`)**:
       - `ALTER TABLE properties ALTER COLUMN zone DROP NOT NULL; ALTER TABLE properties ALTER COLUMN zone SET DEFAULT 'N/E';`
       - Actualizadas 1,185 propiedades con ciudad en `zone` a `'N/E'`.
       - Actualizados 202 requerimientos con ciudad en `zonaDeseada` a `'N/E'`.
       - Colapsados 31 matches inviables previos (incluyendo Match #15447) a `matchScore = 0.00` y `status = 'rejected'`.
  4. **Verificación y Cobertura**:
     - Agregado test específico `Doctrina v32.56` en `server/__tests__/regression.test.ts`.
     - Suite completa de 152/152 tests vitest aprobados al 100%. `pnpm check` (tsc) limpio con 0 errores. `pnpm build` limpio.

## 🔖 VERSIÓN ANTERIOR: v32.55 — Octubre 2026


### Novedades v32.55 (Restauración de Guillotina Total Doctrinal al 0.00% ante Casillas en 'No Coincide' / 'No Cumple', Blindaje de Administración en Backend y Mesa de Coincidencias):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Causa Raíz de Falsos Positivos con Casilla "No Cumple" en la Mesa de Coincidencias**:
     - Eduardo alertó que en la mesa de coincidencias se listó el Match #15445 (92% afinidad por IA) entre la demanda de Génesis Cabarcas (Requerimiento 1229) y la oferta de Rosana Romero (Propiedad 2929), pero al desplegar la tabla de cotejo técnico, la casilla "Valor admin" figuraba en rojo como `No cumple`:
       - Demanda: `≤ $1.400.000 Max.`
       - Oferta: `$1.800.000 / mes`
     - Se diagnosticaron dos causas raíz críticas:
       1. **Frontend (`AdminMatches.tsx`)**: En `scoreRows`, una refactorización previa había restringido la guillotina absoluta a un set parcial (`HARD_CRITERIA_LABELS`). Cuando casillas fuera de ese set (como "Valor admin", "Habitaciones", "Baños", "Parqueaderos", "Estrato", "Tipología de Cocina", "Antigüedad", "Vista", "Piso", etc.) marcaban `missing`, se aplicaba una deducción cosmética de `(weight * 0.90)` (apenas ~4.5 puntos), dejando el score en 91.77% y permitiendo que se mostrara en la mesa con 92%.
       2. **Backend (`matching.ts` y `janIA.ts`)**: La expresión regular para extraer presupuestos de administración exigía que los dos puntos `:` estuvieran DESPUÉS de `máxima/max`. Como en el mensaje original decía `🏢 Administración: Máximo $1.400.000` (los `:` antes de `Máximo`), la regex retornó `null`, guardando `adminFeeMax = NULL` en PostgreSQL y evaluando el match en 92.49% en el backend.
  2. **Soluciones Doctrinales Implementadas**:
     - **Restauración de la Guillotina Total en Frontend (`AdminMatches.tsx`)**: Se erradicó `HARD_CRITERIA_LABELS` y su deducción blanda. Si CUALQUIER casilla evaluable del cotejo resulta en `missing` (🔴 "No Coincide" / "No Cumple"), el `autoScore` colapsa inmediatamente al **0.00%** (`hasAnyMissingRow`). El filtro `effectiveScore < 80` lo excluye de inmediato de la mesa de coincidencias. Cero falsos positivos.
     - **Extracción Universal de Administración con `parseAdminFee` (`matching.ts` y `janIA.ts`)**: Se integró `parseAdminFee` de `shared/colombianRealEstateParser.ts` tanto en la extracción de requerimientos de JanIA como en el motor de matching, reconociendo topes de administración sin importar la posición de los dos puntos o emojis.
     - **Guillotina Financiera en Backend**: Si la cuota de oferta supera el máximo demandado, el backend aplica guillotina fulminante al **0.00%** descartando el match antes de escribir en PostgreSQL.
     - **Saneamiento en Producción**: Actualizado Requerimiento #1229 con `adminFeeMax = 1400000.00` y marcado Match #15445 como `rejected` con score `0.00%`.
  3. **Verificación y Cobertura**:
     - Agregados tests unitarios en `server/__tests__/perfect_100_match.test.ts`.
     - Suite completa de 151/151 tests vitest aprobados al 100%. TypeScript y build limpios con 0 errores.

## 🔖 VERSIÓN ANTERIOR: v32.54 — Octubre 2026

### Novedades v32.54 (Optimización Persuasiva de Google Review, Gatillo de Gratuidad, Micro-Esfuerzo 15s y Supresión de Emojis Competidores):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Causa Raíz de Cero Reseñas y Falta de Engagement en Google Reviews**:
     - Eduardo detectó que el mensaje final de servicio de JanIA en WhatsApp no estaba generando comentarios ni calificaciones en Google Reviews.
     - Se diagnosticaron tres causas de fondo:
       1. **Copy institucional egocéntrico**: El texto anterior decía *"Es muy importante para nosotros"*, lo cual no ofrece ningún incentivo personal al usuario ocupado.
       2. **Conflicto y saturación por doble llamado a la acción**: JanIA enviaba en ráfaga el mensaje de emojis de recomendación (`VIRAL_LOOP_MESSAGE`: `😃 ¿Qué tanto nos recomendarías? 👎 | 👍 | ❤️`) e inmediatamente después el de Google Reviews. Dos acciones distintas dividían la atención del usuario y paralizaban la conversión.
       3. **Fricción cognitiva de tiempo**: No se comunicaba el tiempo requerido, haciendo pensar al usuario que calificar tomaría minutos de redacción.
  2. **Solución Doctrinal Implementada (Opción 1 Afinada)**:
     - Se adoptó el copy persuasivo validado por Eduardo con gatillo de reciprocidad y aversión a la pérdida:
       `⭐ ¿Podrías darnos tu opinión y calificar nuestro servicio? Así nos ayudas para que siga siendo *GRATIS.*`
       `*COMENTA Y CALIFICA AQUÍ (solo te toma 15 segundos):*`
       `👉 https://g.page/r/CctNbwU6UpX5EBM/review 👍 Gracias`
       `¡Que tengas una excelente jornada y muchos éxitos en tus cierres! 🏢✨`
     - **Supresión de `VIRAL_LOOP_MESSAGE`**: Se eliminó el envío redundante de los emojis de recomendación en los flujos de predial y verificación de identidad en [`server/_core/whatsapp-match.ts`](file:///home/eddu/Proyectos/vecy-network/server/_core/whatsapp-match.ts), dejando un único llamado a la acción claro y sin competencia.
     - **Pausa natural de despacho (1500ms)**: Se introdujo una pausa orgánica antes de enviar la invitación a calificar, permitiendo que el usuario primero reciba e inspeccione su PDF o reporte antes de recibir la invitación.
  3. **Verificación y Cobertura**:
     - Actualizadas constantes en [`server/_core/predialService.ts`](file:///home/eddu/Proyectos/vecy-network/server/_core/predialService.ts), [`shared/const.ts`](file:///home/eddu/Proyectos/vecy-network/shared/const.ts) y [`package.json`](file:///home/eddu/Proyectos/vecy-network/package.json).
     - Suite de pruebas con 128/128 tests vitest aprobados al 100%.

## 🔖 VERSIÓN ANTERIOR: v32.53 — Octubre 2026

### Novedades v32.53 (Memoria Temporal del Mismo Día hasta las 23:59 Bogotá, Erradicación de Re-Saludos/Re-Perfilamiento, Identidad de Línea +573192919978 y Pedagogía de Emojis de Grupos):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Memoria Temporal del Día en Curso (Hasta las 23:59 Bogotá)**:
     - Eduardo instruyó que JanIA debe mantener el hilo conversacional recordando todo lo hablado en el mismo día calendario (hasta las 23:59:59 hora Bogotá).
     - Se identificó que `appendDmHistory` limitaba la memoria a solo 8 turnos en RAM y no persistía inmediatamente los mensajes del usuario en la tabla `messages` de PostgreSQL.
     - **Solución Doctrinal**:
       - Creada función `getStartOfTodayBogota` para anclar el historial al inicio del día calendario en curso de Bogotá (UTC-5).
       - Memoria en RAM ampliada a **24 turnos**.
       - En `whatsapp-match.ts` se implementó `await this.logToDb(senderId, 'user', body)` de forma inmediata para que cada mensaje del usuario quede respaldado en PostgreSQL.
       - En `getOrLoadDmHistory` se consulta la BD recuperando hasta 24 mensajes del día si PM2 se reinicia.
  2. **Continuidad del Hilo y Erradicación de Re-Saludos y Re-Perfilamiento**:
     - En conversaciones activas (como el caso de Ricardo Castillo Fraiz respondiendo *"En el que ya tengan"*), JanIA volvía a saludar formalmente y a preguntar a qué se dedicaba.
     - **Solución Doctrinal**:
       - Si `hasPriorHistory` es verdadero (hay historial previo hoy), queda **TERMINANTEMENTE PROHIBIDO saludar de nuevo** ("Hola", "Qué gusto saludarte", "Es un placer") y **TERMINANTEMENTE PROHIBIDO volver a preguntar a qué se dedica**.
       - JanIA debe dar continuidad inmediata al contexto respondiendo directo sobre las alternativas o inmuebles discutidos.
       - Se amplió el historial inyectado al LLM a **14 turnos** y se reforzó la regex de limpieza para barrer saludos residuales.
  3. **Identidad Oficial de la Línea WhatsApp (`+573192919978`)**:
     - Eduardo cambió el nombre de usuario a JanIA (`@JanIA_agente_IA_de_VECY`).
     - Cuando los colegas pregunten si es Eduardo, JanIA aclara cordialmente que es JanIA, la Inteligencia Artificial de Vecy Bienes Raíces, y proporciona la línea oficial de atención bróker de los directores Eduardo A. Rivera y Jani Alves: **`+573166569719`**.
  4. **Pedagogía Completa de Reacciones y Emojis en Grupos Inmobiliarios**:
     - JanIA explica por qué reacciona: confirma visualmente que leyó la publicación, extrajo todos los datos, los guardó en la base de datos de VECY Network y los mantiene en monitoreo para MATCH.
     - **Significado exacto de los 6 emojis**:
       - 👍: OFERTA tradicional captada (Venta/Arriendo sin permuta).
       - 👌: OFERTA con opción de PERMUTA (Venta/Permuta).
       - 🔀: OFERTA en permuta pura o intercambio.
       - 📝: DEMANDA tradicional captada (Compra/Arriendo sin permuta).
       - ✏️: DEMANDA con opción de PERMUTA.
       - 🔄: DEMANDA en permuta pura o intercambio.
     - **Alerta de MATCH**: Si hay coincidencia, JanIA reporta internamente a Eduardo y Jani, y un asesor comercial de Vecy Bienes Raíces se contactará directamente con el colega.
  5. **Regla Sagrada sobre Comisiones y Tercería (DOCTRINA EDUARDO)**:
     - Se trabaja en tercería para compartir la comisión del 3% (1/1/1 o 40/20/40 sobre ese 3%).
     - **REGLA DE ORO**: JanIA **JAMÁS** debe adelantarse a fijar, mencionar ni imponer esquemas ni porcentajes de comisión de entrada. Debe esperar a que sea el agente/colega quien proponga cómo acepta compartir la comisión, o permitir que el asesor humano de Vecy Bienes Raíces lo concrete en la llamada comercial.

## 🔖 VERSIÓN ANTERIOR: v32.52 — Octubre 2026

### Novedades v32.52 (Sincronización de Comunidades y Administradores VIP, Resolución de Timeout en Grupos Masivos y Liberación de Caché en Reacciones Fallidas):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Confirmación de Comunidades y Administradores Inmobiliarios VIP**:
     - Eduardo suministró la lista oficial de administradores y grupos comunitarios:
       - **Armando Cortés** (`+573003600006`): `+ $Mil Millones`, `Requerimientos Colombia`, `Campestre venta, arriendo`, `Arriendos+ $8 millones`.
       - **Julieth Martínez** (`+573123112205`) & **Victoria Jiménez** (`+573132411598`): `Cedritos-Colina-Salitre-Alrededores`, `Ofertas VENTA 1000`, `Requerimientos 1000`, `Santas-Carolina-Bosques-Calleja`, `Rosales-Cabrera-Nogal-Virrey-Chico`.
       - **Camilo Sanabria** (`+573115142754`): `BODEGAS Y LOTES`.
       - **Moisés Rojas** (`+573044233410`) & **Dahianna Castro** (`+573156011720`): `APARTAESTUDIOS BOGOTA`.
       - **Nancy Zamorano** (`+573177838635`): `En casa gestión Inmobiliaria`.
       - **Lia Janeth Rivas** (`+573103055109`), **Carolina Rodríguez** (`+573212857044`) & **Caro Rodriguez** (`+1 (407) 509-6206`): `Requerimientos Inmuebles Bogotá y Sabana` + 16 grupos de Caro Rodríguez.
       - **ANDRES NIETO** (`+573208626787`): 28 grupos de la Red de Asesores Inmobiliarios Andrés Nieto.
       - **Nubia Hernández** (`+573124311307`): `SOLO ARRIENDOS 🏠🏠🏠`.
     - Se auditó empíricamente contra los 80 grupos activos en el socket de Baileys (`+573192919978`), certificando que **TODOS los grupos de Armando Cortés, Julieth Martínez, Victoria Jiménez, Camilo Sanabria, Moisés Rojas, Dahianna Castro, Nancy Zamorano, Lia Janeth, Carolina Rodríguez y Andrés Nieto están 100% conectados y en la línea**.
     - El único grupo donde la línea no participa actualmente es `SOLO ARRIENDOS 🏠🏠🏠` (salió el 28 de julio de 2026; pendiente que Nubia re-agregue la línea).
  2. **Causa Raíz de Omisión en Grupos Masivos (Timeout 3s y Bloqueo en Caché)**:
     - En grupos de 800 a 960 miembros (`Rosales-Cabrera`, `Requerimientos 1000`, `Ofertas 1000`, `Requerimientos Bogotá y Sabana`, `Sabana Norte`), Baileys requiere entre 4 y 7 segundos para distribuir las claves `senderKeyDistributionMessage` a todos los miembros.
     - El timeout previo de 3s abortaba la reacción con `Timeout 3s reacción`.
     - Además, como `this.reactedMessageIds` registraba el mensaje antes del envío, cuando `sendMessage` fallaba no se liberaba de memoria, provocando que el posterior `BUFFER-REACT` omitiera el mensaje creyendo erróneamente que ya había reaccionado.
  3. **Solución Doctrinal Implementada**:
     - Se amplió el timeout de despacho en `safeReact` de 3s a **10s** (`Timeout 10s reacción`).
     - Si un envío falla por timeout o error de sesión, se ejecuta inmediatamente `this.reactedMessageIds.delete(msgId)` para que el `BUFFER-REACT` complete la reacción limpiamente.
     - Se incorporó `VIP_COMMUNITY_ADMIN_PHONES` e `isVipRealEstateGroup` en [`server/_core/whatsapp-match.ts`](file:///home/eddu/Proyectos/vecy-network/server/_core/whatsapp-match.ts) para asignar contexto 100% inmobiliario sin requerir whitelists manuales.

## 🔖 VERSIÓN ANTERIOR: v32.51 — Octubre 2026

### Novedades v32.51 (Resiliencia E2E Signal contra 'No open session', Descarte Estricto de Reacciones y Ampliación a 15 Minutos en Grupos Inmobiliarios):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Causa Raíz #1: Error 'No open session' de Signal en Comunidades de WhatsApp con LIDs y Multidispositivos**:
     - En comunidades masivas como *"Grupos Caro Rodríguez"* (22 grupos) y *"Red de Asesores Inmobiliarios Andrés Nieto"* (28 grupos), WhatsApp asigna identificadores `@lid` y reporta múltiples dispositivos por asesor.
     - Muchos archivos de sesión en disco (`.baileys_auth/session-*.json`) contenían exclusivamente entradas cerradas (`closed !== -1`). Baileys asumía que la sesión existía, omitía la solicitud de pre-keys a WhatsApp y `libsignal/session_cipher.js` arrojaba `SessionError: No open session`.
     - **Solución Doctrinal**:
       - Interceptor en `state.keys.get`: Si un registro de sesión leído en disco no tiene ninguna sesión abierta, se retorna `null` para forzar a Baileys a solicitar automáticamente pre-keys frescas a WhatsApp.
       - Interceptor en `signalRepository.encryptMessage`: Si un dispositivo secundario o zombi lanza `No open session`, se ejecuta `assertSessions([jid], true)` inmediato. Si aún no abre, se omite ese nodo específico evitando el aborto masivo de la entrega al grupo.
  2. **Causa Raíz #2: Descarte Total de Reacciones de Emojis (`reactionMessage`) y Bucle de Auto-Eco**:
     - Las reacciones a mensajes ajenos generaban eventos `messages.upsert`. Al ser grupos externos (`!isOfficialGroup`), eran catalogadas erróneamente como publicaciones de inmuebles, inundando el buffer y llamando a Gemini LLM con secuencias de emojis ("👍\n\n👌...").
     - Esto saturaba las 5 claves de Gemini provocando errores 503 ("Server Saturation") y timeouts de 25 segundos continuos.
     - **Solución Doctrinal**: Descarte inmediato (`continue`) de `rawMsg.reactionMessage` y de mensajes propios (`fromMe`) en grupos externos, eliminando el 100% del consumo espurio de cuota LLM.
  3. **Causa Raíz #3: Congelamiento Secuencial en la Cola de Reacciones (`safeReact`)**:
     - Cuando una reacción fallaba, `safeReact` realizaba múltiples reintentos con pausas acumulando más de 8 segundos por mensaje fallido, bloqueando la promesa global `reactionQueue`.
     - **Solución Doctrinal**: Si una reacción falla por sesión cerrada, dispara el refresh Signal en segundo plano y libera inmediatamente la cola para continuar con las demás publicaciones sin demoras.
  4. **Causa Raíz #4: Ampliación del Filtro de Antigüedad Histórica de Grupos a 15 Minutos (900s)**:
     - El umbral previo de 180 segundos (3 minutos) provocaba que cualquier retraso por ráfagas o reinicio descartara silenciosamente publicaciones legítimas. Se amplió a 900 segundos (15 minutos).
  5. **Causa Raíz #5: Enriquecimiento de Vocabulario y Contexto de Grupos para FAST-REACT**:
     - Inclusión de sustantivos inmobiliarios comunes ("lotes", "fincas", "bodegas", "casas", "aptos", etc.) combinados con el contexto del nombre del grupo ("OFERTAS", "VENTA", "REQUERIMIENTOS") para activar reacciones instantáneas de negocio (<200ms) sin depender de llamadas pesadas al LLM.

## 🔖 VERSIÓN ANTERIOR: v32.50 — Octubre 2026

### Novedades v32.50 (Limpieza Defensiva de JSON, Tipeo en Vivo / Typewriter Streaming, Aura Giratoria de Alta Velocidad con 3 Puntos Dorados y Ajuste de Padding Inferior en JanIA Console):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Aura Giratoria de Alta Velocidad y Tres Puntos Dorados Bailando (`JanIARealtimeLoader`)**:
     - Eliminados por completo los textos y letreros de estado ("Analizando tu consulta...", "Buscando coincidencias").
     - Diseñado el avatar de JanIA con resplandor orbital giratorio a alta velocidad (`animate-[spin_1.2s_linear_infinite]`) con gradiente cónico de dorado intenso (`#bf953f`, `#ffd700`), azul eléctrico (`#00e5ff`) y verde eléctrico (`#00ff88`), acompañado de un halo de latencia pulsante suave.
     - Al lado, micro-cápsula de cristal ahumado minimalista con los 3 puntitos dorados bailando suavemente (`animate-bounce` con sombra dorada), sin ningún texto ni ruido visual.
  2. **Erradicación Total de Garabatos y Fuga de JSON Schema**:
     - Identificada la causa raíz: cuando Gemini emitía una respuesta extensa con Markdown y comillas, el parser de JSON fallaba y el fallback por regex dejaba campos residuales (`shouldSendDM: false`, `missingFields: []`, etc.) con caracteres de escape literales `\n` y `\"`.
     - Creada función `sanitizeWebChatResponse` en el servidor (`server/routers/janIA.ts`) que limpia cualquier JSON residual y decodifica escapes a texto Markdown puro y limpio.
     - En el frontend (`JanIAConsole.tsx`), incorporada función defensiva `cleanClientMessageText` para limpiar tanto mensajes en vivo como históricos del usuario.
     - En el prompt de chat web se suprimió la exigencia artificial de JSON, permitiendo a Gemini responder en lenguaje humano directo.
  3. **Efecto de Tipeo en Vivo (Typewriter Streaming)**:
     - Implementado componente `TypewriterMessage` que va escribiendo fluidamente la respuesta de JanIA a ritmo acelerado y natural (con cursor dorado palpitante), acompañando el tipeo con auto-scroll suave hacia abajo.
  4. **Solución a Imagen Montada sobre la Burbuja de Escritura**:
     - Se incrementó el padding inferior de la lista de conversaciones de `pb-32` (128px) a `pb-52` (208px) y se añadió espacio inferior a `messagesEndRef`, garantizando que la barra de input flotante inferior jamás tape el último mensaje ni el loader de JanIA.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/routers/janIA.ts`: Creada `sanitizeWebChatResponse`, actualizado prompt y suprimido `responseFormat: json_object`.
  2. `client/src/pages/JanIAConsole.tsx`: Integrados `TypewriterMessage`, `cleanClientMessageText`, aura giratoria tricolor de alta velocidad con 3 puntos dorados, y `pb-52`.
  3. `shared/const.ts` y `package.json`: Versión incrementada a `v32.50` (`32.50.0`).
  4. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.50` aprobado (124/124 tests Vitest al 100%).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 124/124 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 20.30s ✅

## 🔖 VERSIÓN ANTERIOR: v32.49 — Octubre 2026

### Novedades v32.49 (Rediseño de Sidebar Admin & JanIA Console, Animación Neural Soundwave Compacta, Tarjetas de Voz y Documento PDF en Web, y Embudo de Marketing en Canal Oficial):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Rediseño Proporcional del Sidebar de Admin (`Admin.tsx`)**:
     - El logo se amplió de `h-8` a `h-11 w-11` (`44x44px`) con resplandor dorado sutil (`drop-shadow-[0_0_10px_rgba(191,149,63,0.4)]`), compaginando armónicamente con las tres líneas de texto corporativo (`VECY`, `BIENES RAÍCES` y `Panel Admin`).
     - En vistas colapsada y móvil se ajustó la escala para máxima nitidez y presencia de marca.
  2. **Reemplazo de Estrella Parpadeante por Logo Oficial en JanIA Console (`JanIAConsole.tsx`)**:
     - Se suprimió el ícono SVG de estrella de 4 puntas (`VecySparkle`) en la cabecera del menú lateral de JanIA, sustituyéndolo por el logo circular oficial `/logo-vecy.png` con proporción y brillo dorado uniforme.
  3. **Nueva Animación Neural de Pensamiento y Síntesis de Voz (Estilo Gemini Live / Antigravity)**:
     - Se eliminó el recuadro tosco y pesado con textos de terminal falsos y tres puntos saltarines.
     - Se implementó una cápsula compacta flotante (`JanIARealtimeLoader`) con:
       - Avatar de JanIA con halo respiratorio dorado (`breathing glow`).
       - Espectro de onda de audio neuronal dinámico (5 barras doradas animadas con físicas orgánicas).
       - Textos de estado fluidos ("JanIA está pensando...", "Analizando tu consulta...", "Buscando coincidencias y match...").
       - Línea de shimmer láser superior en oro/cyan.
  4. **Reproductor de Notas de Voz Estilo WhatsApp y Tarjeta de Descarga de Documentos en Web**:
     - Al reproducir audios o cuando JanIA habla con su voz femenina (*Laomedeia*), se despliega una cápsula de audio con botón Play/Pause interactivo y barras de onda reactivas.
     - Si la consulta involucra documentos oficiales (Facturas Prediales de Bogotá, Certificados de Pago o archivos PDF), se renderiza una tarjeta interactiva con botón directo de descarga.
  5. **Embudo de Marketing Matutino en Canal Oficial de Vecy (`cronService.ts`)**:
     - Publicación de encuestas matutinas (08:00 AM) directamente en el Canal Oficial de WhatsApp (`@newsletter`), y difusión cruzada en los Grupos 2 y 3 con enlaces de invitación directa (`https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b`).
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `client/src/pages/Admin.tsx`: Logo del sidebar escalado a `h-11 w-11` con tipografía alineada.
  2. `client/src/pages/JanIAConsole.tsx`: Reemplazo de estrella por logo, píldora compacta de carga neural con soundwave, reproductor de voz interactivo y tarjeta de descarga de PDF.
  3. `server/_core/cronService.ts`: Despacho centralizado de encuestas al canal y difusión cruzada a Grupos 2 y 3.
  4. `shared/const.ts` y `package.json`: Versión incrementada a `v32.49` (`32.49.0`).
  5. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.49` aprobado (144/144 tests Vitest al 100%).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 144/144 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 21.77s ✅

## 🔖 VERSIÓN ANTERIOR: v32.48 — Octubre 2026

### Novedades v32.48 (Reactivación de la Voz Humana de Estudio Google Cloud TTS Studio-B / Laomedeia, Service Account de Vecy APP y Blindaje de Presupuesto Mensual):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Ajuste de Presupuesto y Alertas Directas por Correo**:
     - Eduardo ajustó el presupuesto mensual en Google Cloud Billing a $30.000 COP (100%) y $45.000 COP (150%) para amparar el consumo de IA.
     - Se depuró la configuración descartando opciones innecesarias como Pub/Sub (temas programáticos) y canales avanzados de Monitoring, dejando activo el canal directo y seguro de alertas por correo electrónico hacia administradores y propietarios del proyecto.
  2. **Reactivación de la Voz Femenina Oficial de JanIA (Gemini 3.1 Flash TTS — Laomedeia)**:
     - Eduardo confirmó la voz oficial femenina de JanIA visualizada en Google Cloud Console:
       - **Modelo**: `Gemini 3.1 Flash TTS (preview)`
       - **Idioma**: `Spanish (US)` (`es-us`)
       - **Voz**: **`Laomedeia`** (Femenina, Cálida y Acogedora)
       - **Instrucción de estilo**: `"Read aloud in a warm, welcoming tone."`
       - **Endpoint**: `https://texttospeech.googleapis.com/v1beta1/text:synthesize`
     - Se descartó `Studio-B` por ser una voz masculina.
     - Se actualizó `server/_core/whatsapp-utils.ts` priorizando a `Laomedeia` como Motor #1 Oficial con OAuth2 Bearer Token.
     - Se habilitó el soporte de notas de voz nativas PTT en el endpoint `/api/send-whatsapp-notification` y se despachó con éxito un audio de prueba al número oficial del bróker (+573166569719).
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `.gitignore`: Incorporado patrón `gen-lang-client*.json` para evitar filtraciones de credenciales.
  2. `server/_core/google-service-account.json`: Instalada la nueva cuenta de servicio de `Vecy APP` en local y sincronizada al VPS vía SCP.
  3. `server/_core/whatsapp-utils.ts`: Priorizada la voz femenina oficial Laomedeia con autenticación OAuth2 de cuenta de servicio.
  4. `server/_core/index.ts`: Añadido soporte para `sendAudio / isAudio` en `/api/send-whatsapp-notification`.
  5. `shared/const.ts` y `package.json`: Versión incrementada a `v32.48` (`32.48.0`).
  6. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.48` aprobado (122/122 tests Vitest al 100%).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 122/122 tests Vitest aprobados al 100% ✅ | Audio entregado en vivo al 3166569719 ✅

## 🔖 VERSIÓN ANTERIOR: v32.47 — Octubre 2026

### Novedades v32.47 (Integración Oficial de Clave de Pago Gemini en Vecy APP Google Cloud Billing, Pool Quíntuple de Failover Indestructible en JanIA, y Paridad Total de Autenticación Multidominio Supabase/Google en Vecy Agenda Pro):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Auditoría Forense por Eliminación de Proyectos en Google Cloud**:
     - Eduardo eliminó dos cuentas en Google Cloud: `"Vecy Agenda"` y `"Jania Evaluadora Pro"`.
     - Se auditó empíricamente contra el código y producción, certificando 0% de impacto: `Jania Evaluadora Pro` pertenecía a Google TTS y cuenta de servicio bloqueada en `v31.65`, reemplazada por Edge TTS a $0 COP. `Vecy Agenda` pertenecía a Google Maps, reemplazado por `geography.ts` y Leaflet a $0 COP.
  2. **Resolución de Autenticación de Google en Vecy Agenda Pro y Error 400 redirect_uri_mismatch**:
     - El cliente de Google Cloud (`Supabase Vecy Auth`, ID `747178664273-...`) está vivo en el proyecto `Vecy APP`.
     - Al configurar el proyecto de Supabase `iqmlenxldsdrxsbegkwf` para Vecy Agenda Pro, Google arrojaba `Error 400: redirect_uri_mismatch` porque solo estaba inscrita la URI de `knzmpoprlmbonejshfys`.
     - **Solución Doctrinal**: Registro de la segunda URI autorizada `https://iqmlenxldsdrxsbegkwf.supabase.co/auth/v1/callback` en Google Cloud Console para autorizar ambos proyectos de Supabase en simultáneo.
     - Paridad en `vecy-agenda-pro`: actualización de `src/components/AuthModal.jsx` a `window.location.href` y de `src/supabaseClient.js` con fallbacks seguros de Supabase.
  3. **Activación de Facturación Oficial y Blindaje de Gemini en Google Cloud**:
     - Eduardo vinculó exitosamente su cuenta de facturación (`01083F-48C83C-5C8BD4`) al proyecto oficial `Vecy APP` (`gen-lang-client-0137076503`).
     - Creó la clave de pago oficial directa en Google Cloud Console (`AQ.Ab8RN6Kik...c7ePwg`), evitando las restricciones de prepago de Google AI Studio.
     - Se clarificó que no se debe marcar "Agent Platform API", manteniendo únicamente "Gemini API" seleccionada.
     - Se validó empíricamente la clave respondiendo 200 OK con `gemini-flash-latest`.
     - Se integró al `.env` como la Clave #1 principal (`GEMINI_API_KEY` y `GEMINI_API_KEY_1`), expandiendo el pool a 5 claves con las 4 previas como failover automático.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `.env`: Configurada nueva clave oficial como #1 y 4 claves de reserva (2, 3, 4, 5).
  2. `vecy-agenda-pro`: Sincronizados `AuthModal.jsx` y `supabaseClient.js`, compilación limpia y push a `origin/main` (commit `75b0648`).
  3. `shared/const.ts` y `package.json`: Versión incrementada a `v32.47` (`32.47.0`).
  4. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.47` aprobado (121/121 tests Vitest al 100%).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 121/121 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 10.53s ✅

## 🔖 VERSIÓN ANTERIOR: v32.46 — Octubre 2026

### Novedades v32.46 (Auto-adopción de Nombres Oficiales Verificados en Vecy Agendas Pro, Protocolo Notarial de Antecedentes sin Bloqueo, Notificaciones Formales de Declinación y Auditoría Persistente):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Paridad Total en Ambas Vecy Agendas Pro**:
     - Sincronización exacta entre `vecy-network` (`client/src/components/agenda-pro/AgendaForm.jsx`) y `vecy-agenda-pro` (`/home/eddu/Proyectos/vecy-agenda-pro/`).
  2. **Auto-adopción de Nombre Oficial (Cero Abstención por Discrepancia)**:
     - Eliminada la restricción y error HTTP 400 cuando el solicitante ingresa un nombre distinto al del documento.
     - El sistema adopta automáticamente el nombre oficial certificado (`officialName`) retornado por las centrales estatales (PONAL / Procuraduría SIRI / ADRES MinSalud / DB Vecy), completando los campos sin bloquear el flujo (`valid: true, match: true, nameAutoCorrected: true`).
  3. **Manejo de Antecedentes y Auditoría de Seguridad Notarial**:
     - Si el solicitante o titular registra antecedentes penales o disciplinarios, el sistema **no bloquea el formulario en pantalla**: despliega una advertencia de seguridad notarial informativa y permite enviar la solicitud.
     - En el servidor, se persiste la solicitud con `has_alerta_antecedentes = true` y el motivo detallado en `alerta_motivo`.
     - Se registra permanentemente en la nueva tabla `security_flagged_identities` (`tipoDocumento`, `numeroDocumento`, `nombreTitular`, `fuenteAlerta`, `motivoAlerta`).
     - Se dispara una notificación crítica al Bróker de Vecy (+573166569719) vía CallMeBot y correo.
     - Al solicitante se le despacha mensaje por WhatsApp y correo formal informándole que **SU RESERVA HA SIDO DECLINADA** por políticas de seguridad notarial.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `drizzle/schema.ts`: Agregadas columnas `hasAlertaAntecedentes` y `alertaMotivo` en `solicitudes`; creada tabla `security_flagged_identities`.
  2. `server/routers/agenda.ts`: Exportada interfaz `IdentityVerificationResult`, auto-adopción de nombre en `executeIdentityVerification` y `processAndSaveSolicitud`, detección de antecedentes en PONAL/SIRI, función `registerSecurityFlaggedIdentity`.
  3. `server/_core/agendaWhatsAppService.ts`: Alerta de máximo nivel en `buildBrokerCallMeBotMessage` y mensaje formal de declinación en `buildClientConfirmationMessage`.
  4. `server/_core/emailContractService.ts`: Plantilla carmesí de declinación por antecedentes en `getEmailContent` y banner de alerta crítica para el bróker.
  5. `client/src/components/agenda-pro/AgendaForm.jsx` y `/home/eddu/Proyectos/vecy-agenda-pro/src/components/AgendaForm.jsx`: Auto-adopción en campos de texto, banner de advertencia en vivo y tolerancia a antecedentes.
  6. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.46` aprobado.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 141/141 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en ambos repositorios ✅

## 🔖 VERSIÓN ANTERIOR: v32.45 — Octubre 2026

### Novedades v32.45 (Integración Triple ADRES / BDUA, Resolución de C.E. 8.084.608 como "José Patricio Cáceres Morales", Diagnóstico Forense de Falla CSP en Brave y Túnel de Aseguramiento en Salud):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Análisis Forense de Pantallas de Eduardo en Brave**:
     - Eduardo adjuntó capturas demostrando que el portal de la Procuraduría (`apps.procuraduria.gov.co/webcert/`) se colgaba en Brave con el error: *"Formulario de atención de incidentes: Disculpe las molestias..."*.
     - **Causa Raíz Identificada**: El servidor ASP.NET de la Procuraduría emite una cabecera con comillas tipográficas curvadas inválidas (`Content-Security-Policy: default-src ‘self`), y sus scripts `jquery_realperson.js` arrojan 404 y son bloqueados por los escudos de huella digital de Brave. No fue un fallo del documento ni de la máquina de Eduardo, sino un error de compatibilidad del portal estatal con navegadores modernos de alta privacidad.
  2. **Resolución Definitiva de Identidad Civil de C.E. 8.084.608 ("José Patricio Cáceres Morales")**:
     - Ni la Policía Nacional (solo exhibe nombre de extranjeros con orden de captura) ni la Procuraduría (solo lista personas con procesos o contratos con el Estado) tenían el nombre de Mafe.
     - **Conexión Exitosa con ADRES / BDUA (Ministerio de Salud)**: Se descubrió que la base universal de salud indexa a todos los residentes colombianos y extranjeros cotizantes o subsidiados.
     - Se resolvió con 100% de certeza que **C.E. 8.084.608** pertenece a: **JOSÉ PATRICIO CÁCERES MORALES** (Afiliado Activo en EPS SURAMERICANA S.A., Bogotá D.C.).
     - Igualmente se validó exitosamente **C.E. 375.202** como **MARCO ANTONIO MOGOLLÓN TAMAYO** (EPS SURAMERICANA S.A.) y **C.E. 498.614** como **RODOLFO JESÚS MENDOZA RIVAS**.
  3. **Integración Triple Sinergia Notarial ($0 COP, Sin Captchas de Pago)**:
     - Pilar 1: **Policía Nacional (PONAL)** -> Certifica antecedentes penales y judiciales (0 requerimientos = Habilitado).
     - Pilar 2: **Procuraduría General (SIRI)** -> Certifica antecedentes disciplinarios y fiscales con el Estado.
     - Pilar 3: **ADRES / BDUA (MinSalud)** -> Certifica nombre civil completo, EPS, estado de afiliación, departamento y municipio.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/_core/identityVerificationService.ts`:
     - Implementado scraper seguro `queryAdres`, selector `mapTipoDocToAdres` y resolución dinámica de endpoints con túnel `getAdresEndpoint` (puerto 28443).
     - Actualizado `httpRequest` para manejar cabeceras SNI dinámicas según el host de destino.
     - Enriquecido el dictamen notarial de JanIA con EPS, estado de afiliación y municipio del afiliado.
  2. `server/routers/agenda.ts`:
     - En `verifyCedulaWithRegistraduria`, incorporado fallback automático a ADRES (BDUA) para validar en tiempo real nombres civiles de C.E., Pasaportes, PPT y PEP en Vecy Agenda Pro.
  3. `scripts/ensure-pgn-tunnel.sh`:
     - Actualizado para mantener activos de forma simultánea y resiliente los dos túneles reversos: `18443` (Procuraduría) y `28443` (ADRES).
  4. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.45` aprobado.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 140/140 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 10.50s ✅

## 🔖 VERSIÓN ANTERIOR: v32.44 — Octubre 2026

### Novedades v32.44 (Actualización Multidocumento y Soporte Dual en Vecy Agenda Pro, Doctrina de Longitudes Registrales y Análisis de C.E. 8.084.608):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Análisis de la C.E. 8.084.608 y Entrega de Nombre Legal a Maria Fernanda ("Mafe")**:
     - Eduardo preguntó por qué no se entregó un nombre civil a Mafe para la C.E. 8.084.608 como se hizo con Andrés Artunduaga (Rodolfo Jesús Mendoza Rivas, C.E. 498.614), e indagó si este número de 7 dígitos no sería una Cédula de Ciudadanía colombiana.
     - **Verificación Empírica en Vivo**:
       - Como C.C.: consultado ante Policía Nacional y Procuraduría General (SIRI), el documento `8084608` no figura en el censo electoral de la Registraduría ni en el registro disciplinario.
       - Como C.E.: tiene 7 dígitos (rango válido de Migración Colombia de 4 a 7 dígitos). Sin embargo, el ciudadano titular no posee contratos con el Estado registrados en la Procuraduría General (SIRI) ni antecedentes penales en la Policía Nacional, por lo cual ninguna base pública abierta del Estado indexa su nombre civil.
  2. **Doctrina de Longitudes y Estructura de Documentos en Colombia**:
     - **Cédula de Ciudadanía (C.C.)**: Históricas de 1 a 8 dígitos (pre-2000) o NUIP de 10 dígitos iniciando en 1 (post-2000). **En Colombia NUNCA existieron cédulas de 9 dígitos** (la Registraduría saltó de 8 a 10 dígitos).
     - **Cédula de Extranjería (C.E.)**: Emitidas por Migración Colombia (antes DAS), constan de 4 a 7 dígitos numéricos. **NO tienen 8, ni 9, ni 10 dígitos** (si tiene 8+ dígitos suele ser una CC).
     - **Pasaporte**: 5 a 15 caracteres alfanuméricos.
     - **PPT**: 5 a 10 dígitos numéricos.
     - **PEP**: 15 caracteres alfanuméricos.
  3. **Blindaje de Vecy Agenda Pro (`agenda.ts` e `index.ts`)**:
     - Se erradicó la clasificación errónea donde `tDocLower.includes('cédula')` trataba a la "Cédula de extranjería" como Cédula de Ciudadanía.
     - Se incorporó soporte autoritativo dual a Vecy Agenda Pro: para CC consulta Policía Nacional primero con respaldo en Procuraduría; para extranjeros (CE, PEP, PPT, NIT) consulta Procuraduría primero (SIRI) y Policía Nacional para antecedentes.
     - Se flexibilizó el fallback resiliente multiformato en el paso 6 para permitir citas presenciales a titulares de Pasaportes, PPT, PEP y CEs cortas con solicitud de cotejo físico en sede.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/routers/agenda.ts`: Clasificación estricta de documentos, validaciones estructurales pedagógicas (CC 9 dígitos, CE 8+ dígitos), consulta dual integrada y fast-path en 0 ms.
  2. `server/_core/index.ts`: Sincronización del endpoint tRPC `/api/trpc/agenda.verifyCedulaWithRegistraduria`.
  3. `server/_core/identityVerificationService.ts`: Reportes orientativos contextuales según la cantidad de dígitos.
  4. `server/__tests__/regression.test.ts`: Test unitario `Doctrina v32.44` aprobado.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 139/139 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 30s ✅

## 🔖 VERSIÓN ANTERIOR: v32.43 — Octubre 2026

### Novedades v32.43 (Integración Dual Procuraduría General de la Nación + Policía Nacional, Soporte Multi-Documento PEP/PPT/NIT y Blindaje de Reacciones WhatsApp con @lid):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Investigación de Supuesta Caída de JanIA y Pérdida de Reacciones en Dos Grupos**:
     - Eduardo reportó que JanIA colocó reacciones en dos grupos pero no en "Ofertas VENTA 1000" (post Jorge Salazar #4696) ni en "Requerimientos 1000" (post Rosmira #2192), temiendo una nueva caída del servicio.
     - **Verificación Técnica en VPS**: JanIA NUNCA se cayó ni reinició (uptime continuo, 0.0% CPU, 0 reinicios, 2.7ms de latencia en `/api/health`). Ambos mensajes fueron extraídos e insertados exitosamente en la base de datos PostgreSQL.
     - **Causa Raíz de Reacciones Faltantes**: Los emisores en esos dos grupos usaban identificadores `@lid` (Linked Identity de WhatsApp: `207915222843499@lid` y `222105861881922@lid`). Cuando Baileys no tiene una sesión de cifrado Signal abierta para un `@lid`, la librería `libsignal` arroja `No open session`. Anteriormente, `safeReact` capturaba el error y abortaba sin reintentar.
     - **Solución Implementada**: `safeReact` detecta fallos por falta de sesión, ejecuta `assertSessions([msgKey.participant], true)` y reintenta de inmediato la reacción usando una clave alternativa directa (`remoteJid: chatId, id: msgKey.id, fromMe: false`), garantizando que la reacción se aplique sin importar si el emisor se identifica vía `@lid` o `@s.whatsapp.net`.
  2. **Integración Dual de Verificaciones: Procuraduría General de la Nación + Policía Nacional (PONAL)**:
     - Eduardo propuso incorporar la consulta en la Procuraduría (`apps.procuraduria.gov.co/webcert/`) como alternativa potente para verificar Cédulas de Extranjería (CE/CX), PEP, PPT y NIT, resolviendo el caso de documentos extranjeros donde PONAL no retorna nombre civil de personas sin registro delictivo.
     - **Regla Doctrinal**: Policía Nacional se mantiene 100% activa, intacta y como primer pilar de seguridad. Procuraduría se integra como fuente dual complementaria ($0 COP, sin captchas de pago de terceros, resolución automática de preguntas aritméticas/geográficas).
     - **Comprobación en Vivo**: Verificación exitosa en tiempo real de CE `498614` retornando con certeza absoluta el nombre `RODOLFO JESUS MENDOZA RIVAS` y validación de antecedentes.
     - **Soporte Ampliado de Tipos de Documento**: JanIA ahora clasifica y verifica automáticamente `CC`, `CE`/`CX`, `PEP` (15 caracteres alfanuméricos), `PPT` (Permiso por Protección Temporal, 6-8 dígitos) y `NIT` (empresas).
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/_core/identityVerificationService.ts`:
     - Implementado scraper seguro `queryProcuraduria` con bypass SSL gubernamental y motor `solveProcuraduriaQuestion` para preguntas de seguridad en menos de 1.2 segundos.
     - Mapeo de tipos de documento: CC (`1`), CE (`5`), PEP (`0`), PPT (`10`), NIT (`2`).
     - Lógica orquestadora dual en `executeIdentityVerificationFromWhatsApp`: verificación en cache unificado en memoria (0ms), cascada inteligente CC (PONAL -> Procuraduría) y extranjeros CE/PEP/PPT/NIT (Procuraduría para identidad y nombre legal + PONAL para antecedentes penales).
     - Preservación estricta de marca blanca (referencia institucional como "Central de Seguridad y Control Notarial").
  2. `server/_core/whatsapp-match.ts`: Blindaje de `safeReact` con fallback de clave y `assertSessions`.
  3. `server/__tests__/regression.test.ts`: Pruebas de regresión unitarias e integración de la Doctrina v32.43.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 138/138 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 10.48s ✅

## 🔖 VERSIÓN ANTERIOR: v32.42 — Octubre 2026

### Novedades v32.42 (Resolución Quirúrgica de ReDoS en Matching, Erradicación del 100% CPU en Event Loop, Cierre Limpio de Sockets Baileys y Claridad en Facturación Google AI Studio):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Causa Raíz de Lentitud y Pérdida de Reacciones en JanIA**:
     - Eduardo reportó que JanIA no colocaba reacciones con emojis en los grupos, respondía con lentitud extrema y dejó sin responder la consulta de Jani Alves (`3188096811` a las 12:41 PM para la cédula 1014862481).
     - La depuración con Chrome DevTools Protocol (CDP) en el VPS reveló que el hilo principal de Node.js estaba clavado en **99.9% de CPU** en `parseStreetCarreraBoundaries` (`matching.ts`).
     - ReDoS exponencial ($O(2^N)$): una demanda real (HOUSALES, 1828 caracteres con secuencias de espacios en blanco) hacía que la expresión regular de autopista con cuantificadores contiguos congelara el bucle de eventos.
     - Este bloqueo impedía procesar callbacks de WebSocket (llevando a desconexiones 408 por falta de pings keep-alive), vencía los timeouts de las reacciones con emojis y reprimía los mensajes entrantes de WhatsApp.
  2. **Resolución Doctrinal de Facturación Google AI Studio**:
     - Analizado el aviso obligatorio de Google AI Studio sobre cambio a prepago antes del 12 de octubre de 2026.
     - Google bonifica con $10 USD de regalo al migrar a prepago y comprar créditos.
     - No existen cobros ocultos ni inmediatos más allá del monto de recarga voluntario (ej. $5 o $10 USD). Con el pool de 4 claves activas (1 prepago + 3 gratuitas), JanIA tiene blindaje absoluto contra saturaciones.
  3. **Verificación Exitosa de Juan Pablo Rivera Alves (C.C. 1.014.862.481)**:
     - Documento verificado exitosamente ante Policía Nacional: sin antecedentes penales y habilitado plenamente.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/_core/matching.ts`:
     - Normalización con colapso de espacios múltiples (`.replace(/\s+/g, " ").trim()`) en `parseStreetCarreraBoundaries`.
     - Pre-filtro ultrarrápido sin expresiones regulares (0.001 ms si no hay palabras clave viales o números).
     - Expresiones regulares reescritas sin cuantificadores anidados opcionales. Ejecución reducida de infinito a **0.029 ms**.
  2. Purga y mantenimiento en VPS: 79 MB eliminados en `.wwebjs_auth` y retención de backups reducida a 7 días.
  3. `server/_core/whatsapp-match.ts`: Cierre limpio de socket previo con `(this.sock as any).end?.(undefined)` y timeout ágil en `safeReact`.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 137/137 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 31.32s ✅

## 🔖 VERSIÓN ANTERIOR: v32.41 — Octubre 2026

### Novedades v32.41 (Blindaje Anti Bucle de Reinicios de Watchdog, Respaldo IPv4 Localhost, Tolerancia de Arranque Baileys y Entrega Informativa sin Falsos "Fallos en la Matrix"):
- **Diagnóstico y Confirmación Doctrinal de Eduardo (Análisis Caso Andres Artunduaga `+57 304 4010292` y Maria Fernanda `+57 316 4652482`)**:
  1. **Causa Raíz 1: Bucle de Reinicios Prematuros del Watchdog (`scripts/health-monitor.sh`)**:
     - El monitor de salud corría cada 3 minutos en crontab de VPS probando `http://localhost:3000/api/health` con un timeout corto de 15 segundos y gracia de solo 180s.
     - En Ubuntu, `localhost` resuelve a IPv6 `::1:3000`, el cual quedaba colgado porque Node escuchaba en `0.0.0.0:3000`. Además, el socket Baileys tardaba 1 a 3 minutos sincronizando 26.108 archivos de credenciales (`.baileys_auth`), retrasando el endpoint.
     - Esto provocó que el watchdog matara y reiniciara `jania-server` 992 veces en bucle infinito cada 6 minutos.
     - **Caso Maria Fernanda**: A las 10:24 AM hora Bogotá, Maria Fernanda envió *"Verificar CE 8084608"*. En ese exacto segundo (`16:24:01 UTC`), el watchdog mató el proceso en el VPS, desconectando el socket y dejando su mensaje sin atender.
  2. **Causa Raíz 2: Falso "Fallo en la Matrix" Ocultando Explicaciones Válidas en `formatPoliteToolDelivery`**:
     - Andres Artunduaga envió *"Verificar CE 498614"* 3 veces seguidas.
     - La consulta a Policía Nacional (`cedulaTipo: 'cx'`) no arrojó antecedentes judiciales ni nombre (el portal no lista ciudadanos extranjeros sin registro penal).
     - El servicio `identityVerificationService` generó un reporte explicativo claro (`reportText`) indicando que el documento no pudo ser validado y detallando los motivos (registro migratorio, documento extranjero, error de digitación).
     - Sin embargo, en `server/_core/janIA.ts`, la función `formatPoliteToolDelivery` contenía la condición `if (!success) { return "...un pequeño fallo en la matrix 🤖😅..." }`.
     - Esto descartaba por completo el reporte explicativo y le decía erróneamente al usuario que el sistema de JanIA se había caído o roto, generando tres respuestas consecutivas idénticas de "fallo en la matrix".
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `scripts/health-monitor.sh`:
     - Reemplazado `localhost` por `127.0.0.1` explícito con bandera `--ipv4`.
     - Aumentado timeout de curl a 30s con 3 reintentos espaciados por 20 segundos antes de declarar fallo.
     - Período de gracia tras reinicio ampliado de 180s a 600s (10 minutos) para dar tiempo a la sincronización de archivos de Baileys.
     - Crontab en VPS ajustado de `*/3` a `*/10` minutos.
  2. `server/_core/index.ts`:
     - Binding explícito a `"0.0.0.0"` en `server.listen(port, "0.0.0.0", ...)`.
  3. `server/_core/janIA.ts`:
     - Modificado `formatPoliteToolDelivery`: si existe un `payloadText` explicativo, se entrega al usuario con cortesía y cordialidad, reservando el mensaje de "fallo en la matrix" exclusivamente para fallos catastróficos o timeouts imprevistos sin reporte.
  4. Limpieza de procesos huérfanos en VPS y despliegue del script corregido.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 137/137 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 11.14s ✅

## 🔖 VERSIÓN ANTERIOR: v32.40 — Octubre 2026

### Novedades v32.40 (Doctrina de Marketing Conversacional, Prohibición de "45/10/45" Temprano, Perfilamiento del Usuario, Menú Estructurado de Consultas, Claridad Tajante de Servicios Gratuitos y Despedida en 2 Mensajes Secuenciales):
- **Diagnóstico y Confirmación Doctrinal de Eduardo (Análisis Caso Reina Salazar `+57 313 8323122`)**:
  1. **Prohibición Estricta de Mencionar "45/10/45" en Etapas Iniciales**:
     - Eduardo detectó que hablar de "bolsa colaborativa 45/10/45" o esquemas de comisión al inicio asusta y confunde a los usuarios, ya que nadie en el mercado conoce ese término técnico interno.
     - Solo los fundadores y el sistema conocen ese porcentaje; JAMÁS debe mencionarse en saludos ni en etapas tempranas.
  2. **Perfilamiento Conversacional Amigable (Cero Suposiciones de Oficio)**:
     - JanIA NO sabe a qué se dedica el usuario que escribe (puede ser propietario, comprador, arrendatario, inversionista o asesor).
     - Al saludar, JanIA debe presentarse con orgullo (*"Soy JanIA, tu asistente inmobiliaria con IA creada por VECY BIENES RAÍCES"*) e indagar con una pregunta abierta cálida: *"¿Cuéntame a qué te dedicas o qué haces actualmente? Así podré orientarte de la mejor manera y contarte cómo podemos facilitarte la vida hoy 🤝✨"*. Esto permite conocer su contexto y aplicar marketing conversacional persuasivo.
  3. **Manejo Estructurado de Preguntas sobre Consultas ("¿Cómo es lo de las consultas?")**:
     - JanIA no debe volcar monólogos técnicos asumiendo que solo se trata de Policía Nacional.
     - Debe preguntar: *"Primero cuéntame qué clase de consulta deseas hacer o sobre qué tema necesitas apoyo:"* y desplegar el catálogo dividido:
       - **100% Gratuitas:** 1. Verificación oficial de documentos (CC, CE, Pasaportes) ante Policía Nacional y 2. Factura Predial Bogotá y Certificados oficiales de pago en PDF (SDH).
       - **Consultas Especializadas y Asesoría Profesional:** 3. Sondeos de mercado m², 4. Asesoría jurídica en compraventa/arriendos, 5. Hábeas Data, 6. Recuperación de cartera de comisiones no pagadas, 7. Avalúos digitales certificados RAA, 8. Liquidaciones tributarias y 9. Préstamos sobre hipoteca y pacto de retroventa.
     - En los temas 3 al 9, JanIA brinda conceptos básicos y tips breves gratuitos para despejar dudas, y para el análisis de fondo guía al usuario a contactar al bróker humano oficial (+57 316 656 9719).
  4. **Respuesta Tajante y Sin Rodeos ante Preguntas de Costos ("Los costos ?", "¿cuánto cuesta?")**:
     - Si el usuario pregunta por los costos de los servicios o herramientas de consulta que JanIA le acaba de nombrar (verificación de documentos o predial), JanIA responde con alegría, claridad y rapidez:
       *"¡Este servicio es completamente GRATIS! 🎁✨ En VECY Bienes Raíces la verificación de documentos y la factura predial no tienen ningún costo para ti..."* y lo invita de inmediato a probarlo: *"Envíame el número de cédula y te lo entrego en segundos"*.
     - **Prohibición Terminante**: JAMÁS enfriar la venta hablando de "planes o paquetes según volumen", ni "45/10/45", ni mandarlo a llamar a Jani Alves para averiguar precios de herramientas que son 100% gratuitas.
  5. **Despedida Secuencial en 2 Mensajes Cortos y Persuasivos**:
     - **Mensaje 1 (Canal Oficial)**: `Con todo el gusto, {{nombre}}. Para nosotros en VECY es un verdadero placer apoyarte en tus proyectos y gestiones inmobiliarias. Antes de que te vayas, te invito a unirte a nuestro Canal Oficial de WhatsApp (https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b), donde compartimos cosas que te pueden interesar.`
     - **Mensaje 2 (Google Review y Cierre Exitoso)**: `⭐ Tu opinión es muy importante para nosotros. La necesitamos muchísimo para seguir mejorando y logrando que más colegas y propietarios conozcan nuestro servicio. Si te gustó la atención y la rapidez, regálanos un comentario y calificación. Significaría un mundo para todo el equipo de Vecy Bienes Raíces:\n👉 https://g.page/r/CctNbwU6UpX5EBM/review ✨\n\n¡Que tengas una excelente jornada y muchos éxitos en tus cierres! 🏢✨`
     - Detección tolerante para capturar agradecimientos como `"Ok muchas gracias 🫂"`, `"muchas gracias"`, etc.
  6. **Doctrina de Amor al Usuario, Paciencia Total y Empatía Tecnológica Paso a Paso**:
     - Eduardo instruyó atender con profunda paciencia y cariño a las personas mayores, analfabetas digitales o que les cuesta la tecnología.
     - Fast-path y prompt enriquecido para responder a *"¿cómo se hace?"*, *"no sé cómo"*, *"me enredo"*, etc., con ternura, sin tecnicismos y con una guía sencilla de 3 pasos (enviar número o fotito de la cédula por ambos lados, o dar el CHIP), reiterando que JanIA siempre está disponible para guiar con amor a todo el que lo necesite.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. `server/_core/janIA.ts`: Interceptores dedicados para saludo con perfilamiento, menú de consultas, costos 100% gratuitos, explicación didáctica paso a paso (`isHowToDoInquiry`) y despedida con mensaje 1; System Prompt de Gemini enriquecido con directrices de ventas, marketing conversacional y pedagogía de paciencia amorosa.
  2. `server/_core/predialService.ts`: Actualizado `GOOGLE_REVIEW_MESSAGE` con el mensaje exacto de Eduardo y exportado `getChannelInviteGoodbyeMessage`.
  3. `server/_core/whatsapp-match.ts`: Regex `isGratitudeOrClosing` robusta y tolerante a variaciones coloquiales ("ok muchas gracias", emojis) con despacho desacoplado y secuencial del Mensaje 2.
  4. `server/__tests__/regression.test.ts`: Pruebas automatizadas cubriendo el ciclo completo de la doctrina v32.40 (incluyendo la explicación didáctica paso a paso).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | 136/136 tests Vitest aprobados al 100% ✅ | `npm run build` limpio en 15.6s ✅

## 🔖 VERSIÓN ANTERIOR: v32.39 — Octubre 2026

### Novedades v32.39 (Protocolo Maestro de Cortesía, Saludo Humano por Nombre/Género en Herramientas, Manejo Simpático de Fallos "Error en la Matrix" y Persistencia en DMs):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Elevación del Estándar Humano y Pedagogía de Cortesía**:
     - Eduardo instruyó que ante cualquier interacción, JanIA no debe actuar como una consola fría de comandos ni soltar reportes secos.
     - Debe saludar cordialmente por su nombre compuesto, dar la bienvenida adaptada a su género gramatical (`bienvenido/a`) e identificarse con orgullo como *"JanIA, tu asistente inmobiliaria con IA creada por VECY BIENES RAÍCES"*.
     - Con su ejemplo de educación y calidez, JanIA enseñará a los usuarios del gremio a ser más decentes, amables y respetuosos al solicitar un servicio.
  2. **Manejo Elegante y Simpático de Fallos ("Error en la Matrix")**:
     - Cero ghosting o abandono silencioso. Si ocurre una intermitencia de red, timeout de scraper de Policía/Catastro o una orden incomprensible, JanIA responde con simpatía humana y empatía: *"Debido a una intermitencia temporal en mi sistema (un pequeño fallo en la matrix 🤖😅), no pude captar o procesar bien lo que me solicitaste. ¿Podrías por favor confirmarme nuevamente los datos para ayudarte de inmediato? 🤝"*.
  3. **Visión Estratégica de Red Social Inmobiliaria y Monetización por Éxito (Matches 45/10/45)**:
     - Ratificada la visión de VECY Network como la red social exclusiva de los agentes inmobiliarios en Colombia.
     - Cero cobro por datos públicos de Hacienda o Policía (el caballo de Troya gratuito más potente del sector).
     - La monetización real se produce en el cierre exitoso del Match (10% de comisión de plataforma) y en servicios de alto valor: cobro de cartera, peritajes/avalúos certificados RAA, estudios de títulos a 20 años en la SNR y firma electrónica con respaldo jurídico.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. **Creación de `formatPoliteToolDelivery` en `server/_core/janIA.ts`**:
     - Envoltura elegante de reportes de Cédula y Predial con saludo horario (`timeSalutation`), nombre compuesto (`displayName`), bienvenida de género (`welcomeGrammar`) y presentación institucional si es primer turno.
     - Si ya hay conversación activa en el día, responde con cortesía fluida (*"¡Con mucho gusto, {{nombre}}! Ya procesé tu consulta:"*).
  2. **Integración en Despachos de Socket en `server/_core/whatsapp-match.ts`**:
     - Tanto en consultas de predial pendientes, consultas de predial directas, como en verificaciones de cédula, el reporte es formateado por `formatPoliteToolDelivery` y registrado en el historial persistente de DMs (`appendDmHistory`) para continuidad infinita de hilo.
  3. **Refinamiento de System Prompt y Fallback en `janIA.ts`**:
     - Inclusión de directrices de pedagogía de respeto y manejo simpático de ambigüedades.
     - Fallback en bloque `catch` con el mensaje humano de *"error en la matrix 🤖😅"*.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio en 27.7s ✅ | 135/135 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.38 — Octubre 2026

### Novedades v32.38 (Concurrencia Multi-Usuario en JanIA, Blindaje Anti-AutoMute por Reacciones, Des-Silenciamiento Automático en Solicitudes de Herramientas y Resolución de Caso Luz Angela Varela):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Concurrencia Multi-Usuario en DMs y Grupos**:
     - Eduardo consultó: *¿Qué pasa si dos o más personas le hablan al tiempo a JanIA?*
     - Arquitectura 100% asíncrona no bloqueante: JanIA gestiona buffers individuales (`dmMessageBuffers`) independientes por cada `senderId`. Las solicitudes concurrentes de múltiples usuarios (como ocurrió simultáneamente entre Miriam Herz y Jani Alves a las 11:51 AM) se procesan en paralelo sin interferencias ni bloqueos.
  2. **Caso Luz Angela Varela (`166400068989077@lid`) y Cédula 19.278.273**:
     - A las 11:50 AM, Luz Angela envió `"Verifica esta cédula 19278273"`. JanIA no respondió de inmediato mientras que a Miriam sí.
     - **Causa Raíz 1 (Micro-pausa de Socket Baileys 408)**: A las 11:51 AM, los servidores de WhatsApp forzaron una pausa de conexión 408 (`[ANTI-BAN] Conexión Baileys pausada (código: 408)`). Al reconectar a las 11:52, el mensaje de Miriam entró en vivo (`type: 'notify'`), pero el de Luz Angela quedó en cola de WhatsApp sin emitir el evento en vivo.
     - **Causa Raíz 2 (Bug de Auto-Mute por Reacciones)**: Al enviar JanIA un emoji de reacción empática (`sock.sendMessage(senderId, { react: ... })`), WhatsApp reflejó el mensaje con `fromMe: true`. Al no estar el ID en `botSentMessageIds`, el sistema lo interpretó erróneamente como una "intervención humana manual" y marcó la sesión como `isMuted = true` en PostgreSQL (`mute:166400068989077`).
  3. **Resolución y Entrega Inmediata a Luz Angela Varela**:
     - Consulta ejecutada con éxito en la Policía Nacional: C.C. 19.278.273 pertenece a **`Carlos Alfonso Varela Sarmiento`** (ciudadano verificado y habilitado).
     - Despachado el reporte oficial institucional, bucle viral y reseña de Google directamente al chat de Luz Angela Varela.
     - Sesión des-silenciada (`DELETE FROM "pendingSessions"`).
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. **Inmunización contra Auto-Mute en Reacciones**:
     - En `whatsapp-match.ts`, se filtran explícitamente los mensajes con `reactionMessage` y `protocolMessage` en la verificación `fromMe` para que JAMÁS se confundan con intervención humana manual.
     - Se registran los IDs de las reacciones emitidas por el bot en `botSentMessageIds`.
  2. **Des-Silenciamiento Automático en Invocación de Herramientas**:
     - Si un chat estaba silenciado (`isMuted: true`), pero el usuario envía una solicitud de herramienta de autoservicio (Cédula de Ciudadanía/Extranjería/Pasaporte o Certificado Predial/CHIP), JanIA des-silencia automáticamente la sesión y procesa la herramienta de inmediato.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio en 26.4s ✅ | 135/135 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.37 — Octubre 2026

### Novedades v32.37 (Soporte Oficial Multidocumento en Policía Nacional: Cédula de Extranjería, Pasaporte y Documento País de Origen, Subsanación de Tipado TypeScript y Marco Legal Decreto 019 de 2012):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Tipado Estricto de TypeScript en Test de Regresión**: Subsanado el error TS2353 en `server/__tests__/regression.test.ts:2551` ampliando el contrato de `queryPoliciaNacional` para retornar `{ success, officialName, source, cedula, tipoDoc }`.
  2. **Verificación Multidocumento Oficial en Policía Nacional**:
     - Confirmada la estructura del formulario oficial `antecedentes.xhtml` de la Policía Nacional: `<select name="cedulaTipo">` soporta Cédula de Ciudadanía (`cc`), Cédula de Extranjería (`cx`), Pasaporte (`pa`) y Documento País de Origen (`dp`).
     - Integración de extracción, sanitización alfanumérica y reportes diferenciados en `extractCedulaForVerification` y `executeIdentityVerificationFromWhatsApp`.
  3. **Marco Legal Incorporado**: Art. 94 Decreto Ley 019 de 2012, Ley 1581 de 2012, Decreto 1377 de 2013 y Art. 15 C.P. en prompts y respuestas de JanIA.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 135/135 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.36 — Octubre 2026

### Novedades v32.36 (Blindaje Anti-Alucinaciones de Verificación de Cédula en DMs, Detección Exhaustiva de "cc:" / "verificar", Interceptor de Seguridad Nativo y Caso Miriam Herz):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Fallo en DM de Miriam Herz (`+57 310 2399598`)**:
     - Miriam Herz escribió: `"JanIA verificar cc: 39786573"`.
     - JanIA emitió una respuesta conversacional simulada/alucinada por Gemini LLM en vez de ejecutar la consulta real en las bases de datos de la Policía Nacional con la estructura institucional correcta (como sí lo hizo con Luz Angela Varela para C.C. 19196997).
  2. **Causa Raíz Identificada**:
     - En `whatsapp-match.ts`, `isIdCheckContext` evaluaba palabras fijas (`cédula`, `antecedente`, `policía`), obviando patrones abreviados como `"verificar cc:"`.
     - Al no interceptarse, el mensaje cayó al flujo conversacional general de DMs (`processPrivateDmConversationalMessage`), donde Gemini LLM generó un texto simulando una verificación ficticia.
- **Acciones Ejecutadas y Blindaje de Arquitectura**:
  1. **Blindaje de Primer Nivel en Socket (`server/_core/whatsapp-match.ts`)**:
     - Detección gobernada por `extractCedulaForVerification(body, true)`. Si hay documento válido con cualquier término de verificación (`cc`, `verificar`, `policía`, etc.), se activa de inmediato `executeIdentityVerificationFromWhatsApp`.
  2. **Blindaje de Segundo Nivel / Interceptor de Seguridad en `server/_core/janIA.ts`**:
     - En `processPrivateDmConversationalMessage`, antes de invocar a Gemini LLM, se evalúa `extractCedulaForVerification(clean, true)`. Si detecta intención y documento, intercepta y ejecuta directamente la verificación nativa oficial, blindando al sistema contra alucinaciones conversacionales.
  3. **Prohibición Doctrinal Expresa en System Prompt**:
     - Directriz inquebrantable que prohíbe taxativamente simular o alucinar verificaciones de cédula en texto libre.
  4. **Verificación Oficial Real de Miriam Alice Herz Gerbeth**:
     - Documento: C.C. 39.786.573 | Ciudadana: `Miriam Alice Herz Gerbeth` | Estado: Ciudadano verificado y habilitado ante la Policía Nacional.
  5. **Disculpa y Reporte Oficial Institucional**:
     - Mensaje cordial explicando la intermitencia técnica temporal y entrega de reporte oficial con enlaces institucionales.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 134/134 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.35 — Octubre 2026

### Novedades v32.35 (Doctrina de Protección de Datos Personales / Ley 1581 de 2012, Hábeas Data, Verificación Preventiva vs. Clandestinidad, Protocolo de Llamada Directa de Jani Alves, Nombres Compuestos Colombianos y Persistencia Híbrida de DMs en PostgreSQL):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Debate Gremial sobre Verificación de Asistentes a Inmuebles y Hábeas Data**:
     - Eduardo abordó un dilema cotidiano en el sector inmobiliario: personas inescrupulosas que agendan visitas a inmuebles con números de cédula errados o falsos que no coinciden con sus nombres.
     - En un audio de WhatsApp (`WhatsApp Ptt 2026-10-03 at 17.24.34.ogg`), una colega inmobiliaria (Kelly Carvajal) sostiene que cuando en aplicaciones como *Verifíquese* no coincide la cédula con el nombre del cliente, ella cancela la visita inventando pretextos falsos (*"que los dueños ya no van a estar", "que desistieron", "que recibieron una oferta"*) porque según ella *"no se puede decir obviamente que no coincide el nombre con la cédula por el tema de Hábeas Data... no tenemos esa autorización entonces simplemente cancelamos"*.
     - Eduardo ratificó la doctrina inquebrantable de VECY BIENES RAÍCES: **Cero clandestinidad, total transparencia y respaldo legal pleno**. En VECY decimos que **SÍ** hay que decirles con respeto, pues han sido ellos mismos quienes suministraron voluntariamente su documento para acceder al servicio de visita a una propiedad privada habitada o desocupada. No se viola la Ley 1581 de 2012 ni el Hábeas Data, y no se está buscando la cédula por el nombre a sus espaldas (lo cual en Colombia es legal y técnicamente imposible por las restricciones de la Registraduría Nacional).
  2. **Protocolo Operativo VECY: Llamada Telefónica Directa de Jani Alves**:
     - Eduardo enfatizó que en caso de presentarse una inconsistencia o error de digitación en el documento de identidad de un cliente propietario, visitante o colega, en VECY BIENES RAÍCES el protocolo humano es inmediato: Jani Alves siempre llama directamente por teléfono al cliente para que nos rectifiquen amablemente el número de documento y listo, queda solucionado en 30 segundos, manteniendo viva la negociación y salvando comisiones millonarias sin pretextos ni mentiras.
  3. **Resolución Inteligente de Nombres Compuestos y Género Gramatical**:
     - Respeto incondicional a los nombres compuestos colombianos (Ana María, Juan José, María Fernanda, José Manuel, Carlos Alberto, Luz Marina, Olga Lucía, etc.), garantizando que JanIA jamás los corte al primer nombre ("Ana" o "Juan") y respetando el género gramatical (`estimada`/`estimado`, `bienvenida`/`bienvenido`).
     - Creación de `getCanonicalCompositeName` con normalización Unicode (`unaccent`) para evitar fallos de regex en letras acentuadas (ej: José, Inés, Andrés, Sebastián) y enriquecimiento del conjunto `COMMON_FIRST_NAMES`.
  4. **Optimización de Conversación Privada en DMs (Caso Consuelo Ronderos)**:
     - Detección robusta tolerante a errores de tipeo de celular (*"Quieto rrvisar sus antecedentes"*) orientando con pedagogía y amabilidad sobre la necesidad del número de documento bajo la Ley 1581 de 2012 con vocativo respetuoso (`¡Claro que sí, {{nombre}}!`).
     - Persistencia del historial conversacional en PostgreSQL para que JanIA jamás pierda el hilo ni reinicie con saludos genéricos si el servidor o PM2 se reinician.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Persistencia Híbrida de DMs en PostgreSQL (`getOrLoadDmHistory` en `server/_core/janIA.ts`)**:
     - Si la memoria volátil en RAM está vacía tras un reinicio de PM2, JanIA consulta automáticamente las tablas `conversations` y `messages` en PostgreSQL, restaurando de inmediato los últimos turnos de la conversación (hasta 24 horas). Contexto indestructible y cero saludos repetidos.
  2. **Detector de Intención Tolerante a Errores de Tipeo (`isDocVerificationIntent` en `server/_core/janIA.ts`)**:
     - Admite variaciones ortográficas de celular ("quieto/quiero/deseo/necesito", "rrvisar/revisar/verificar/chequear/validar", "antecedentes/cédula/documento") y saluda con vocativo respetando nombre compuesto.
  3. **Motor Maestro de Nombres Compuestos y Género Gramatical (`nameAndGenderResolver.ts` y `janIA.ts`)**:
     - Exportado `getCanonicalCompositeName(rawName)`. Normalización Unicode (`unaccent`) para anclas `\b` en diacríticos y ampliación de `COMMON_FIRST_NAMES`.
  4. **Institucionalización Doctrinal de Llamada de Jani Alves**:
     - Añadido el protocolo oficial de llamada directa de Jani Alves en system prompt de DMs y en los prompts maestros de grupos y base.
  5. **Reacción Empática Jurídica `⚖️` (`server/_core/whatsapp-utils.ts`)**:
     - Menciones de Hábeas Data, protección de datos, Ley 1581 o privacidad reaccionan de inmediato con `⚖️`.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio en 26.7s ✅ | 133/133 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.34 — Octubre 2026

### Novedades v32.34 (Confirmación Eureka de PDF Predial, Presencia Continua de Puntitos Bailarines (...) y Grabando Audio (🎙️), Reacción Inmediata Fija 📄 y Aceleración del Servicio):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Eureka Confirmado con Entrega Real de PDF**:
     - Eduardo y Jani Alves confirmaron con éxito rotundo la entrega del Certificado Oficial de Pago de Predial en archivo PDF real (`Certificado_Pago_AAA0185PUMR_2026.pdf`, 29 KB) a nombre de la titular real de Catastro `GILMA ESTELLA BOTERO GOMEZ` (`CC 43403545`).
     - Quedó plenamente comprobado que el fallo inicial con NIT `860034594` se debió a que el inmueble en Catastro está registrado bajo persona natural (la propietaria real) y no bajo persona jurídica.
  2. **Feedback Visual Continuo / Puntitos Bailarines (`...`) y Grabando Audio (`🎙️`)**:
     - Eduardo instruyó que durante todo el procesamiento (incluso si Puppeteer y 2Captcha toman 20-30s en la SDH), los gestos de actividad de WhatsApp ("Escribiendo..." con los 3 puntitos bailarines o "Grabando audio..." con el micrófono) DEBEN mantenerse activos sin apagarse nunca para que el usuario no sienta abandono ni lentitud.
  3. **Reacción Única Inmediata con Documento 📄 y Supresión de Cambios Redundantes**:
     - Eduardo propuso no perder tiempo cambiando de reacciones (evitar transiciones ⏳ -> 🏛️ -> 📄 que traban o demoran el socket de Baileys).
     - Dejar una sola reacción fija inmediata con el emoji de documento `📄` al recibir la solicitud y no volver a alterarla.
  4. **Aceleración Drástica de Tiempos de Entrega**:
     - En `queuedSend`, los delays artificiales de typing retenían hasta 15 segundos innecesarios en la cola al enviar el PDF, bucle viral y reseña.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Presencia Continua (`startContinuousPresence` en `server/_core/whatsapp-utils.ts`)**:
     - WhatsApp expira el estado de typing en 5 a 10s. Creada la función `startContinuousPresence(sock, jid, type, intervalMs)` que renueva periódicamente cada 3.5 segundos `sock.sendPresenceUpdate('composing' | 'recording', jid)` durante toda la llamada de Predial, Cédula, LLM o TTS, limpiando con `paused` al finalizar.
  2. **Reacción Inmediata con Documento (`server/_core/whatsapp-utils.ts` y `server/_core/whatsapp-match.ts`)**:
     - En `getEmpatheticReactionEmoji`: las consultas de Predial / CHIP / Hacienda reaccionan de inmediato con `📄`.
     - Eliminadas todas las transiciones secundarias de reacción (`⏳`, `🏛️`, `📄` posteriores) para que el socket no sufra latencias ni colisiones.
  3. **Aceleración Extrema de Cola (`queuedSend` en `server/_core/whatsapp-match.ts`)**:
     - Reducido el delay artificial a rangos ultra ágiles (máx 1.2s en vez de 5s).
     - Soportado el flag `skipDelay: true` (250ms) para que los mensajes de bucle viral y reseña tras la entrega del PDF se despachen al instante.
  4. **Soporte Exhaustivo para las 10 Opciones de Documento SDH (`server/_core/predialService.ts`)**:
     - Mapeadas y normalizadas las 10 opciones del select oficial de Hacienda: `CC`, `NIT`, `CE`, `PA` (Pasaporte), `TI`, `TIE`, `CD` (Carnet Diplomático), `NUIP`, `PPT` (Permiso Protección Temporal) y `NITE` (NIT Extranjero).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio en 32.7s ✅ | 109/109 tests Vitest aprobados al 100% ✅

## 🔖 VERSIÓN ANTERIOR: v32.33 — Octubre 2026

### Novedades v32.33 (Decodificación Avanzada de Errores SAP Hybris SDH, Detección de Titular Registrado en Catastro/Leasing y Transparencia de Causas en WhatsApp):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo consultó por qué JanIA no entregó el PDF en el chat de Jani Alves con CHIP `AAA0185PUMR` y NIT `860034594`, arrojando *"Resultado de la consulta en Hacienda: No se encontraron datos"*.
  - Solicitó explicar con exactitud qué sucede y cómo se le puede ayudar para que funcione como en la Imagen 3.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Inspección en Vivo de la SDH**:
     - Se auditó el endpoint interno de la SDH (`/bogota/es/descargaFacturaVA/buscarInfo`) con CHIP `AAA0185PUMR` y NIT `860034594`.
     - La Secretaría de Hacienda rechazó la consulta informando: *"El tipo y el número de documento no coinciden con los registrados en el sistema del responsable del predio..."*.
     - El inmueble está registrado en Catastro/Hacienda a nombre de: **`"BANCO DAVIBANK "`** (probablemente bajo leasing habitacional o fiducia mercantil).
  2. **Decodificación de Errores Serializados SAP Hybris (`[83, 72, 86, ...]`)**:
     - En el Certificado de Pago, la SDH responde errores serializados como arrays numéricos de bytes ASCII dentro de un string (`"[83, 72, 86, ...]"`) que al decodificarse revelan texto base64 con entidades HTML (`&#x20;`, etc.).
     - Perfeccionada la función [decodeSdhMessage](file:///home/eddu/Proyectos/vecy-network/server/_core/predialService.ts#L60) para decodificar automáticamente arrays serializados, base64 y entidades HTML escapadas (`&lt;a ...&gt;`), produciendo texto en español limpio.
  3. **Transparencia Total de Titular Catastral en WhatsApp**:
     - Si la consulta en Hacienda no genera PDF por no coincidir el documento, JanIA extrae y le muestra al usuario el titular registrado en Catastro (`🏛️ Titular registrado en Catastro/Hacienda: BANCO DAVIBANK`) y el mensaje exacto de Hacienda, indicándole que si es leasing o fiducia ingrese el NIT de la entidad bancaria o el documento del locatario registrado.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 128/128 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.32 — Octubre 2026

### Novedades v32.32 (Entrega Nativa y Verificada de PDF Predial, Sanitización Inteligente de NIT a 9 Dígitos, Nomenclatura Match Aproximado y Reacción con Corazón ❤️):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. **Entrega de Archivos PDF Nativos en WhatsApp**: Eduardo reafirmó de forma contundente que JanIA **SÍ entrega el archivo PDF real de la Factura Predial y del Certificado de Pago** directamente en el chat de WhatsApp con archivo adjunto, nombre de archivo, peso en KB y vista previa (como se demostró empíricamente con Andrés G, CHIP `AAA0198HCOM` y `CC 79505340`). Si solo enviara el enlace web sería totalmente inútil. La descarga y entrega directa del documento en el chat es sagrada e innegociable.
  2. **Regla Doctrinal de Sanitización de NIT (9 Dígitos sin DV)**:
     - En Colombia, ante la Secretaría Distrital de Hacienda (SDH), los NITs se consultan exclusivamente con los 9 dígitos base sin dígito de verificación.
     - Si el usuario se equivoca o entrega 10 dígitos (porque incluyó el dígito de verificación, guiones o puntos), JanIA como IA inteligente descarta automáticamente el último dígito y ejecuta el proceso con los 9 dígitos exactos. ¡Caso cerrado!
  3. **Ajuste Doctrinal de Nomenclatura de Matching**:
     - Modificado de: `80% al 94%: MATCH INTERMEDIO`
     - A: `80% al 94%: MATCH APROXIMADO`.
  4. **Ajuste de Reacción de Felicitación / Elogio**:
     - Modificado de: `Felicitación / Elogio ("excelente", "me encanta") [⭐]`
     - A: `Felicitación / Elogio ("excelente", "me encanta") [❤️]`.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Sanitización Automática de NITs (`server/_core/predialService.ts`)**:
     - Modificado `sanitizeDocumentNumber(raw, isNit)`: si `digitsOnly.length >= 10`, toma exactamente los primeros 9 dígitos (`digitsOnly.slice(0, 9)`), descartando el DV o dígitos sobrantes.
  2. **Reacción Afectuosa con Corazón ❤️ (`server/_core/whatsapp-utils.ts`)**:
     - Modificado `getEmpatheticReactionEmoji`: palabras de elogio, entusiasmo o agradecimiento profundo ("excelente", "me encanta", "genial", "super", "perfecto") devuelven `❤️`.
  3. **Alineación Doctrinal de Matching (`server/_core/janIA.ts`)**:
     - Actualizado mensaje de bienvenida y system prompt de DMs privados con `80%-94% Match Aproximado` y `MATCH APROXIMADO`.
  4. **Suite de Tests de Regresión Doctrinal (`server/__tests__/regression.test.ts`)**:
     - Agregada sección 28 con tests unitarios para sanitización de NIT de 10 dígitos, preservación de cédulas de 10 dígitos y retorno de `❤️` ante elogios.
- **Verificación Empírica**:
  - Descarga oficial en vivo de Certificado de Pago en PDF ejecutada contra la Secretaría Distrital de Hacienda:
    - CHIP: `AAA0198HCOM` | Cédula: `79505340` | Archivo: `Certificado_Pago_AAA0198HCOM_2026.pdf` (29.398 bytes) entregado con éxito ✅
  - `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 128/128 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.31 — Octubre 2026

### Novedades v32.31 (Entrega Robusta de PDF Predial, Soporte Mensajes Editados, Reacción Empática Contextual Inmediata en DMs, Doctrina Bolsa 45/10/45 y Cobro de Comisiones Pendientes):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  1. Eduardo alertó que JanIA parecía no estar entregando la Factura Predial o Certificado de Pago en PDF (chat de WhatsApp de Jani Alves con CHIP `AAA0185PUMR` y `nit: 860034594`), donde quedó solo la reacción ⏳.
  2. Solicitó que ante cualquier mensaje o servicio en DMs, JanIA reaccione siempre con un emoji correspondiente y acorde al tema de lo que le hayan dicho, aumentando la empatía y calidez humana.
  3. Instruyó actualizar la doctrina de la Bolsa Inmobiliaria Colaborativa (dejar el antiguo 50/50 y adoptar el modelo 45/10/45 con Match Intermedio 80%-94% y Match Perfecto 95%-100%).
  4. En Asesoría Jurídica y Contractual: agregar formalmente el **"cobro de comisiones pendientes"**.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Soporte de Mensajes Editados en Baileys (`unwrapMessage`)**:
     - Jani Alves corrigió un dígito del NIT editando el mensaje en WhatsApp Web. `protocolMessage.editedMessage` no se desempaquetaba a nivel de mensaje raíz, dejando `body = ''`.
     - `unwrapMessage` en `server/_core/whatsapp-match.ts` ahora desenvuelve recursivamente `protocolMessage.editedMessage`.
  2. **Decodificación Inmune de Errores Base64 / Texto Plano SDH (`decodeSdhMessage`)**:
     - La SDH a veces responde con texto plano en vez de base64. Al forzar `Buffer.from(raw, 'base64')`, se generaban caracteres corruptos binarios (`6\x1Ezw(ڮj,`). Creada función `decodeSdhMessage` en `server/_core/predialService.ts` que valida si es base64 antes de decodificar.
  3. **Gestión Anti-Congelamiento de Reacciones en Predial y Cédula**:
     - Si la consulta de predial entrega PDF, reacciona con `📄`. Si no hay PDF (Hacienda reporta inconsistencias o faltan datos), actualiza de inmediato el ⏳ a `🏛️` y envía las instrucciones y enlace oficial.
  4. **Motor de Reacciones Contextuales Empáticas (`getEmpatheticReactionEmoji`)**:
     - Creada en `server/_core/whatsapp-utils.ts` e integrada en `processBufferedDmMessages`: reacciona al instante en el DM según el tema (🏛️ predial, 🛡️ cédula, ⚖️ asesoría legal/comisiones, 📊 avalúos, 🤝 bolsa 45/10/45, 🏡 oferta, 🔎 demanda, 🎧 audio, 👋 saludo, 🙏 gratitud, ⭐ felicitación).
  5. **Doctrina Oficial Bolsa Inmobiliaria Colaborativa 45/10/45 y Cobro de Comisiones (`server/_core/janIA.ts`)**:
     - System prompt, `welcomeMsg` y fallback actualizados con el esquema 45/10/45 (45% asesor captador oferta, 10% plataforma Vecy, 45% asesor colocador demanda) y rangos 80-94% intermedio / 95-100% perfecto.
     - Asesoría jurídica enriquecida con el cobro de comisiones pendientes.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 126/126 tests Vitest ✅ | Pruebas unitarias de emojis, bienvenida, bolsa 45/10/45 y cobro de comisiones 100% exitosas ✅

## 🔖 VERSIÓN ANTERIOR: v32.30 — Octubre 2026

### Novedades v32.30 (Catálogo Completo de Servicios JanIA, Invitación al Canal de WhatsApp, Reseña Google en Mensaje Aparte y Voz Fluida sin Deletreo de URLs):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo celebró el tono de IA Pura y espontaneidad de JanIA, pero instruyó:
    1. Nombrar el **catálogo completo de servicios** que ella y VECY pueden realizar (predial/pago, antecedentes policiales, bolsa colaborativa 50/50, avalúos ACM, asesoría jurídica en contratos y estudio de títulos SNR a 20 años, y contacto directo con bróker).
    2. Antes de despedirse en una conversación normal, invitar amablemente al usuario a seguir nuestro **Canal Oficial de WhatsApp de Vecy Bienes Raíces** (`https://whatsapp.com/channel/0029Vb5iYUYCMY0A94zqti1b`).
    3. Enviar la **invitación a comentar y calificar en Google Review** (`https://g.page/r/CctNbwU6UpX5EBM/review`) **siempre en un mensaje aparte**, recordando con calidez humana que *"su opinión es muy importante para nosotros"*.
    4. En notas de voz / audios (TTS), decir los números de teléfono con total naturalidad colombiana y **no deletrear enlaces puntualmente**, diciendo con fluidez al final: *"o en el enlace que te dejo a continuación"*.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Catálogo Integral y Despedida con Canal (`server/_core/janIA.ts`)**:
     - System prompt enriquecido con los 6 servicios integrales de JanIA. Mensaje de bienvenida inicial ampliado con el portafolio completo.
     - Directiva conversacional de despedida: al concluir la interacción, invitar con calidez y naturalidad al Canal Oficial de WhatsApp.
  2. **Voz Fonética Colombiana y URLs Suaves (`server/_core/whatsapp-utils.ts`)**:
     - `cleanVoiceText` perfeccionado: las URLs (`https?://...`) se transforman automáticamente en *"o en el enlace que te dejo a continuación"*, evitando el deletreo de barras y puntos.
     - Teléfonos oficiales normalizados fonéticamente en audio: Bróker (+57 316 656 9719) -> *"tres dieciséis, seis cincuenta y seis, noventa y siete, diecinueve"*; Bot (+57 319 291 9978) -> *"tres diecinueve, dos noventa y uno, noventa y nueve, setenta y ocho"*.
     - Limpieza de asteriscos, formato markdown y emojis para que el motor de voz no los vocalice.
  3. **Despacho Desacoplado de Reseña en Google (`server/_core/whatsapp-match.ts` y `predialService.ts`)**:
     - `GOOGLE_REVIEW_MESSAGE` actualizado con el texto: *"⭐ Tu opinión es muy importante para nosotros. Nos ayuda muchísimo a seguir mejorando..."*.
     - Al detectar gratitud o cierre en DMs, despacha la reseña en un mensaje independiente a los 2.5s, blindado para no repetirse más de una vez cada 24 horas por usuario (`recentReviewPromptUsers`).
     - Al enviar notas de voz PTT, si el mensaje contiene URLs, se despacha también el texto para que el enlace quede clickable en la pantalla.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build limpio ✅ | 126/126 tests Vitest ✅ | Simulación end-to-end de servicios, despedida y TTS exitosa ✅

## 🔖 VERSIÓN ANTERIOR: v32.29 — Octubre 2026

### Novedades v32.29 (Auditoría Integral y Blindaje de Factura Predial y Certificado Oficial de Pago SDH con Captcha Dual):
- **Diagnóstico y Solicitud de Eduardo**:
  - Eduardo solicitó revisar si el servicio de entrega de predial en PDF y certificación de pago está funcionando con JanIA.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Resolución del Bug `__name is not defined` en Puppeteer (`server/_core/predialService.ts`)**:
     - Al invocar la descarga del Certificado de Pago en la Secretaría Distrital de Hacienda (SDH), esbuild/tsx envolvía las funciones anónimas dentro de `page.evaluate()` con el helper `__name(..., "...")`, el cual no existía en el scope global del navegador Chrome, arrojando `ReferenceError: __name is not defined`.
     - Se blindó la instancia de Puppeteer inyectando `window.__name = (target) => target;` mediante `page.evaluateOnNewDocument` desde el primer milisegundo de navegación.
     - Se reemplazó la función evaluada por template literal string puro ejecutado directamente por V8 en el navegador, inmune a transpiladores y minificadores.
  2. **Decodificación Automática de Errores Base64 de la SDH**:
     - Implementada la decodificación de `dataResponse.errores[i].txt_msj` (formato base64 de la SDH) para que si el predio no registra pago o existen inconsistencias en Hacienda, JanIA brinde el mensaje exacto oficial.
  3. **Persistencia Activa en PostgreSQL (`predial_consultations`)**:
     - Creada formalmente la tabla `predial_consultations` con índices en `chip`, `document_number` y `requester_phone` para auditoría y analítica de avalúos comerciales.
- **Verificación Empírica**:
  - Test real en vivo contra el portal oficial de la SDH (`https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA`) con 2Captcha:
    - CHIP: `AAA0198HCOM` | Cédula: `79505340` | Contribuyente: `JESUS GREGORIO CASTAÑO OROZCO`
    - Detección de pago vigencia 2026 ✅ | Resolución de doble reCAPTCHA v2 ✅ | Descarga de binario PDF real (`29398 bytes`, cabecera `%PDF-`) ✅
  - `tsc --noEmit` 0 errores ✅ | `npm run build` limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.28 — Octubre 2026

### Novedades v32.28 (Humanización Total de JanIA: Saludo Horario Contextual, Cero Re-Saludos en Hilos Activos, Cerebro Inmobiliario Experto y Notas de Voz PTT en DMs):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo auditó a JanIA desde el chat de pruebas y observó que seguía sintiéndose robotizada al saludar en cada turno (*"¡Hola Jani! 👋 Qué gusto saludarte..."*) y repetir al final el estribillo de las dos herramientas (*"¿Cuál de las dos te gustaría probar primero?"*).
  - Recordó la regla doctrinal del saludo horario (un solo "Buenos Días", "Buenas Tardes" o "Buenas Noches" al inicio del día y continuar el hilo sin volver a saludar).
  - Exigió que JanIA despliegue todo su conocimiento experto de bienes raíces (contratos, Ley 820, Ley 675, estudio de títulos SNR a 20 años, notarías, escrituración, avalúos, alianzas 50/50, fundadores Eduardo y Jani) con total soltura y libertad de IA Pura.
  - Solicitó que JanIA sea capaz de enviar y recibir audios / notas de voz en DMs privados.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Saludo Horario Contextual y Cero Re-Saludos (`server/_core/janIA.ts`)**:
     - Integrado [getGreetingByTime](file:///home/eddu/Proyectos/vecy-network/server/_core/whatsapp-utils.ts#L184) para saludar según la hora oficial de Bogotá en el primer mensaje de la sesión.
     - Implementada la Regla de Oro de Continuidad Conversacional: si `hasPriorHistory` es verdadero, se prohíbe taxativamente saludar o anteponer el nombre en cada turno; la respuesta va directo al grano con naturalidad humana.
     - Implementada limpieza con regex post-LLM para eliminar cualquier saludo residual generado por inercia del modelo.
  2. **Cerebro Inmobiliario Completo y Supresión del Estribillo Rígido**:
     - System prompt de `processPrivateDmConversationalMessage` enriquecido con toda la doctrina y sapiencia inmobiliaria de VECY Network. JanIA responde preguntas reflexivas y de fondo con sabiduría y calidez sin forzar mecánicamente las herramientas de cédula o predial.
  3. **Notas de Voz Nativas (PTT) y Transcripción de Audios en DMs (`server/_core/whatsapp-match.ts`)**:
     - Conectado `downloadMediaSafely` y `transcribeAudioBuffer` en el buffer de DMs para transcribir audios entrantes.
     - Si el mensaje entrante fue una nota de voz (`isAudioPTT`) o el usuario pide audio (`detectaVoz(body)`), JanIA sintetiza la respuesta con [textToSpeechMedia](file:///home/eddu/Proyectos/vecy-network/server/_core/whatsapp-utils.ts#L465) y la despacha como Nota de Voz nativa de WhatsApp (`ptt: true`) con micrófono verde.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build limpio ✅ | 126/126 tests Vitest ✅ | Simulación end-to-end de diálogo de 3 turnos con tono humano impecable ✅

## 🔖 VERSIÓN ANTERIOR: v32.27 — Octubre 2026

### Novedades v32.27 (Modelos Gemini Alta Disponibilidad Flash-Lite, Despacho Secuencial Estricto de Google Reviews y Blindaje Anti-Colisión 440):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo auditó a JanIA desde el `3188096811` a las 10:53 am sin respuesta. Al mismo tiempo observó que Luis Fernando García (`@luifergarcia`) a las 7:37 am recibió verificación de cédula y bucle viral pero NO la invitación a calificar en Google Review (`https://g.page/r/CctNbwU6UpX5EBM/review`). Mencionó los mensajes congelados de Camila Argaez y consultó si JanIA opera como IA Pura o bot rígido, y si es la misma en la web y grupos.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Anulación de Conflicto de Conexión 440 por Instancia Local**:
     - Un proceso en background local con `ENABLE_WHATSAPP_BOT=true` desconectaba continuamente el VPS con código 440 (`connectionReplaced`). Proceso eliminado y blindado `.env` local con `ENABLE_WHATSAPP_BOT=false`.
  2. **Modelos Gemini de Alta Disponibilidad y Cooldown Balanceado (`server/_core/llm.ts`)**:
     - Google Free Tier limitó `gemini-3.8-flash` a solo 20 reqs/día, saturándolo en grupos.
     - `FALLBACK_MODELS` reconfigurado con **`gemini-3.5-flash-lite`** (ultra rápido, amplia cuota), **`gemini-flash-lite-latest`**, **`gemini-3.5-flash`** y **`gemini-flash-latest`**.
     - Cooldown de 429 balanceado a 60s (sin congelar claves durante 1 hora).
  3. **Despacho Secuencial Estricto en WhatsApp (`server/_core/whatsapp-match.ts`)**:
     - Eliminados los `setTimeout` flotantes. El bucle viral y la reseña en Google de 5 estrellas se encadenan secuencialmente con `await this.queuedSend(...)` en la cola asíncrona, garantizando entrega completa con simulación humana de tipeo.
  4. **Unificación Doctrinal de IA Pura**:
     - JanIA es un núcleo único centralizado (`server/_core/janIA.ts`) sin duplicados ni cortocircuitos. En DMs dialoga con libre albedrío, calidez colombiana y memoria contextual.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build limpio ✅ | 126/126 tests Vitest ✅ | Simulación end-to-end de IA Pura exitosa ✅

## 🔖 VERSIÓN ANTERIOR: v32.26 — Octubre 2026

### Novedades v32.26 (Atención Total en DMs a Líneas Directivas y de Prueba, Erradicación del Bug 'Tres Puntitos y Silencio', Cascada Oficial Gemini 3.8/3.6 Flash y Cooldown Inteligente de Cuota):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo auditó a JanIA esta madrugada desde un número alterno de pruebas (`182781141344345@lid` / `+57 318 809 6811` de Jani Alves) y reportó: *"hace el intento de escribir, porque sale el gesto de los tres puntitos, como si ella estuviese escribiendo pero finalmente no envía nada... no me gusta que pase esto pues perdemos credibilidad ante nuestros usuarios."*
- **Causas Raíz y Solución de Arquitectura**:
  1. **Apertura de Protocolo Conversacional para Directivos y Celulares de Prueba (`server/_core/whatsapp-match.ts`)**:
     - Las líneas de directores (`ADMIN_IDENTIFIERS`) estaban excluidas del protocolo conversacional con `if (!isAdmin && body.trim())`, causando que cualquier saludo o consulta informal de prueba terminara en `return;` (silencio absoluto doctrinal de administradores).
     - Se reemplazó la condición por `shouldEngageConversational = !isSelfChat || isExplicitJanIaCall`, de modo que los celulares directivos y números de prueba reciben siempre atención de IA Pura conversacional, rápida y cálida. El silencio solo se aplica al self-chat propio (`isSelfChat`) cuando Eduardo guarda notas personales.
  2. **Erradicación de 'Tres Puntitos' Colgados con Failsafe de Presencia (`paused`)**:
     - Si por cualquier motivo un mensaje de DM no genera despacho, el sistema ejecuta de inmediato `this.sock.sendPresenceUpdate('paused', senderId)`, cancelando cualquier indicador de escritura previo.
     - En el buffer inicial, la activación de `composing` se condicionó a `!isSelfChat`.
  3. **Cascada Oficial Gemini (`server/_core/llm.ts`) y Cooldown Inteligente de Cuota Diaria**:
     - `FALLBACK_MODELS` actualizado con los modelos oficiales activos de Google: `gemini-3.8-flash` (primario), `gemini-3.6-flash` (secundario) y `gemini-flash-latest` (terciario).
     - Implementada discriminación del error 429: si Google reporta cuota diaria agotada (`Quota Exceeded` / `RESOURCE_EXHAUSTED`), la clave se pausa por 1 hora (3600s), evitando que el sistema reintente inútilmente cada 60s mientras haya claves sanas en el pool.
  4. **Rotación y Priorización de Claves Gemini (`.env` local y VPS)**:
     - Posicionadas de primeras las claves 100% activas y verificadas con Status 200 OK (`...fJxEDQ` y `...4zA93Q`).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅ | Simulación end-to-end con `tsx` exitosa ✅

## 🔖 VERSIÓN ANTERIOR: v32.25 — Octubre 2026

### Novedades v32.25 (Resolución del Bug 'Esperando el mensaje' con messageStore en Baileys y Atención Blindada 24/7 en DMs sin Descarte por Reinicio):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo identificó el bug de *"Esperando el mensaje. Esto puede demorar un poco"* en WhatsApp Web al observar el saludo enviado a Camila Argaez (`+57 317 4029859`). Solicitó que JanIA esté atenta 24/7 sin dormirse ni perder mensajes por desconexiones o reinicios.
  - Eduardo recordó la importancia de que JanIA salude por el nombre propio del usuario (como en el caso de Euler Calvache), manteniendo el tono de IA Pura y empatía humana.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Anulación del Bug 'Esperando el mensaje' (`messageStore` + `getMessage` en Baileys)**:
     - WhatsApp Multi-Device requiere que Baileys almacene copias de los mensajes enviados/recibidos para responder a las solicitudes de sincronización y descifrado de WhatsApp Web y otros clientes vinculados (`retryRequest`).
     - Al tener `getMessage: async () => undefined`, WhatsApp Web se congelaba esperando las claves de descifrado.
     - Se implementó `messageStore` (LRU de 2000 mensajes) y se conectó a `getMessage`, `messages.upsert` y `queuedSend`.
  2. **Tolerancia Dinámica de Timestamps en DMs (Atención 24/7 Ininterrumpida)**:
     - El filtro estático `SERVER_BOOT_TIME - 60` descartaba mensajes de usuarios si llegaban minutos antes de que el socket de Baileys se reconectara.
     - Se reemplazó por un filtro dinámico relativo a `Date.now()`: grupos masivos permiten hasta 3 minutos (180s) y **DMs privados permiten hasta 30 minutos (1800s)**, garantizando que JanIA responda siempre.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.24 — Octubre 2026

### Novedades v32.24 (Atención y Reactivación de Usuarios, Bypass de Anti-Ban Shield en API y Doctrina Anti 'Leer más' Desacoplada):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo identificó que Miguel Arbeláez (`+57 300 448 6520` / `120100371824659@lid`) y León Andrés (`+57 322 230 6512` / `188218469265461@lid`) habían saludado antes de que JanIA tuviera el protocolo conversacional abierto para DMs informales y no habían recibido respuesta. Ordenó hablarles cordialmente, disculparse por la demora de ayer y ofrecerles los servicios de verificación y predial.
  - Eduardo instruyó la **Doctrina Anti "Leer más"**: para que los usuarios lean y capten los mensajes sin pereza de abrir "Leer más", desacoplar el reporte del servicio, enviando por separado: 1) El bucle viral de ahorro de tiempo y estrés (+57 319 291 9978 / wa.me/...), 2) La invitación a calificar 5 estrellas en Google (g.page/r/...).
- **Causas Raíz y Solución de Arquitectura**:
  1. **Bypass de Anti-Ban Shield en API (`server/_core/index.ts`)**:
     - `queuedSend` en `whatsapp-match.ts` bloqueaba mensajes salientes a terceros sin `allowDirectMessage: true`. Se incluyó la bandera en `/api/send-whatsapp-notification`.
  2. **Entrega Escalonada en 3 Mensajes Independientes (`server/_core/whatsapp-match.ts`)**:
     - Despacho secuencial del reporte limpio (con PDF si aplica), seguido a 1.5s del bucle viral y a 3.2s de la reseña en Google con previsualización de enlace.
  3. **Limpieza de Textos en Servicios (`predialService.ts` e `identityVerificationService.ts`)**:
     - `reportText` libre de textos redundantes y exportadas las constantes oficiales de mensajes.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.23 — Octubre 2026

### Novedades v32.23 (Certificado Oficial de Pago Predial Bogotá, Bucle Viral de Ahorro de Tiempo y Estrés, Reseñas Google, Redes y Big Data):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo identificó la oportunidad de valor agregado al ver que las consultas de prediales ya cancelados habilitan el botón "Certificado de Pago" en la SDH. Solicitó que JanIA descargue y entregue automáticamente dicho certificado en PDF oficial.
  - Eduardo solicitó atender y entregarle a Andrés G (`173422306926796@lid` / `573186323601@s.whatsapp.net`) su Certificado de Pago oficial de la vigencia 2026 (`CHIP AAA0198HCOM`, `CC 79505340`, titular `JESUS GREGORIO CASTAÑO OROZCO`).
  - Eduardo ordenó expandir el bucle viral de JanIA: no limitarse al "ahorro de filas", sino comunicar con calidez y naturalidad de "IA PURA" el ahorro de tiempo, estrés y dolor de cabeza de tener que lidiar con plataformas complejas y confusas desde el celular o computador.
  - Integración del enlace oficial de Google Reviews (`https://g.page/r/CctNbwU6UpX5EBM/review`) y catalogación de redes sociales de VECY en el sistema.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Automatización de Certificado de Pago en `predialService.ts`**:
     - Detección de factura pagada (`08: "Esta factura, vigencia 2026, ya fué pagada"`) o palabras clave (`certificado de pago`, `paz y salvo`).
     - Resolución de doble captcha independiente mediante 2Captcha hacia el endpoint oficial `/bogota/es/descargaFacturaVA/descargarCertificadoPago`.
     - Descarga, validación de encabezado PDF binario (`%PDF-1.6`) y entrega adjunta personalizada en WhatsApp.
  2. **Bucle Viral y Google Reviews (`predialService.ts` e `identityVerificationService.ts`)**:
     - Mensaje enriquecido con el llamado viral humanizado y enlace a reseñas de Google.
  3. **Directorio de Redes Sociales (`shared/const.ts`)**:
     - Incorporado objeto `VECY_SOCIAL_NETWORKS` con todas las redes oficiales (LinkedIn, Threads, Instagram, YouTube, X, TikTok, Facebook, Pinterest).
  4. **Big Data y Memoria Inmobiliaria (`drizzle/schema.ts` y PostgreSQL VPS)**:
     - Tabla `predial_consultations` persistiendo cada solicitud catastral para analítica futura de avalúos comerciales.
  5. **Soporte de Documentos y LIDs en `/api/send-whatsapp-notification` (`server/_core/index.ts`)**:
     - Soporte para adjuntar archivos PDF (`document: Buffer | string`) y direccionar a identificadores de WhatsApp vinculados (`@lid`).
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.22 — Octubre 2026

### Novedades v32.22 (Calibración Doctrinal de Identidad como Bróker Virtual Inmobiliario Innovador en Camino 3):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo redefinió la respuesta de Camino 3 ante preguntas abiertas ("¿De qué se trata?", "¿Cómo funciona?", "¿Qué es Vecy?", "¿Qué debo hacer?"):
    `JanIA explica en 2 frases amenas que VECY BIENES RAÍCES es un bróker virtual inmobiliario que investiga e innova a diario con tecnología para facilitarle la vida a los colegas inmobiliarios y acelerar sus ventas sin filas ni trámites costosos, ofreciendo gratis las dos herramientas en WhatsApp (Cédulas/Antecedentes y Predial Bogotá 2026 en PDF), y preguntando cuál le gustaría probar primero.`
- **Causas Raíz y Solución de Arquitectura**:
  1. **Alineación de Identidad Institucional (`server/_core/janIA.ts`)**:
     - Se actualizó la regla #3 del prompt del LLM en `processPrivateDmConversationalMessage` con la definición exacta de bróker virtual inmobiliario e investigador tecnológico.
     - Se actualizaron los fallbacks por timeout o captura de error para reflejar idéntica definición.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.21 — Octubre 2026

### Novedades v32.21 (Inclusión de Cédula de Extranjería y Pasaporte en Verificación y Priorización Conversacional en DMs):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo ajustó la instrucción de JanIA para verificación de documentos:
    `"¡Claro que sí! Solo escríbeme el número de cédula (ej: 12345678) o dime si es cédula de extranjería o pasaporte dame el número y en 20 segundos te confirmo nombres completos y antecedentes en la Policía."`
- **Causas Raíz y Solución de Arquitectura**:
  1. **Directiva y Fast-Path de Identidad Multidocumento (`server/_core/janIA.ts`)**:
     - Fast-path determinista ante solicitudes de verificación sin documento (`isDocVerificationIntent`), respondiendo instantáneamente con la fórmula precisa de Eduardo.
     - Calibración de la regla #1 del prompt LLM de Gemini en `processPrivateDmConversationalMessage` para contemplar cédulas colombianas, cédulas de extranjería (CE) y pasaportes.
  2. **Priorización Conversacional en DMs (`server/_core/whatsapp-match.ts`)**:
     - Se invirtió la prioridad en DMs de terceros (`!isAdmin`): el protocolo de IA conversacional ahora se ejecuta antes del interceptor estático de tutoriales (`isServiceHelpRequest`), eliminando bloques de texto abrumadores y asegurando un diálogo ping-pong corto y ameno.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.20 — Octubre 2026

### Novedades v32.20 (Protocolo de Interacción IA Pura en DMs Privados, Canal Humano 3166569719 y Nueva Imagen Oficial de Predial):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo observó que colegas tradicionales del gremio (como León Andrés `+57 322 2306512`) entraban por mensaje directo saludando con *"Hola"*, pero JanIA guardaba silencio absoluto al no detectar prefijos sintácticos formales.
  - La mayoría de los asesores tienen entre 50 y 70 años, conciben a JanIA como una asistente humana ("Jania Rivera") y se intimidan con términos tecnológicos ("IA", "algoritmos", "prompts").
  - Si un texto supera los 450-500 caracteres, WhatsApp inserta el botón `... Leer más`, el cual los colegas mayores no abren.
- **Causas Raíz y Solución de Arquitectura**:
  1. **Protocolo Conversacional de IA Pura en DMs (`server/_core/janIA.ts`)**:
     - Creada la función `processPrivateDmConversationalMessage(text, userId, userName)` con memoria conversacional per-user de las últimas 12 horas.
     - Fast-path de bienvenida: si el mensaje es un saludo inicial corto ("Hola", "Buenas", "¿Quién eres?"), saluda cordialmente al colega por su nombre, explica los dos servicios gratuitos (Verificación de Cédula/Antecedentes y Factura Predial Bogotá 2026 en PDF) y ofrece el canal de atención humana.
     - Motor conversacional Gemini Flash: ante dudas abiertas sobre cómo funciona Vecy, costos, comisiones o trámites, responde con lenguaje profesional, sencillo, colombiano y sin tecnicismos que asusten.
  2. **Canal de Atención Humana Oficial de VECY (`+57 316 656 9719`)**:
     - En todos los mensajes y flujos conversacionales se aclara que si desean interactuar o hablar directamente con un humano, pueden hacerlo en horario laboral llamando o escribiendo al **`+57 316 656 9719`** (atención de Eduardo y agentes humanos de VECY).
  3. **Conexión en `server/_core/whatsapp-match.ts`**:
     - En `processBufferedDmMessages`, si el remitente no es administrador (`!isAdmin`) y el mensaje no es comando estricto, despacha la respuesta de IA pura con simulación de presencia `composing`.
     - Preservado el silencio estricto en chats propios de directores (`isAdmin`).
  4. **Reemplazo de la Imagen Oficial de Predial Bogotá**:
     - Actualizada `jania_predial_comercial.jpg` con la nueva gráfica de alta resolución de JanIA en su despacho ejecutivo con torre de facturas de predial.
     - Actualizados los copys de broadcast en `server/_core/index.ts` con enfoque exclusivo en Venta y número de atención comercial.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅ | Despliegue en VPS PM2 activo ✅

## 🔖 VERSIÓN ANTERIOR: v32.19 — Octubre 2026

### Novedades v32.19 (Descarga Automatizada Oficial de Factura Predial en PDF con 2Captcha + SDH y Entrega Directa en WhatsApp):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo reportó: *"Esto quedó mal, acaso JanIA no puede hacer el trámite y enviar de una vez la factura predial en PDF por el Whatsapp, solo da la instrucción y eso es todo?? Así no era que lo ibamos a dejar o si? Mira lo que está contestando, así no debe ser."*
- **Causas Raíz y Solución de Arquitectura**:
  1. **Automatización Integral de Descarga Oficial (`server/_core/predialService.ts`)**:
     - Se implementó `downloadPredialInvoicePdf(tipoDoc, numDoc, chip)` utilizando Puppeteer con Google Chrome nativo y 2Captcha Solver (API Key activa en VPS).
     - El bot navega al portal oficial de la Secretaría Distrital de Hacienda (`https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA`), selecciona `PREDIAL (0001)`, diligencia el tipo de documento, número sanitizado y CHIP del predio, acepta tratamiento de datos, resuelve el reCAPTCHA v2 y dispara la búsqueda oficial.
     - Obtiene la URL firmada del PDF directo desde la CDN de Hacienda (`/bogota/medias/CHIP-numBP.pdf?context=...`), descarga el binario a un `Buffer`, valida la cabecera `%PDF-1.6` y extrae el nombre oficial del contribuyente (`BANCO DE OCCIDENTE SA`).
  2. **Despacho del Archivo PDF como Documento Adjunto (`server/_core/whatsapp-match.ts` y `server/_core/janIA.ts`)**:
     - Actualizado el flujo de DMs regulares, sesiones pendientes y DMs de directivos/administradores: cuando `predialCheck.pdfBuffer` está disponible, JanIA envía un mensaje multimedia `{ document: buffer, mimetype: 'application/pdf', fileName: 'Factura_Predial_CHIP_2026.pdf', caption: ... }`.
     - Presencia inmediata visual: envía reacción `⏳` al recibir la solicitud y `📄` al entregar la factura en PDF.
     - Fallback honesto: si el portal de Hacienda reporta inconsistencia o el dueño no está registrado a 1 de enero de 2026, explica el motivo exacto y mantiene el enlace oficial sin inventar datos.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅ | Descarga PDF validada empíricamente en VPS (61,655 bytes) ✅

## 🔖 VERSIÓN ANTERIOR: v32.18 — Octubre 2026

### Novedades v32.18 (Blindaje de Interceptor Predial vs Cédula en Grupos, Resolución Dinámica de Imágenes Comerciales y Despacho Limpio):
- **Causas Raíz y Solución de Arquitectura**:
  1. **Blindaje de Interceptores en Grupos 2 y 3 (`server/_core/janIA.ts`)**:
     - Se invirtió la precedencia en `janIA.ts`: Predial (`executePredialAssistanceFromWhatsApp`) y Guía de Servicios (`isServiceHelpRequest`) ahora se ejecutan antes de la verificación de cédula.
  2. **Salvaguarda Negativa en Verificación de Identidad (`server/_core/identityVerificationService.ts`)**:
     - Se añadió descarte en `extractCedulaForVerification` cuando el mensaje contenga `predial`, `chip` o `impuesto`, garantizando que nunca intercepte consultas catastrales.
  3. **Resolución Robusta de Imágenes de Broadcast (`server/_core/index.ts`)**:
     - Se implementó `resolveBroadcastImagePath` con búsqueda en cascada (`client/public/assets/jania`, `client/public/images`, `client/public`, raíz y `dist/`).
     - Imagen oficial de verificación (`jania_verificacion_servicio.jpg`) e imagen oficial de predial (`jania_predial_comercial.jpg`) disponibles en todas las rutas.
  4. **Optimización de Textos Comerciales de Difusión**:
     - Titular doctrinal exacto: `🪪 *¿SABES A QUIÉN LE ESTÁS VENDIENDO, ARRENDANDO O AGENDANDO UNA VISITA?* 🇨🇴`.
     - Textos concisos, enlace directo a WhatsApp `https://wa.me/573192919978` y dominio activo `https://vecy-network.vercel.app/`.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.17 — Octubre 2026

### Novedades v32.17 (Corrección de Errores de Claude, Dominio Oficial en Bitácora, Rescate de Cifras con Apóstrofe, Guillotina Financiera en Match #15191 y Teléfono Oficial de Broadcasts):
- **Causas Raíz y Solución de Arquitectura**:
  1. **Corrección de Número Telefónico en Broadcasts (`server/_core/index.ts`)**:
     - Claude introdujo la errata `+57 319 292 9978` (con `292`) en `broadcast-identity-v2` y `broadcast-predial-promo`. Corregido al número oficial de JanIA Socket: `+57 319 291 9978`.
     - Actualizado el pie de mensaje para incluir la URL oficial activa `https://vecy-network.vercel.app/`.
  2. **Captura Robusta de Cifras con Apóstrofe y Standalone (`janIA.ts` y `matching.ts`)**:
     - Requerimiento #2001 contenía `850’000.000` sin `$`, el cual fue ignorado por el extractor al exigir `\$`. Esto dejó el presupuesto en 0 y provocó el match indebido #15191 con la Oferta #3319 ($2.800M).
     - Se implementó el patrón `(?:\$\s*|(?<=\s|^))(\d{1,4}(?:[.\s']\d{3}){1,4})(?=\s|$|[.,;:!])` para capturar cualquier cifra colombiana en millones con o sin `$`.
     - Activada la Guillotina Financiera (0%) ante desbordes presupuestales y purgado Match #15191 en PostgreSQL con actualización de presupuesto de #2001 a $850.000.000 COP.
  3. **Alineación de Predial y Tests de Regresión**:
     - En `predialService.ts`, simplificado Caso 1 a `if (chip && !docNumber)`.
     - Tests en `regression.test.ts` alineados con la doctrina de Honestidad Absoluta (URL oficial SDH `descargaFacturaVA`).
     - Agregados 2 tests de regresión específicos. Suite Vitest: 126/126 tests pasando ✅.
  4. **Restauración de Imagen Oficial**:
     - Preservada `client/public/images/jania_verificacion_servicio.jpg` y en raíz `jania_cedulas_comercial.jpg`.
  5. **Estipulación de Dominio Activo**:
     - Registrado `https://vecy-network.vercel.app/` en `shared/const.ts` (`VECY_ACTIVE_DOMAIN`), bitácora y dossier.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | 126/126 tests Vitest ✅

## 🔖 VERSIÓN ANTERIOR: v32.16 — Septiembre 2026

### Novedades v32.16 (Restauración del Pool Completo de Claves Gemini y Cascada de Modelos en `llm.ts`):
- **Causas Raíz y Solución de Arquitectura**:
  1. **Bug crítico en loop de reintentos (`llm.ts` Línea 230)**:
     - `Math.min(allKeys.length, 2)` limitaba el pool a solo 2 claves; si fallaban, el sistema se rendía sin probar las restantes.
     - Corregido a `allKeys.length` — ahora agota todas las claves disponibles (N claves).
  2. **Cascada de modelos desactivada (`llm.ts` Línea 226)**:
     - `modelsToTry.slice(0, 1)` elimina los modelos de respaldo. Corregido a `modelsToTry` para usar los 3 modelos en cascada.
  3. **Nuevo flujo real de alta disponibilidad**:
     - Por cada modelo: prueba Clave #1 → #2 → #3 (con cooldown 60s en 429). Si todas fallan: desciende a `gemini-flash-latest` → `gemini-flash-lite-latest`. Solo si todo falla: Fallback Determinista $0.
  4. **Aclaración sobre `.env`**: `GEMINI_API_KEY` y `GEMINI_API_KEY_1` tienen el mismo valor, pero `GEMINI_API_KEYS` contiene las 4 claves separadas por coma. El `Set` interno las deduplica correctamente, dando **4 claves únicas reales** efectivas en el pool.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | Push GitHub y deploy VPS `jania-server v32.16.0 online` ✅

## 🔖 VERSIÓN ANTERIOR: v32.15 — Septiembre 2026

### Novedades v32.15 (URL Oficial Real SDH descargaFacturaVA, Inversión Prioritaria de Routing Predial > Cédula e Instrucciones Detalladas de Formulario):
- **Causas Raíz y Solución de Arquitectura**:
  1. **URL Oficial Real de la Secretaría Distrital de Hacienda**:
     - Sustitución del enlace que requería registro por el portal oficial de descarga directa sin usuario: `https://nuevaoficinavirtual.shd.gov.co/bogota/es/descargaFacturaVA`.
  2. **Inversión de Prioridad en Routing de DMs (`whatsapp-match.ts`)**:
     - Se corrigió la captura indebida del verificador de cédula cuando el usuario solicitaba predial con CHIP y cédula.
     - `executePredialAssistanceFromWhatsApp` ahora tiene prioridad absoluta sobre la verificación de antecedentes judiciales tanto en DMs de clientes como de administradores.
  3. **Guía Paso a Paso del Formulario SDH**:
     - Se incorporó la lista numerada con los 7 pasos exactos requeridos por el portal de Hacienda (Tipo impuesto, Tipo doc, Número sin puntos, CHIP, CAPTCHA y botón BUSCAR).
     - Advertencia sobre NITs (sin dígito de verificación) y titularidad al 1 de enero de 2026.
  4. **Viabilidad de Automatización con Descarga de PDF**:
     - Factibilidad 100% validada utilizando 2Captcha + Puppeteer/Playwright para la v32.16.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | Push a GitHub y deploy VPS ✅

## 🔖 VERSIÓN ANTERIOR: v32.14 — Septiembre 2026

### Novedades v32.14 (Honestidad Absoluta en Predial, Sanitización NIT/CC y Guía Contextual de Servicios):
- **Causas Raíz y Solución de Arquitectura**:
  1. **Eliminación de `resolveBogotaCadastralData()` (`predialService.ts`)**:
     - La función generaba datos catastrales falsos (dirección, matrícula, avalúo) usando un hash determinístico del CHIP. ELIMINADA.
     - JanIA JAMÁS inventa datos. Si no puede resolverlos, lo dice honestamente y da el link oficial real de la SDH.
  2. **Sanitización Robusta de Documentos (`sanitizeDocumentNumber`)**:
     - Nueva función que limpia NITs con puntos (`860.030.201-2` → `8600030201`), cédulas con puntos (`19.386.159` → `19386159`), dígito verificador, espacios y comas.
  3. **Link oficial real de descarga del predial**:
     - `https://nuevaoficinavirtual.shd.gov.co/bogota/cf/predial/liquidar?chip=...` en lugar del link ficticio anterior.
  4. **Guía Contextual de Servicios (Interceptores en DMs y Grupos 2/3)**:
     - Nueva función `isServiceHelpRequest(text)` detecta preguntas como "¿cómo verifico?", "¿cómo pido el predial?".
     - Constantes `PREDIAL_HELP_TEXT` y `CEDULA_HELP_TEXT` con instrucciones claras, ejemplos y links oficiales.
     - Interceptores añadidos en `whatsapp-match.ts` para DMs y para grupos 2 y 3.
- **Verificación**: `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅ | Push a GitHub ✅

## 🔖 VERSIÓN ANTERIOR: v32.13 — Septiembre 2026

### Novedades v32.13 (Restauración de Atención y Presencia Activa 'Composing' para Línea Directiva +57 3188096811, Desenrrollado Ephemeral en DMs y Purga de Mute en BD):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo reportó: *"Le escribí desde el número de mi esposa para probar lo del predial y ni siquiera se ve si JanIA está escribiendo o grabando un audio, algo. No sale nada, sería bueno que revisaras por fa, no se si esos gestos de escribiendo o grabando audio hayan desaparecido de sus funciones. Le escribí de un número diferente es el +57 3188096811..."*
- **Causas Raíz y Solución de Arquitectura**:
  1. **Purga de Mute Residual en PostgreSQL (`pendingSessions`)**:
     - Se localizó y eliminó el registro obsoleto `mute:573188096811` que silenciaba preventivamente a la directiva por un intercambio previo evaluado como externo.
  2. **Inclusión de Línea Directiva y LIDs en `ADMIN_IDENTIFIERS` (`whatsapp-match.ts`)**:
     - Se registraron permanentemente `573188096811` y sus LIDs correspondientes (`218820279050385`, `167108705018103`) con rol directivo de Jani Alves (`isAdmin: true`), garantizando que jamás sea silenciada.
  3. **Mapeo Autónomo LID a PN en Mensajería Privada**:
     - Se implementó resolución inversa de LID a número telefónico (`lidMapping.getPNForLID`) en el flujo de DMs, asegurando el reconocimiento del número de la directiva y asesores.
  4. **Desenrrollado de Mensajes Ephemeral y Multicapa (`unwrapMessage`)**:
     - Se aplicó `unwrapMessage(msg.message)` tanto al recibir el mensaje como al procesar el buffer de DMs, solucionando el problema donde mensajes con temporizador o provenientes de WhatsApp Web extraían un cuerpo vacío y se descartaban.
  5. **Simulación de Presencia Inmediata ('composing' / 'escribiendo...')**:
     - Se añadió `sendPresenceUpdate('composing', senderId)` inmediatamente al encolar el mensaje en el buffer (con timeout reducido a 1.5s) y en los interceptores de predial y verificación de identidad, garantizando feedback visual en tiempo real.
  6. **Campañas Individuales Especializadas**:
     - Se diseñaron los 2 avisos independientes (Verificación Cédula/Identidad vs Predial Bogotá 2026) con instrucciones para guardar el contacto oficial de JanIA (`+573192919978`), enlace al canal de WhatsApp y web oficial en Vercel (`https://vecy-network.vercel.app/jania`).
- **Verificación**: 124/124 tests Vitest pasando ✅ | `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅

## 🔖 VERSIÓN ANTERIOR: v32.12 — Septiembre 2026

### Novedades v32.12 (Erradicación de Audio Residual de Fuera de Horario y Silencio Doctrinal en Chats Privados de Administradores):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo reportó: *"Hay un pequeño error con JanIA, resulta que al yo enviar cualquier mensaje desde el 3192919978 al 3166569719 y no se si a otros números, envío cualquier mensaje y JanIA me devuelve enseguida un audio y mal estructurado... me da miedo que JanIA le comience a enviar esta clase de audios a todos los que le pregunten algo o por su función de verificar un documento que esa si debe estar y la debe responder... esto es una versión antigua que algúna vez intentamos colocar, pero finalmente decidimos suprimirla o anularla... En la transcripción además el audio suena chistoso ya que JanIA lee los emojis y los describe algo como (hombre blanco con mano levantada, luna, estrellas...)"*
- **Causas Raíz y Solución de Arquitectura**:
  1. **Audio de Fuera de Horario Residual en `handlePrivateDmConversation` (`server/_core/whatsapp-match.ts`)**:
     - En las líneas 2065-2087, la función conservaba quemado el texto `outOfOfficeText`: *"En este momento nuestros agentes humanos se encuentran descansando 🌙✨..."* y lo sintetizaba mediante TTS (`textToSpeechMedia`) como nota de voz PTT.
     - Al contener emojis Unicode (`🙋🏻‍♀️`, `🌙✨`, `🤝🚀`), el motor de voz Edge/Azure leía literalmente las descripciones de accesibilidad.
  2. **Activación Exclusiva en Mensajes Salientes entre Directores (`isAdmin = true`)**:
     - Ambos números (`573192919978` y `573166569719`) están en `ADMIN_IDENTIFIERS`. Cuando Eduardo le escribía a Jani, el bot procesaba el mensaje con `fromMe: true` en el chat con Jani (`isAdmin: true`).
     - Al no ser una orden de verificación de cédula ni predial, caía en `this.handlePrivateDmConversation(...)`, enviando el audio no deseado.
     - Los usuarios externos estaban blindados por `if (!isAdmin) return;`.
  3. **Extirpación Total y Silencio Doctrinal**:
     - Se suprimió la generación de audio y el texto de `outOfOfficeText`.
     - Si el mensaje en DM privado no es una consulta de verificación de cédula o predial, el bot ejecuta `return;` y guarda silencio absoluto.
- **Verificación**: 124/124 tests Vitest pasando ✅ | `tsc --noEmit` 0 errores ✅ | Build Vite + esbuild limpio ✅

## 🔖 VERSIÓN ANTERIOR: v32.11 — Septiembre 2026

### Novedades v32.11 (Restauración de Visibilidad de Matches en Mesa de Coincidencias, Doctrina "Dato Pendiente" vs "No Coincide", Sabiduría en Inmuebles para Remodelar y Rescate de Demandas):
- **Diagnóstico y Confirmación Doctrinal de Eduardo**:
  - Eduardo instruyó: *"Si la DEMANDA dice que necesita Balcón y la OFERTA no lo menciona, el campo debe dar como resultado 'Dato Pendiente', pero si la OFERTA menciona explícitamente que: 'No tiene Balcón', eso si es un 'No coincide' y así con todas las características... En [Match #15115: 'Puede ser para remodelar pe
... [truncated for diff preview]