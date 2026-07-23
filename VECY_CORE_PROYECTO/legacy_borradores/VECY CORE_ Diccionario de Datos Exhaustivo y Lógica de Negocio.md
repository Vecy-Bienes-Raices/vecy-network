# VECY CORE: Diccionario de Datos Exhaustivo y Lógica de Negocio

**Autor:** Manus AI (Director Técnico)
**Fecha:** 27 de abril de 2026
**Proyecto:** VECY CORE: El Cerebro Inmobiliario

## 1. Introducción

Este documento establece el diccionario de datos detallado y la lógica de negocio fundamental para el Agente IA de VECY CORE. El objetivo es asegurar que la información de inmuebles y requerimientos sea capturada con la máxima granularidad, permitiendo un *matching* preciso y una experiencia de usuario "cero esfuerzo". Se ha diseñado pensando en la escalabilidad y la optimización de recursos gratuitos, con una visión clara hacia la monetización futura.

## 2. Diccionario de Datos Detallado (Supabase)

Las tablas `inmuebles` y `requerimientos` en Supabase se expandirán para incluir características cruciales del mercado inmobiliario, facilitando un *matching* más sofisticado.

### 2.1. Tabla `inmuebles` (Ofertas)

| Campo | Tipo de Dato | Descripción | Notas y Ejemplos |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único del inmueble. | Generado automáticamente. |
| `tipo_inmueble` | `TEXT` | Categoría principal del inmueble. | `Apartamento`, `Casa`, `Local Comercial`, `Oficina`, `Bodega`, `Lote`, `Finca`, `Consultorio`, `Edificio` |
| `tipo_negocio` | `TEXT` | Tipo de transacción. | `Venta`, `Arriendo`, `Arriendo Temporal` |
| `ciudad` | `TEXT` | Ciudad donde se ubica el inmueble. | `Bogotá`, `Medellín`, `Cali` |
| `zona` | `TEXT` | Barrio o sector específico. | `Cedritos`, `Usaquén`, `El Poblado` |
| `direccion_exacta` | `TEXT` | Dirección completa del inmueble. | Opcional, para uso interno o si el usuario la proporciona. |
| `precio` | `NUMERIC` | Precio de venta o canon de arriendo. | Valor numérico, sin símbolos de moneda. |
| `moneda` | `TEXT` | Tipo de moneda del precio. | `COP`, `USD` |
| `area_total_m2` | `NUMERIC` | Área total construida en metros cuadrados. | |
| `area_terreno_m2` | `NUMERIC` | Área del terreno en metros cuadrados (para casas, lotes, fincas). | |
| `habitaciones` | `INTEGER` | Número de habitaciones. | `0` (para locales/oficinas), `1`, `2`, `3+` |
| `banos` | `INTEGER` | Número de baños. | `1`, `2`, `3+` |
| `parqueaderos` | `INTEGER` | Número de parqueaderos. | `0`, `1`, `2+` |
| `antiguedad_anos` | `INTEGER` | Antigüedad del inmueble en años. | `0` (nuevo), `1-5`, `5-10`, `10+` |
| `estrato` | `INTEGER` | Estrato socioeconómico (si aplica). | `1` a `6` |
| `amoblado` | `BOOLEAN` | Indica si el inmueble está amoblado. | `true`, `false` |
| `caracteristicas_adicionales` | `JSONB` | Objeto JSON con características extra. | `{ "balcon": true, "piscina": false, "gimnasio": true, "vigilancia_24h": true, "ascensor": true, "terraza": true, "deposito": true }` |
| `descripcion_corta` | `TEXT` | Breve descripción generada por la IA. | |
| `contacto_nombre` | `TEXT` | Nombre del agente/propietario. | |
| `contacto_telefono` | `TEXT` | Número de teléfono de contacto. | |
| `contacto_email` | `TEXT` | Correo electrónico de contacto. | |
| `url_fotos` | `TEXT[]` | Array de URLs de fotos del inmueble. | Enlaces a Google Cloud Storage, Supabase Storage, etc. |
| `url_video` | `TEXT` | URL de video del inmueble. | Enlace a YouTube, Vimeo, etc. |
| `url_externa_original` | `TEXT` | URL original del CRM/catálogo (si aplica). | Para acceso a información completa. |
| `raw_text_original` | `TEXT` | Texto original del usuario antes de ser procesado. | Para auditoría y mejora de prompts. |
| `estado_publicacion` | `TEXT` | Estado actual de la publicación. | `Activo`, `Inactivo`, `Pendiente Revisión` |
| `id_usuario_whatsapp` | `TEXT` | ID del usuario de WhatsApp que publicó. | Para notificaciones personalizadas. |
| `created_at` | `TIMESTAMPZ` | Fecha y hora de creación del registro. | |
| `updated_at` | `TIMESTAMPZ` | Última fecha y hora de actualización. | |

