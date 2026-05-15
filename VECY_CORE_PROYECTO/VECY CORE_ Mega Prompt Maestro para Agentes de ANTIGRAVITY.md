# VECY CORE: Mega Prompt Maestro para Agentes de ANTIGRAVITY

**Director Técnico:** Manus AI
**Gerente de Proyecto:** [Nombre del Usuario - VECY Bienes Raíces]
**Fecha:** 27 de abril de 2026
**Proyecto:** VECY CORE: El Cerebro Inmobiliario

## 1. Introducción: La Misión de VECY CORE

Agentes de ANTIGRAVITY, su misión es construir **VECY CORE**, un Agente IA inmobiliario de vanguardia para WhatsApp. Este sistema no es un simple chatbot; es una plataforma inteligente diseñada para revolucionar la interacción en grupos inmobiliarios, ofreciendo una experiencia de "cero esfuerzo" para el usuario, un *matching* de alta precisión y un modelo de negocio sostenible para VECY Bienes Raíces. Serán los arquitectos de esta "Mega Obra", y este documento es su plano maestro.

## 2. Visión General del Proyecto

VECY CORE es un Agente IA que opera en grupos de WhatsApp. Su propósito es:

*   **Procesamiento Proactivo:** Recibir mensajes de texto, imágenes, videos o enlaces de los usuarios, y la IA se encargará de estructurar, validar y completar la información de inmuebles (ofertas) y requerimientos (demandas) de forma interactiva y guiada.
*   **Matching Inteligente:** Realizar cruces automáticos y altamente precisos entre ofertas y demandas, notificando a las partes interesadas.
*   **Monetización Integrada:** Implementar un modelo de suscripción externo a WhatsApp para asegurar la rentabilidad del proyecto.
*   **Escalabilidad y Optimización:** Utilizar la infraestructura existente del cliente (Google Cloud, Supabase, Vercel/Netlify) para una solución robusta y optimizada en costos.

## 3. Arquitectura del Sistema (Resumen para ANTIGRAVITY)

La arquitectura es un ecosistema interconectado, donde ANTIGRAVITY jugará un rol central en la orquestación:

| Componente | Herramienta | Rol de ANTIGRAVITY |
| :--- | :--- | :--- |
| **Conexión WhatsApp** | Evolution API | Integración y gestión de webhooks. |
| **Backend & Orquestador** | Vercel / Netlify (Edge Functions) | Despliegue del código del agente, manejo de webhooks, invocación de APIs. |
| **Motor de IA (NLP)** | Google Gemini (vía Google AI Studio) | Generación dinámica de prompts, interpretación de respuestas, gestión de contexto. |
| **Base de Datos (PostgreSQL)** | Supabase | Interacción con tablas `inmuebles` y `requerimientos`, invocación de `Postgres Functions` de matching. |
| **Coordinación Avanzada** | **ANTIGRAVITY** | **Cerebro estratégico: Gestión de estados de conversación, lógica de negocio compleja, generación dinámica de prompts, orquestación de flujos, gestión de membresías.** |
| **Análisis de Medios** | Google Cloud Vision API | Invocación para OCR y análisis de imágenes/videos. |
| **Web Scraping** | Librerías en Backend | Orquestación del proceso de descarga y extracción de datos de URLs. |
| **Pasarela de Pagos** | Stripe / Paddle (externo) | Integración para verificación de suscripciones. |

## 4. Requisitos Detallados y Lógica de Implementación

Los siguientes documentos adjuntos contienen las especificaciones detalladas para cada aspecto del proyecto. ANTIGRAVITY debe leerlos y aplicarlos rigurosamente:

### 4.1. Diccionario de Datos y Lógica de Negocio

*   **Documento de Referencia:** `VECY_CORE_Data_Dictionary_and_Logic.md`
*   **Instrucción para ANTIGRAVITY:**
    *   Crear las tablas `inmuebles` y `requerimientos` en Supabase siguiendo **exactamente** la estructura y tipos de datos definidos.
    *   Implementar la lógica de procesamiento proactivo en el backend (Vercel/Netlify) utilizando Google Gemini para clasificación, extracción y estructuración de datos, tal como se describe en el documento.
    *   Desarrollar la lógica de conversación guiada, incluyendo las preguntas paso a paso y las opciones de respuesta rápida, gestionando el estado de la conversación a través de ANTIGRAVITY y Supabase.
    *   Implementar la funcionalidad de *web scraping* para enlaces externos, enviando el contenido a Gemini para extracción y resumen, y almacenando la información en Supabase.

