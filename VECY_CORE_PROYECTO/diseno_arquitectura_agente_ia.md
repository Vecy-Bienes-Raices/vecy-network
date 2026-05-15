# Diseño de Arquitectura, Flujos de Conversación y Lógica de Matching para Agente IA en WhatsApp

## 1. Arquitectura del Sistema

La arquitectura propuesta para el Agente IA en WhatsApp se basa en la integración de varias herramientas clave que trabajarán de manera conjunta para ofrecer una solución robusta y escalable. El flujo de datos y la interacción entre componentes se detallan a continuación:

### Componentes Principales:

*   **WhatsApp Group**: El entorno donde los agentes inmobiliarios y los usuarios interactuarán, publicando inmuebles y requerimientos.
*   **Evolution API**: Actuará como el puente entre WhatsApp y nuestro sistema. Se encargará de recibir todos los mensajes del grupo y enviarlos a n8n a través de webhooks. También será responsable de enviar las respuestas generadas por el Agente IA de vuelta al grupo o a chats privados.
*   **n8n (Orquestador de Flujos)**: Esta plataforma de automatización será el cerebro del sistema. Se encargará de:
    *   Recibir los mensajes de Evolution API.
    *   Invocar a OpenAI para el procesamiento del lenguaje natural.
    *   Gestionar la lógica de negocio, incluyendo la clasificación de mensajes, extracción de datos, matching y la generación de respuestas.
    *   Interactuar con la base de datos para almacenar y consultar información de inmuebles y requerimientos.
*   **OpenAI (GPT-4o / GPT-4o-mini)**: Un modelo de lenguaje avanzado que se utilizará para:
    *   **Clasificación de Mensajes**: Determinar si un mensaje es una oferta de inmueble, un requerimiento de búsqueda o una consulta general.
    *   **Extracción de Entidades**: Identificar y extraer información clave de los mensajes, como tipo de inmueble, ubicación, precio, número de habitaciones, etc.
    *   **Generación de Plantillas**: Crear plantillas universales para publicaciones de inmuebles y requerimientos, asegurando un formato consistente.
    *   **Generación de Respuestas**: Elaborar mensajes de bienvenida, explicaciones de funcionamiento y guías paso a paso para los usuarios.
*   **Base de Datos (Airtable / Google Sheets)**: Una base de datos sencilla y accesible que almacenará de forma estructurada los inmuebles ofrecidos y los requerimientos de los usuarios. Esto facilitará la búsqueda y el matching de propiedades.

### Flujo de Datos:

1.  Un usuario envía un mensaje al grupo de WhatsApp.
2.  Evolution API intercepta el mensaje y lo envía a n8n a través de un webhook.
3.  n8n recibe el mensaje y lo pasa a OpenAI para su análisis.
4.  OpenAI clasifica el mensaje (Inmueble, Requerimiento, General) y extrae los datos relevantes.
5.  n8n, basándose en la clasificación y los datos extraídos:
    *   Si es un **Inmueble** o **Requerimiento**, lo almacena en la base de datos.
    *   Ejecuta la lógica de matching para encontrar posibles coincidencias.
    *   Genera una respuesta utilizando OpenAI (plantilla, bienvenida, guía, match encontrado).
6.  n8n envía la respuesta generada a Evolution API.
7.  Evolution API publica la respuesta en el grupo de WhatsApp o la envía como mensaje privado al usuario, según la lógica definida.

## 2. Flujos de Conversación

El Agente IA interactuará con los usuarios a través de diferentes flujos de conversación, diseñados para ser intuitivos y eficientes.

### 2.1. Bienvenida y Onboarding

*   **Evento**: Un nuevo miembro se une al grupo de WhatsApp.
*   **Acción del Agente IA**: Envía un mensaje de bienvenida automático al nuevo miembro (privado o en el grupo, configurable). Este mensaje incluirá:
    *   Una cordial bienvenida al grupo.
    *   Una breve explicación del propósito del grupo (publicación de inmuebles y requerimientos).
    *   Instrucciones claras sobre cómo publicar un inmueble o un requerimiento, haciendo referencia a las plantillas universales.
    *   Un enlace a una guía más detallada o un comando para solicitar ayuda.

### 2.2. Publicación de Inmuebles (Oferta)

*   **Evento**: Un usuario publica un mensaje que OpenAI clasifica como "Inmueble".
*   **Acción del Agente IA**:
    1.  **Validación**: La IA intentará extraer la información clave (tipo, ubicación, precio, habitaciones, etc.).
    2.  **Guía de Plantilla**: Si la información es incompleta o no sigue el formato esperado, la IA responderá solicitando los datos faltantes y proporcionará la plantilla universal para publicaciones de inmuebles, explicando cómo usarla.
    3.  **Confirmación y Almacenamiento**: Una vez que la información esté completa y estructurada, la IA confirmará la publicación, la almacenará en la base de datos y notificará al usuario que su inmueble ha sido registrado.
    4.  **Matching (Opcional)**: Inmediatamente después de registrar el inmueble, la IA puede buscar requerimientos coincidentes y notificar al publicador y/o a los interesados.

