# Propuesta Técnica: Agente IA para Grupos Inmobiliarios en WhatsApp

**Autor:** Manus AI
**Fecha:** 27 de abril de 2026

## 1. Resumen Ejecutivo

La presente propuesta detalla el diseño y la arquitectura para la implementación de un **Agente Inmobiliario Inteligente** dentro de grupos de WhatsApp. El objetivo principal de este agente es automatizar la moderación, estandarizar la publicación de información y, lo más importante, realizar un *matching* automático entre la oferta (inmuebles disponibles) y la demanda (requerimientos de los clientes o agentes).

Este sistema no solo facilita la lectura y comprensión de los mensajes para todos los participantes del grupo, sino que también acelera el cierre de negocios al notificar instantáneamente cuando un requerimiento coincide con una propiedad publicada.

## 2. Arquitectura del Sistema

Para lograr una automatización estable y escalable en WhatsApp, se propone una arquitectura basada en tres pilares fundamentales: conexión, orquestación e inteligencia artificial [1].

| Componente | Herramienta Propuesta | Función Principal |
| :--- | :--- | :--- |
| **Conexión WhatsApp** | Evolution API | Actúa como puente entre el grupo de WhatsApp y el sistema. Permite leer los mensajes entrantes y enviar respuestas automáticas sin riesgo de bloqueos si se configura correctamente [2]. |
| **Orquestador Lógico** | n8n | Es el "cerebro" operativo. Recibe los mensajes vía Webhook, ejecuta los flujos de decisión, se comunica con la IA y gestiona la base de datos [3]. |
| **Motor de IA** | OpenAI (GPT-4o-mini) | Procesa el lenguaje natural de los mensajes. Clasifica si es una oferta o demanda, extrae los datos clave (precio, ubicación, etc.) y redacta respuestas amigables [4]. |
| **Base de Datos** | Airtable / Google Sheets | Almacena de forma estructurada todo el inventario de inmuebles y el registro de requerimientos para permitir el cruce de datos (*matching*). |

## 3. Flujos de Interacción y Experiencia del Usuario

El éxito de este agente radica en su capacidad para guiar a los usuarios de forma natural. A continuación, se detallan los flujos principales de interacción.

### 3.1. Onboarding y Bienvenida

Cuando un nuevo participante ingresa al grupo, el Agente IA detecta el evento y envía un mensaje de bienvenida. Este mensaje tiene el propósito de educar al usuario sobre la dinámica del grupo desde el primer momento.

> "¡Hola! 👋 Bienvenido al grupo de Negocios Inmobiliarios. Soy tu Asistente IA. Mi trabajo es ayudarte a encontrar coincidencias exactas entre lo que buscas y lo que otros ofrecen.
> 
> Para que el sistema funcione perfecto, usamos dos plantillas muy sencillas: una para subir **INMUEBLES** y otra para subir **REQUERIMIENTOS**. 
> 
> Si es tu primera vez, escribe la palabra **AYUDA** y te guiaré paso a paso."

### 3.2. Estandarización mediante Plantillas Universales

Para que la IA y los humanos puedan procesar la información rápidamente, el agente promoverá el uso de plantillas universales. Si un usuario publica un mensaje desordenado, la IA intervendrá amablemente.

**Plantilla 1: Publicación de Inmueble (Oferta)**
```text
🏠 INMUEBLE: [Tipo, ej. Apartamento / Casa / Local]
📍 ZONA: [Barrio, Ciudad]
💰 PRECIO: [Valor en moneda local]
🛏️ HABITACIONES: [Cantidad]
🛁 BAÑOS: [Cantidad]
📐 ÁREA: [Metros cuadrados]
📝 NOTAS: [Características extra, ej. Parqueadero, balcón]
```