### 2.2. Tabla `requerimientos` (Demandas)

| Campo | Tipo de Dato | Descripción | Notas y Ejemplos |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Identificador único del requerimiento. | Generado automáticamente. |
| `tipo_inmueble_deseado` | `TEXT` | Categoría de inmueble buscada. | `Apartamento`, `Casa`, `Local Comercial`, etc. |
| `tipo_negocio_deseado` | `TEXT` | Tipo de transacción deseada. | `Compra`, `Arriendo` |
| `ciudad_deseada` | `TEXT` | Ciudad de interés. | `Bogotá`, `Medellín`, `Cali` |
| `zona_deseada` | `TEXT` | Barrio o sector de interés. | `Cedritos`, `Usaquén`, `El Poblado` |
| `presupuesto_min` | `NUMERIC` | Presupuesto mínimo. | Opcional. |
| `presupuesto_max` | `NUMERIC` | Presupuesto máximo. | |
| `moneda_presupuesto` | `TEXT` | Tipo de moneda del presupuesto. | `COP`, `USD` |
| `area_min_m2` | `NUMERIC` | Área mínima deseada en metros cuadrados. | |
| `habitaciones_min` | `INTEGER` | Número mínimo de habitaciones. | `1`, `2`, `3+` |
| `banos_min` | `INTEGER` | Número mínimo de baños. | `1`, `2`, `3+` |
| `parqueaderos_min` | `INTEGER` | Número mínimo de parqueaderos. | `0`, `1`, `2+` |
| `antiguedad_max_anos` | `INTEGER` | Antigüedad máxima deseada. | `0` (nuevo), `1-5`, `5-10`, `10+` |
| `estrato_deseado` | `INTEGER[]` | Array de estratos deseados. | `[3, 4, 5]` |
| `amoblado_deseado` | `BOOLEAN` | Indica si desea amoblado. | `true`, `false`, `null` (indiferente) |
| `caracteristicas_deseadas` | `JSONB` | Objeto JSON con características deseadas. | `{ "balcon": true, "piscina": false, "gimnasio": true }` |
| `descripcion_detallada` | `TEXT` | Descripción del requerimiento. | |
| `contacto_nombre` | `TEXT` | Nombre del interesado. | |
| `contacto_telefono` | `TEXT` | Número de teléfono de contacto. | |
| `contacto_email` | `TEXT` | Correo electrónico de contacto. | |
| `raw_text_original` | `TEXT` | Texto original del usuario. | |
| `estado_requerimiento` | `TEXT` | Estado actual del requerimiento. | `Activo`, `Cerrado`, `Pendiente` |
| `id_usuario_whatsapp` | `TEXT` | ID del usuario de WhatsApp que publicó. | Para notificaciones personalizadas. |
| `created_at` | `TIMESTAMPZ` | Fecha y hora de creación del registro. | |
| `updated_at` | `TIMESTAMPZ` | Última fecha y hora de actualización. | |

## 3. Lógica de Negocio Central (Flujo de Procesamiento Proactivo)

