# Propuesta Técnica Avanzada: Agente IA Inmobiliario "Cero Esfuerzo" para WhatsApp

**Autor:** Manus AI
**Fecha:** 27 de abril de 2026

## 1. Resumen Ejecutivo: La Experiencia "Cero Esfuerzo"

Esta propuesta redefine la automatización inmobiliaria en WhatsApp, transformando el Agente IA en un asistente proactivo que elimina la carga de trabajo del usuario. Nuestro objetivo es crear una "mega bomba" de eficiencia donde el agente no solo clasifica y empareja inmuebles y requerimientos, sino que también **estructura, valida y completa la información de forma interactiva y guiada**, incluso a partir de textos desordenados. Abordaremos las recientes restricciones de Meta AI mediante una arquitectura flexible y aprovecharemos al máximo la infraestructura existente del usuario (Supabase, Vercel, Google Cloud, Antigravity) para una solución escalable y optimizada en costos.

## 2. Arquitectura del Sistema: Un Ecosistema Inteligente y Flexible

La arquitectura propuesta es un híbrido potente que combina la flexibilidad de APIs externas con la robustez de servicios en la nube, diseñada para sortear las limitaciones de Meta y ofrecer un rendimiento superior.

| Componente | Herramienta Propuesta | Función Principal | Justificación y Ventajas |
| :--- | :--- | :--- | :--- |
| **Conexión WhatsApp** | Evolution API | Interfaz programática con WhatsApp (grupos y chats privados). | Permite el control total sobre la interacción en grupos y evita las restricciones de la API oficial de Meta para el uso de IA externa [1]. |
| **Backend & Orquestador** | Vercel / Netlify (Edge Functions) | Aloja la lógica de negocio, recibe webhooks de Evolution API, orquesta llamadas a IA y base de datos. | Escalabilidad automática, bajo costo (capa gratuita), baja latencia y fácil despliegue. Ideal para manejar picos de tráfico [2]. |
| **Motor de IA (NLP)** | Google Gemini (vía Google AI Studio) | Clasificación de mensajes, extracción de entidades, estructuración proactiva de texto, generación de respuestas contextuales. | Acceso gratuito y potente procesamiento de lenguaje natural a través de Google AI Studio, con integración nativa en Google Cloud para escalabilidad y seguridad [3]. |
| **Base de Datos (PostgreSQL)** | Supabase | Almacena inmuebles y requerimientos de forma estructurada. Utiliza *Postgres Functions* para la lógica de matching. | Base de datos relacional potente, escalable, con funciones de base de datos para lógica de negocio y API REST automática. Aprovecha la capa gratuita [4]. |
| **Coordinación Avanzada** | Antigravity | Capa de razonamiento superior para orquestar flujos complejos, gestión de estados y prompts dinámicos. | Permite una lógica de conversación más sofisticada y adaptable, optimizando las interacciones con Google Gemini y la base de datos. |
| **Análisis de Medios** | Google Cloud Vision API | Procesamiento de imágenes y videos (opcional). | Extrae texto de imágenes (ej. letreros de "Se Vende"), clasifica contenido visual para enriquecer la información del inmueble. Aprovecha la infraestructura de Google Cloud [5]. |

## 3. Flujos de Interacción: La Guía Inteligente Paso a Paso

El Agente IA se convierte en un copiloto que guía al usuario, solicitando la información de manera estructurada y amigable, sin imponer formatos rígidos.

### 3.1. Onboarding y Bienvenida Proactiva

Cuando un nuevo miembro se une al grupo, el Agente IA envía un mensaje de bienvenida personalizado, explicando la dinámica y ofreciendo una guía interactiva.

> "¡Hola! 👋 Bienvenido al grupo de Negocios Inmobiliarios. Soy tu Asistente IA, diseñado para conectar ofertas y demandas de inmuebles de forma inteligente.
> 
> Para empezar, solo tienes que **pegar la información de tu inmueble o requerimiento**, ¡no te preocupes por el formato! Yo me encargo de organizarlo y te guiaré paso a paso para completarlo.
> 
> Si necesitas ayuda en cualquier momento, escribe **AYUDA**."

### 3.2. Procesamiento Proactivo de Publicaciones (Inmueble / Requerimiento)

Este es el corazón de la experiencia "cero esfuerzo". El usuario pega cualquier texto, y la IA lo procesa inteligentemente.

**Escenario 1: Publicación de Inmueble (Oferta)**

1.  **Usuario:** (Pega un texto desordenado o una imagen) *"Vendo apto en cedritos, 3 alcobas, sala comedor, cocina integral, 2 baños, garaje. Piso 4. Info al 310..."* (o una foto con un letrero de "Se Vende").
2.  **Agente IA (Backend en Vercel/Netlify -> Google Gemini):** Recibe el texto/imagen. OpenAI clasifica como "INMUEBLE" y extrae los datos disponibles (Tipo: Apartamento, Zona: Cedritos, Habitaciones: 3, Baños: 2, Contacto: 310...). Si hay imagen, Google Cloud Vision puede complementar la extracción.
3.  **Agente IA (Respuesta Guiada):** *"¡Excelente! He registrado tu **Apartamento** en **Cedritos** con 3 habitaciones y 2 baños. Para que pueda encontrarle un match perfecto, ¿podrías indicarme el **precio**?"*
    *   **Opciones de Respuesta Rápida:** (Botones) `1. 200-300 Millones` `2. 300-400 Millones` `3. Más de 400 Millones` `4. No aplica`