### 4.2. Lógica de Matching Avanzada

*   **Documento de Referencia:** `VECY_CORE_Data_Dictionary_and_Logic.md` (Sección 4)
*   **Instrucción para ANTIGRAVITY:**
    *   Crear las `Postgres Functions` en Supabase para el *matching* de inmuebles y requerimientos, incorporando **todos los campos del diccionario de datos** y la lógica de puntuación ponderada.
    *   El backend (Vercel/Netlify) debe invocar estas funciones de Supabase cada vez que se registre un nuevo inmueble o requerimiento.
    *   Implementar la lógica de notificación de *matches* en WhatsApp, incluyendo resúmenes generados por Gemini y enlaces a la información completa.

### 4.3. Estrategia de Monetización y Contingencia

*   **Documento de Referencia:** `VECY_CORE_Monetizacion_Contingencia.md`
*   **Instrucción para ANTIGRAVITY:**
    *   Diseñar e implementar la lógica de verificación de membresía en el backend (Vercel/Netlify), coordinada por ANTIGRAVITY.
    *   El Agente IA debe responder adecuadamente a usuarios no suscritos, redirigiéndolos a la plataforma externa de suscripción.
    *   Implementar monitoreo de uso para los servicios gratuitos (Supabase, Vercel, Google Cloud) y establecer alertas.
    *   El diseño del sistema debe ser modular para facilitar la transición a planes de pago cuando sea necesario, optimizando el uso de tokens de Gemini y recursos de Vercel/Supabase.

### 4.4. Conexión WhatsApp, Privacidad y Hardware

*   **Documentos de Referencia:** `Guia_Tecnica_Conexion_Gemini_WhatsApp.md` y `Manual_Privacidad_Hardware_Agente_IA.md`
*   **Instrucción para ANTIGRAVITY:**
    *   Configurar Evolution API y el backend (Vercel/Netlify) para asegurar que el Agente IA **solo procese mensajes del grupo de WhatsApp especificado** (`ID_DE_TU_GRUPO_WHATSAPP@g.us`).
    *   Implementar las mejores prácticas de seguridad para claves API y acceso a Supabase.
    *   Considerar las recomendaciones sobre el número de teléfono dedicado y la gestión de la sesión de WhatsApp para garantizar la privacidad y estabilidad.

## 5. Rol Específico de ANTIGRAVITY (El Cerebro Estratégico)

ANTIGRAVITY no es solo un orquestador; es el componente que dota de inteligencia estratégica al sistema:

*   **Gestión de Estados:** Mantener el estado de cada conversación para un flujo interactivo y contextual.
*   **Generación Dinámica de Prompts:** Adaptar los *prompts* enviados a Gemini en tiempo real, basándose en el contexto y los datos ya obtenidos, para optimizar la precisión y el uso de tokens.
*   **Toma de Decisiones:** Decidir cuándo un flujo de publicación está completo, cuándo iniciar un *matching*, cuándo notificar, y cómo gestionar usuarios no suscritos.
*   **Optimización de Recursos:** Implementar lógicas para minimizar el consumo de recursos de Google Gemini y Vercel/Netlify, especialmente en la capa gratuita.

## 6. Plan de Implementación (Para ANTIGRAVITY)

El plan de 4 fases detallado en `VECY_CORE_Data_Dictionary_and_Logic.md` (Sección 7) debe ser seguido rigurosamente. Cada fase tiene hitos claros y se espera una comunicación constante con el Gerente de Proyecto.

## 7. Entregables Esperados

Al finalizar el proyecto, ANTIGRAVITY deberá entregar:

*   Un sistema VECY CORE completamente funcional y optimizado, desplegado en Vercel/Netlify y conectado a Supabase, Evolution API y Google Gemini.
*   Código fuente documentado y versionado.
*   Acceso a los paneles de control de Supabase, Vercel/Netlify, Google AI Studio y Evolution API.
*   Un informe final de implementación y configuración.

Este "Mega Prompt Maestro" es la guía definitiva. ¡Adelante, Agentes de ANTIGRAVITY, a construir VECY CORE!