La lógica de negocio se centrará en la experiencia "cero esfuerzo" para el usuario, orquestada por el backend en Vercel/Netlify y potenciada por Google Gemini.

### 3.1. Recepción y Pre-procesamiento (Vercel/Netlify)

1.  **Webhook de Evolution API:** Recibe el mensaje del grupo de WhatsApp. Se valida que provenga del grupo configurado (`ID_DE_TU_GRUPO_WHATSAPP@g.us`).
2.  **Detección de Tipo de Contenido:**
    *   **Texto:** Se extrae el texto del mensaje.
    *   **Imagen/Video:** Se utiliza Google Cloud Vision API para OCR (reconocimiento de texto) o análisis de objetos. El texto extraído se concatena con cualquier descripción del usuario.
    *   **Enlace (URL):** Se detecta si el mensaje contiene una URL. Si es así, se marca para *web scraping*.

### 3.2. Procesamiento Inteligente con Google Gemini

El texto (original, extraído de imagen/video, o de web scraping) se envía a Google Gemini con un *Mega Prompt* diseñado para:

1.  **Clasificación:** Determinar si el mensaje es `INMUEBLE`, `REQUERIMIENTO`, `CONSULTA_GENERAL`, `RESPUESTA_A_PREGUNTA_IA`.
2.  **Extracción de Entidades:** Extraer todos los campos definidos en el diccionario de datos (`tipo_inmueble`, `zona`, `precio`, `parqueaderos`, `url_externa_original`, etc.) en formato JSON.
3.  **Identificación de Datos Faltantes:** Comparar los campos extraídos con los campos obligatorios para el tipo de publicación (Inmueble/Requerimiento) y determinar cuáles faltan.

### 3.3. Flujo de Conversación Guiada (Backend + Gemini)

Basado en la clasificación y los datos faltantes, el backend (coordinado por Antigravity) generará la respuesta:

1.  **Si es `INMUEBLE` o `REQUERIMIENTO` y faltan datos:**
    *   Gemini genera una respuesta amigable, confirmando los datos que ya tiene y preguntando por el campo más crítico que falta (ej. "precio").
    *   Se ofrecen opciones de respuesta rápida (botones) si el campo es de selección múltiple o rango (ej. rangos de precio, número de parqueaderos).
    *   El estado de la conversación se guarda en Supabase para mantener el contexto.
2.  **Si es `INMUEBLE` o `REQUERIMIENTO` y todos los datos están completos:**
    *   Se guarda el registro completo en la tabla correspondiente de Supabase.
    *   Se invoca la `Postgres Function` de *matching*.
    *   Gemini genera un mensaje de confirmación y, si hay *matches*, un mensaje de notificación.
3.  **Si es `RESPUESTA_A_PREGUNTA_IA`:**
    *   Se actualiza el registro en Supabase con la información proporcionada por el usuario.
    *   Se repite el paso 1 (verificar si faltan más datos) o el paso 2 (si ya está completo).
4.  **Si es `CONSULTA_GENERAL`:**
    *   Gemini genera una respuesta informativa o de ayuda, guiando al usuario sobre cómo usar el sistema.

### 3.4. Web Scraping y Enriquecimiento de Datos (Backend + Gemini)

Si se detecta una `url_externa`:

1.  **Descarga y Parseo:** El backend descarga el contenido de la URL. Se utiliza una librería de *web scraping* (ej. `cheerio` en Node.js) para extraer el HTML relevante.
2.  **Extracción con Gemini:** El HTML o texto relevante se envía a Gemini con un *prompt* para extraer los campos del diccionario de datos (fotos, videos, descripción, características, etc.).
3.  **Almacenamiento y Resumen:** La información extraída se guarda en Supabase. Gemini genera un resumen conciso del inmueble, incluyendo el enlace original, para las notificaciones de *match*.

## 4. Lógica de Matching Avanzada (Supabase Postgres Functions)