**Plantilla 2: Requerimiento (Demanda)**
```text
🔎 REQUERIMIENTO: [Tipo de inmueble que busca]
📍 ZONA DESEADA: [Barrios o sectores]
💰 PRESUPUESTO MAX: [Valor máximo a pagar]
🛏️ HABITACIONES MIN: [Cantidad mínima]
📝 NOTAS: [Requisitos indispensables, ej. Se aceptan mascotas]
```

Si un usuario escribe: *"Tengo un apto en el centro con 2 cuartos a 1500"*, la IA responderá:
> "¡Gracias por tu publicación! Para que nuestro sistema pueda conectarlo con clientes interesados, ¿podrías completar la información usando nuestra plantilla de **INMUEBLE**? Te la dejo aquí abajo para que solo la copies y llenes los datos faltantes."

## 4. Lógica de Matching Inteligente

El valor diferencial de este sistema es el cruce automático de datos. El proceso funciona de la siguiente manera:

1. **Extracción de Entidades:** Cuando un mensaje cumple con la plantilla, n8n envía el texto a OpenAI. La IA extrae las variables (Tipo, Zona, Precio, Habitaciones) y las convierte en formato JSON.
2. **Almacenamiento:** Estos datos se guardan en la Base de Datos (ej. Airtable), en la tabla correspondiente (Ofertas o Demandas).
3. **Cruce de Datos:** Inmediatamente después de guardar un nuevo registro, n8n ejecuta una búsqueda en la tabla opuesta. 
   - Si entra un *Requerimiento*, busca *Inmuebles* donde: `Precio Inmueble <= Presupuesto Max` Y `Zona Inmueble == Zona Deseada`.
4. **Notificación de Match:** Si el sistema encuentra una coincidencia, el Agente IA etiqueta a los involucrados en el grupo (o les envía un mensaje privado).

> "¡🎉 Tenemos un Match! @UsuarioA está buscando un apartamento en el Centro por menos de $2000, y @UsuarioB acaba de publicar uno que cumple con esas características. ¡Les sugiero contactarse por interno para cerrar el negocio!"

## 5. Plan de Implementación

Para llevar a cabo este proyecto, se sugiere el siguiente plan de acción dividido en fases:

1. **Fase 1: Configuración de Infraestructura (1 semana)**
   - Despliegue de Evolution API y conexión con el número de WhatsApp designado.
   - Configuración del entorno de n8n y conexión con las cuentas de OpenAI y Google Sheets/Airtable.
2. **Fase 2: Desarrollo de Flujos en n8n (2 semanas)**
   - Creación del flujo de recepción de mensajes y clasificación con IA.
   - Desarrollo de la lógica de extracción de datos y validación de plantillas.
   - Programación del algoritmo de *matching* en la base de datos.
3. **Fase 3: Pruebas y Refinamiento (1 semana)**
   - Pruebas en un grupo de WhatsApp cerrado (beta testers).
   - Ajuste de los *prompts* de OpenAI para mejorar la precisión en la extracción de datos y el tono de las respuestas.
4. **Fase 4: Lanzamiento y Monitoreo**
   - Introducción del Agente IA al grupo principal.
   - Monitoreo continuo para corregir falsos positivos en el *matching* y mejorar la experiencia del usuario.

## Referencias

[1] ChatMaxima. "WhatsApp Business App vs Web vs API: The 2026 Guide". https://chatmaxima.com/blog/whatsapp-business-app-vs-web-vs-api-2026/
[2] Evolution API. "Evo AI - O ecossistema que conecta canais, automação e IA em um só lugar". https://evoai.app/
[3] n8n. "Capture, qualify, and route real estate leads with WhatsApp". https://n8n.io/workflows/12820-capture-qualify-and-route-real-estate-leads-with-whatsapp-typeform-airtable-slack-gmail-and-gpt-41-mini/
[4] Uptail AI. "WhatsApp AI Agent for Real Estate: How It Works". https://www.uptail.ai/blog/whatsapp-ai-agent-for-real-estate-how-it-works-use-cases-what-to-look-for