### 2.3. Publicación de Requerimientos (Demanda)

*   **Evento**: Un usuario publica un mensaje que OpenAI clasifica como "Requerimiento".
*   **Acción del Agente IA**:
    1.  **Validación**: Similar al flujo de inmuebles, la IA extraerá la información clave del requerimiento.
    2.  **Guía de Plantilla**: Si la información es incompleta, la IA solicitará los datos faltantes y proporcionará la plantilla universal para requerimientos.
    3.  **Confirmación y Almacenamiento**: Una vez que el requerimiento esté completo, la IA lo confirmará, lo almacenará en la base de datos y notificará al usuario.
    4.  **Matching**: La IA buscará inmuebles coincidentes en la base de datos y notificará al usuario sobre las propiedades que se ajusten a su búsqueda.

### 2.4. Consultas Generales y Ayuda

*   **Evento**: Un usuario envía un mensaje que no es una oferta ni un requerimiento (ej. "Hola", "Ayuda", "Cómo funciona?").
*   **Acción del Agente IA**: La IA responderá con información relevante, como un resumen de las reglas del grupo, cómo usar las plantillas, o un enlace a la documentación completa. Puede usar OpenAI para generar respuestas contextuales a preguntas frecuentes.

## 3. Lógica de Matching

La lógica de matching es el corazón del Agente IA, permitiéndole conectar ofertas con demandas de manera inteligente.

### 3.1. Extracción y Normalización de Datos

Antes de realizar el matching, es crucial que los datos de inmuebles y requerimientos estén estandarizados. OpenAI jugará un papel fundamental en la extracción de entidades y la normalización de la información (ej. "3 hab" -> "3 habitaciones", "$3M" -> "3,000,000").

### 3.2. Criterios de Matching

El matching se realizará basándose en una combinación de criterios, que pueden ser ponderados según la prioridad:

*   **Ubicación**: Coincidencia exacta o por proximidad (ej. mismo barrio, ciudad).
*   **Tipo de Inmueble**: Casa, apartamento, terreno, oficina, etc.
*   **Rango de Precio**: El precio del inmueble debe estar dentro del rango de presupuesto del requerimiento.
*   **Número de Habitaciones/Baños**: Coincidencia exacta o un rango aceptable.
*   **Área (m²)**: Coincidencia dentro de un rango.

### 3.3. Proceso de Matching

1.  **Activación**: La lógica de matching se activará cada vez que se registre un nuevo inmueble o un nuevo requerimiento en la base de datos.
2.  **Consulta Cruzada**: n8n realizará una consulta a la base de datos:
    *   Si se registró un **Inmueble**, buscará **Requerimientos** que coincidan.
    *   Si se registró un **Requerimiento**, buscará **Inmuebles** que coincidan.
3.  **Puntuación de Coincidencia**: Se puede implementar un sistema de puntuación para determinar la relevancia de cada match, basándose en cuántos criterios coinciden y su importancia.
4.  **Notificación**: Cuando se encuentre una coincidencia relevante, el Agente IA enviará una notificación a las partes interesadas, ya sea en el grupo o de forma privada, incluyendo los detalles de la coincidencia y cómo contactar.

## 4. Plantillas Universales

Las plantillas son esenciales para estandarizar la información y facilitar el procesamiento por parte de la IA y la comprensión por parte de los usuarios. OpenAI puede generar estas plantillas y guiar a los usuarios para que las utilicen.

### 4.1. Plantilla para Publicación de Inmuebles

```
[TIPO DE INMUEBLE]: [DIRECCIÓN/UBICACIÓN]
Precio: [PRECIO]
Habitaciones: [NÚMERO]
Baños: [NÚMERO]
Área: [METROS CUADRADOS] m²
Descripción: [BREVE DESCRIPCIÓN DEL INMUEBLE]
Contacto: [NOMBRE Y TELÉFONO/ENLACE]
Fotos: [ENLACE A FOTOS (opcional)]
```

### 4.2. Plantilla para Publicación de Requerimientos

```
[TIPO DE INMUEBLE] en [UBICACIÓN DESEADA]
Presupuesto: [RANGO DE PRECIO]
Habitaciones: [NÚMERO DESEADO]
Baños: [NÚMERO DESEADO]
Área: [RANGO DE METROS CUADRADOS] m²
Descripción: [BREVE DESCRIPCIÓN DE LO QUE BUSCA]
Contacto: [NOMBRE Y TELÉFONO/ENLACE]
```

Estas plantillas servirán como guía para los usuarios y como formato esperado para la IA, lo que mejorará significativamente la eficiencia del sistema.