La lógica de *matching* se ejecutará como `Postgres Functions` en Supabase para máxima eficiencia. Se considerarán todos los campos detallados en el diccionario de datos.

### 4.1. Criterios de Matching Ponderados

El *matching* no será solo una coincidencia exacta, sino que se basará en un sistema de puntuación. Los criterios incluirán:

*   **Coincidencia Exacta:** `tipo_inmueble`, `ciudad`, `zona`.
*   **Rangos:** `precio` (inmueble dentro del `presupuesto_min/max`), `area_total_m2` (inmueble dentro del `area_min_m2`), `habitaciones`, `banos`, `parqueaderos`.
*   **Características:** Coincidencia de `caracteristicas_adicionales` / `caracteristicas_deseadas` (ej. si el requerimiento pide piscina y el inmueble la tiene).
*   **Antigüedad y Estrato:** Coincidencia dentro de rangos o preferencias.

### 4.2. Función de Matching (Concepto Extendido)

La función `buscar_matches_para_inmueble` (y su contraparte para requerimientos) se extenderá para incluir todos los nuevos campos y una lógica de puntuación. Por ejemplo:

```sql
CREATE OR REPLACE FUNCTION buscar_matches_para_inmueble(
    p_inmueble_id UUID
) RETURNS TABLE (
    requerimiento_id UUID,
    score NUMERIC
) AS $$
DECLARE
    v_inmueble inmuebles;
BEGIN
    SELECT * INTO v_inmueble FROM inmuebles WHERE id = p_inmueble_id;

    IF v_inmueble IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        r.id AS requerimiento_id,
        (
            -- Puntuación por tipo de inmueble (alta prioridad)
            CASE WHEN r.tipo_inmueble_deseado = v_inmueble.tipo_inmueble THEN 10 ELSE 0 END +
            -- Puntuación por ciudad (alta prioridad)
            CASE WHEN r.ciudad_deseada = v_inmueble.ciudad THEN 8 ELSE 0 END +
            -- Puntuación por zona (media prioridad)
            CASE WHEN r.zona_deseada = v_inmueble.zona THEN 6 ELSE 0 END +
            -- Puntuación por precio (rango)
            CASE WHEN v_inmueble.precio BETWEEN r.presupuesto_min AND r.presupuesto_max THEN 7 ELSE 0 END +
            -- Puntuación por habitaciones
            CASE WHEN v_inmueble.habitaciones >= r.habitaciones_min THEN 5 ELSE 0 END +
            -- Puntuación por baños
            CASE WHEN v_inmueble.banos >= r.banos_min THEN 4 ELSE 0 END +
            -- Puntuación por parqueaderos
            CASE WHEN v_inmueble.parqueaderos >= r.parqueaderos_min THEN 4 ELSE 0 END +
            -- Puntuación por características adicionales (ejemplo: si el requerimiento pide balcón y el inmueble lo tiene)
            (SELECT COUNT(*)
             FROM jsonb_each_text(r.caracteristicas_deseadas) AS req_char
             WHERE (v_inmueble.caracteristicas ->> req_char.key)::boolean = true
            ) * 2
        ) AS score
    FROM requerimientos r
    WHERE
        r.estado_requerimiento = 'Activo' AND
        v_inmueble.tipo_negocio = r.tipo_negocio_deseado AND
        -- Filtros básicos para reducir el conjunto de búsqueda antes de la puntuación
        v_inmueble.precio BETWEEN COALESCE(r.presupuesto_min, 0) AND COALESCE(r.presupuesto_max, 999999999999) AND
        v_inmueble.habitaciones >= COALESCE(r.habitaciones_min, 0) AND
        v_inmueble.banos >= COALESCE(r.banos_min, 0)
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;
```

La función devolverá los IDs de los requerimientos coincidentes junto con un `score` (puntuación) para priorizar los mejores *matches*. El backend decidirá a partir de qué `score` se considera un *match* relevante para notificar.

## 5. Integración con Antigravity (Coordinación de Alto Nivel)