4.  **Usuario:** (Escribe o selecciona) *"450 millones"*
5.  **Agente IA:** *"¡Perfecto! Precio actualizado a $450 millones. ¿Hay alguna **característica adicional** importante (ej. balcón, parqueadero, piscina)?"*
    *   **Opciones de Respuesta Rápida:** (Botones) `1. Balcón` `2. Parqueadero` `3. Piscina` `4. No aplica`
6.  **Usuario:** *"Parqueadero y balcón"*
7.  **Agente IA:** *"¡Listo! Tu apartamento en Cedritos por $450 millones con 3 habitaciones, 2 baños, parqueadero y balcón ha sido registrado. Estoy buscando requerimientos que coincidan. Te avisaré si encuentro algo."*

**Escenario 2: Publicación de Requerimiento (Demanda)**

1.  **Usuario:** *"Busco casa grande en el norte de Bogotá, con jardín y 4 cuartos. Presupuesto hasta 1.500 millones."*
2.  **Agente IA (Backend -> Google Gemini):** Clasifica como "REQUERIMIENTO" y extrae (Tipo: Casa, Zona: Norte de Bogotá, Habitaciones: 4, Presupuesto: 1.500 Millones).
3.  **Agente IA (Respuesta Guiada):** *"Entendido. Buscas una **Casa** en el **Norte de Bogotá** con 4 habitaciones y un presupuesto de hasta $1.500 millones. ¿Hay alguna **zona específica** del norte que prefieras (ej. Usaquén, Chapinero Alto)?"*
    *   **Opciones de Respuesta Rápida:** (Botones) `1. Usaquén` `2. Chapinero Alto` `3. Cedritos` `4. No aplica`
4.  **Usuario:** *"Usaquén"*
5.  **Agente IA:** *"¡Perfecto! Requerimiento actualizado. Estoy buscando casas en Usaquén que coincidan. Te notificaré si encuentro algo."*

### 3.3. Manejo de Imágenes, Videos y Enlaces Externos

Si el usuario envía imágenes o videos, el Agente IA (a través de Google Cloud Vision API) intentará extraer información relevante (ej. texto en letreros, tipo de propiedad). Luego, preguntará al usuario si desea adjuntar ese material a su publicación, ofreciendo un enlace para subirlo a un almacenamiento en la nube (ej. Google Cloud Storage o Supabase Storage) y compartir el link en el grupo.

Además, si el usuario comparte **enlaces a CRMs inmobiliarios, catálogos o páginas web públicas** donde tenga sus inmuebles, el Agente IA utilizará técnicas de web scraping (o APIs específicas si están disponibles y son accesibles) para extraer automáticamente la información detallada (fotos, videos, características, descripción). Esta información será estructurada y presentada al usuario para su confirmación, y luego almacenada en Supabase. El agente también podrá generar un resumen conciso del inmueble para la notificación de *match*, incluyendo el enlace original para que los interesados puedan acceder a la información completa.

## 4. Lógica de Matching Inteligente con Supabase (PostgreSQL)

La eficiencia del matching se logrará directamente en la base de datos, aprovechando las `Postgres Functions` de Supabase para consultas rápidas y optimizadas.

### 4.1. Estructura de Datos en Supabase

*   **Tabla `inmuebles`:**
    *   `id` (UUID)
    *   `tipo` (TEXT: Apartamento, Casa, Local, etc.)
    *   `zona` (TEXT: Cedritos, Usaquén, etc.)
    *   `precio` (NUMERIC)
    *   `habitaciones` (INTEGER)
    *   `banos` (INTEGER)
    *   `area_m2` (NUMERIC)
    *   `caracteristicas` (JSONB: {parqueadero: true, balcon: true})
    *   `contacto` (TEXT)
    *   `url_fotos` (ARRAY de TEXT)
    *   `raw_text_original` (TEXT: para referencia)
    *   `created_at` (TIMESTAMP)

*   **Tabla `requerimientos`:**
    *   `id` (UUID)
    *   `tipo` (TEXT)
    *   `zona_deseada` (TEXT)
    *   `presupuesto_max` (NUMERIC)
    *   `habitaciones_min` (INTEGER)
    *   `banos_min` (INTEGER)
    *   `area_m2_min` (NUMERIC)
    *   `caracteristicas_deseadas` (JSONB)
    *   `contacto` (TEXT)
    *   `raw_text_original` (TEXT)
    *   `created_at` (TIMESTAMP)

### 4.2. Función de Matching en PostgreSQL (Ejemplo para Inmueble -> Requerimiento)