Antigravity actuará como el "cerebro" estratégico, gestionando el estado de las conversaciones, la toma de decisiones complejas y la optimización de los *prompts* para Gemini. Esto es crucial para la experiencia "cero esfuerzo" y la escalabilidad.

### 5.1. Gestión de Estados de Conversación

Antigravity mantendrá un registro del estado de cada interacción con el usuario (ej. `esperando_precio_inmueble`, `esperando_caracteristicas_requerimiento`). Esto permite al agente retomar la conversación de forma contextual.

### 5.2. Generación Dinámica de Prompts

En lugar de *prompts* estáticos, Antigravity generará *prompts* dinámicos para Gemini, adaptándose al contexto de la conversación y a los datos ya obtenidos. Esto mejora la precisión y reduce el número de tokens utilizados.

### 5.3. Orquestación de Flujos Complejos

Antigravity coordinará la secuencia de acciones: cuándo llamar a Gemini para extracción, cuándo a Supabase para guardar, cuándo a Google Cloud Vision para analizar una imagen, y cuándo enviar un mensaje de vuelta a WhatsApp. También gestionará la lógica de monetización y acceso.

## 6. Estrategia de Monetización y Contingencia (VECY Bienes Raíces)

Para asegurar la sostenibilidad y rentabilidad de VECY CORE, se propone un modelo de monetización escalable y un plan de contingencia para el uso de recursos gratuitos.

### 6.1. Modelo de Suscripción / Membresía (SaaS)

El acceso al grupo de WhatsApp con el Agente IA será mediante una suscripción mensual o anual. Esto puede gestionarse a través de una plataforma externa (ej. Stripe, Paddle) para evitar conflictos con las políticas de WhatsApp.

*   **Niveles de Suscripción:**
    *   **Básico:** Acceso al Agente IA para *matching* y publicación guiada. Límites en el número de publicaciones activas o *matches* notificados.
    *   **Premium:** Publicaciones ilimitadas, *matches* prioritarios, acceso a reportes de mercado generados por IA, integración con CRM personal (si aplica).

### 6.2. Plan de Contingencia para Recursos Gratuitos

Las herramientas como Supabase, Vercel/Netlify y Google AI Studio ofrecen capas gratuitas generosas, pero es crucial tener un plan para cuando se superen los límites.

*   **Monitoreo Constante:** Implementar monitoreo de uso en todas las plataformas (Supabase, Vercel, Google Cloud) para recibir alertas antes de alcanzar los límites de la capa gratuita.
*   **Optimización de Costos:**
    *   **Supabase:** Optimizar consultas SQL, usar índices eficientemente, limpiar datos antiguos. Considerar planes de pago a medida que crece la base de datos.
    *   **Vercel/Netlify:** Optimizar el código de las Edge Functions para que sean rápidas y consuman menos recursos. Considerar planes Pro si el tráfico es muy alto.
    *   **Google Gemini:** Optimizar los *prompts* para reducir el uso de tokens. Utilizar modelos más pequeños (ej. `gemini-pro-vision` solo cuando sea necesario para imágenes, `gemini-pro` para texto). Los costos de Gemini son por uso, por lo que una buena gestión de *prompts* es clave.
    *   **Evolution API:** Si el auto-alojamiento se vuelve costoso o complejo, considerar servicios gestionados de Evolution API o alternativas de bajo costo.
*   **Transición a Planes de Pago:** El modelo de suscripción generará ingresos que permitirán cubrir los costos de las herramientas a medida que el uso aumente. La transición debe ser gradual y transparente para los usuarios.

### 6.3. Estrategia de Cobro sin Conflictos con WhatsApp

WhatsApp prohíbe el cobro directo dentro de la aplicación para servicios de terceros. La estrategia es la siguiente:

1.  **Plataforma Externa de Suscripción:** Los usuarios se suscriben a VECY CORE a través de una página web externa (alojada en Vercel/Netlify) que gestiona los pagos (ej. Stripe Checkout).
2.  **Verificación de Acceso:** Una vez suscritos, el sistema de VECY CORE (gestionado por Antigravity) verifica la membresía del usuario. Solo los usuarios activos serán añadidos al grupo de WhatsApp o tendrán acceso a las funcionalidades del Agente IA.
3.  **Mensajes Informativos:** El Agente IA puede responder a usuarios no suscritos con un mensaje como: *"Hola, para acceder a las funcionalidades de matching y publicación guiada de VECY CORE, por favor visita [URL_DE_SUSCRIPCION] para activar tu membresía."*

## 7. Plan de Implementación Detallado (VECY CORE)

Este plan se extiende y detalla el anterior, incorporando las nuevas funcionalidades y la estrategia de monetización.

1.  **Fase 1: Configuración de Infraestructura Base (1 semana)**
    *   Despliegue de Evolution API y conexión con número de WhatsApp dedicado.
    *   Configuración de Supabase: Creación de tablas `inmuebles` y `requerimientos` con el diccionario de datos extendido. Definición de las `Postgres Functions` para matching inicial.
    *   Configuración de Vercel/Netlify: Creación del proyecto y configuración de variables de entorno (claves de API de Google Gemini, Evolution API, Supabase, Google Cloud Vision).
    *   Configuración inicial de Google AI Studio (obtención de API Key y primeros prompts).
2.  **Fase 2: Desarrollo del Backend y Lógica de IA (2 semanas)**
    *   Implementación de las Edge Functions en Vercel/Netlify para recibir webhooks de Evolution API.
    *   Desarrollo de la lógica de procesamiento proactivo con Google Gemini: clasificación, extracción de entidades y estructuración de datos (incluyendo todos los campos del diccionario).
    *   Integración con Supabase para almacenamiento y recuperación de datos.
    *   Implementación de la lógica de conversación guiada (preguntas paso a paso, opciones de respuesta rápida).
    *   Desarrollo de la funcionalidad de *web scraping* para enlaces externos.
3.  **Fase 3: Lógica de Matching Avanzada y Antigravity (2 semanas)**
    *   Refinamiento de las `Postgres Functions` de *matching* para incluir todos los criterios ponderados.
    *   Desarrollo de la lógica de notificación de *matches* (mensajes en grupo o privados, con resúmenes y enlaces).
    *   Integración de Antigravity para la gestión de estados de conversación complejos, generación dinámica de *prompts* y orquestación de flujos.
    *   Integración con Google Cloud Vision API para análisis de imágenes y videos.
4.  **Fase 4: Monetización, Pruebas y Lanzamiento (2 semanas)**
    *   Desarrollo de la página de suscripción externa (Vercel/Netlify) e integración con pasarela de pago (ej. Stripe).
    *   Implementación de la lógica de verificación de membresía en el backend (Antigravity/Vercel).
    *   Pruebas exhaustivas en un grupo de WhatsApp de prueba con escenarios reales y usuarios beta.
    *   Ajuste fino de los *prompts* de Google Gemini y la lógica de *matching*.
    *   Lanzamiento al grupo principal de VECY CORE y monitoreo continuo de rendimiento, costos y experiencia del usuario.

## Referencias

[1] Evolution API. "Evo AI - O ecossistema que conecta canais, automação e IA em um só lugar". https://evoai.app/
[2] Vercel. "Vercel: Develop. Preview. Ship." https://vercel.com/
[3] Google AI Studio. "Gemini API". https://ai.google.dev/docs/gemini_api_overview
[4] Supabase. "The Open Source Firebase Alternative". https://supabase.com/
[5] Google Cloud. "Cloud Vision API". https://cloud.google.com/vision
[6] Connverz. "Meta's January 2026 WhatsApp API Rule Change: General AI Chatbots Banned". https://www.connverz.com/blog/metas-january-2026-whatsapp-api-rule-change-general-ai-chatbots-banned/