```sql
CREATE OR REPLACE FUNCTION buscar_matches_para_inmueble(
    p_inmueble_id UUID
) RETURNS SETOF requerimientos AS $$
DECLARE
    v_inmueble inmuebles;
BEGIN
    SELECT * INTO v_inmueble FROM inmuebles WHERE id = p_inmueble_id;

    IF v_inmueble IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT r.*
    FROM requerimientos r
    WHERE
        r.tipo = v_inmueble.tipo AND
        r.zona_deseada = v_inmueble.zona AND
        r.presupuesto_max >= v_inmueble.precio AND
        r.habitaciones_min <= v_inmueble.habitaciones AND
        r.banos_min <= v_inmueble.banos AND
        r.area_m2_min <= v_inmueble.area_m2 AND
        -- Lógica para características JSONB (ejemplo simplificado)
        (v_inmueble.caracteristicas IS NULL OR r.caracteristicas_deseadas IS NULL OR
         NOT EXISTS (
             SELECT 1 FROM jsonb_each_text(r.caracteristicas_deseadas) AS req_char
             WHERE (v_inmueble.caracteristicas ->> req_char.key)::boolean IS DISTINCT FROM req_char.value::boolean
         ));
END;
$$ LANGUAGE plpgsql;
```

Esta función será invocada por el backend (Vercel/Netlify) cada vez que se registre un nuevo inmueble o requerimiento, garantizando un matching casi instantáneo.

## 5. Consideraciones sobre Meta AI y Estrategia de Evasión

La política de Meta de enero de 2026 restringe el uso de "chatbots de IA de propósito general" en la WhatsApp Business API oficial [6]. Nuestra estrategia se basa en:

*   **Uso de Evolution API:** Al no depender de la API oficial de Meta, evitamos directamente estas restricciones, permitiéndonos integrar cualquier modelo de IA (OpenAI, Antigravity, etc.) sin problemas de compatibilidad o bloqueo.
*   **IA de Propósito Específico:** Dado que usamos Google Gemini, el agente está diseñado para un dominio muy específico (inmobiliario), lo que lo clasifica como una "IA de negocio" y no como un chatbot general. Esto es crucial para cumplir con las políticas de uso de IA en plataformas de mensajería.

## 6. Plan de Implementación Detallado

Para una puesta en marcha eficiente, se propone el siguiente plan de 4 fases:

1.  **Fase 1: Configuración de Infraestructura Base (1 semana)**
    *   Despliegue de Evolution API y conexión con el número de WhatsApp (puede ser un número personal o de empresa).
    *   Configuración de Supabase: Creación de tablas `inmuebles` y `requerimientos`, y definición de las `Postgres Functions` para matching.
    *   Configuración de Vercel/Netlify: Creación del proyecto y configuración de variables de entorno (claves de API de Google Gemini, Evolution API, Supabase).
2.  **Fase 2: Desarrollo del Backend y Lógica de IA (2 semanas)**
    *   Implementación de las Edge Functions en Vercel/Netlify para recibir webhooks de Evolution API.
    *   Desarrollo de la lógica de procesamiento proactivo con Google Gemini: clasificación, extracción de entidades y estructuración de datos.
    *   Integración con Supabase para almacenamiento y recuperación de datos.
    *   Implementación de la lógica de conversación guiada (preguntas paso a paso, opciones de respuesta rápida).
3.  **Fase 3: Desarrollo de Lógica de Matching y Antigravity (1.5 semanas)**
    *   Integración de la invocación de las `Postgres Functions` de matching desde el backend.
    *   Desarrollo de la lógica de notificación de matches (mensajes en grupo o privados).
    *   Integración de Antigravity para la gestión de estados de conversación complejos y prompts dinámicos.
    *   (Opcional) Integración con Google Cloud Vision API para análisis de imágenes.
4.  **Fase 4: Pruebas, Refinamiento y Lanzamiento (1.5 semanas)**
    *   Pruebas exhaustivas en un grupo de WhatsApp de prueba con escenarios reales.
    *   Ajuste fino de los prompts de Google Gemini para mejorar la precisión y el tono de las respuestas.
    *   Optimización de las `Postgres Functions` para rendimiento.
    *   Lanzamiento al grupo principal y monitoreo continuo del rendimiento y la experiencia del usuario.

## Referencias

[1] Evolution API. "Evo AI - O ecossistema que conecta canais, automação e IA em um só lugar". https://evoai.app/
[2] Vercel. "Vercel: Develop. Preview. Ship." https://vercel.com/
[3] Google AI Studio. "Gemini API". https://ai.google.dev/docs/gemini_api_overview
[4] Supabase. "The Open Source Firebase Alternative". https://supabase.com/
[5] Google Cloud. "Cloud Vision API". https://cloud.google.com/vision
[6] Connverz. "Meta's January 2026 WhatsApp API Rule Change: General AI Chatbots Banned". https://www.connverz.com/blog/metas-january-2026-whatsapp-api-rule-change-general-ai-chatbots-banned/
