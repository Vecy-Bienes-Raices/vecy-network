# Análisis de Política de Meta 2026 y Estrategia para el Agente Inmobiliario

## El Problema: Restricciones de Meta (Enero 2026)
Meta ha implementado una política que prohíbe el uso de "chatbots de IA de propósito general" (como ChatGPT o Gemini directamente) a través de la API oficial de WhatsApp Business. El objetivo es forzar el uso de **Meta AI** o asegurar que la IA sea "específica para el negocio" y no un asistente general.

## La Solución: "IA Específica de Negocio" vs "IA General"
La clave para no ser bloqueado es que el agente no se comporte como un ChatGPT abierto (donde le puedes preguntar sobre historia o cocina), sino como una **herramienta de procesamiento de datos inmobiliarios**.

### Estrategia Técnica:
1.  **Uso de Evolution API (Ruta No Oficial pero Estable):** Al usar Evolution API, nos saltamos las restricciones de la API oficial de Cloud, ya que funciona emulando una sesión de WhatsApp Web/App. Esto permite total libertad para usar cualquier modelo de IA (OpenAI, Anthropic, etc.) sin que Meta lo detecte como un bot de API oficial.
2.  **Arquitectura en Supabase + Vercel:**
    *   **Supabase:** Almacena los inmuebles y requerimientos. Usaremos *Postgres Functions* para el matching ultra-rápido.
    *   **Vercel/Netlify:** Aloja el "Middleware" que recibe el mensaje, lo limpia con IA y lo guarda en Supabase.
    *   **Antigravity:** Puede actuar como el motor de razonamiento superior para coordinar las tareas complejas entre Google Cloud y WhatsApp.

## El Flujo de "Cero Esfuerzo" (Proactivo)
En lugar de pedirle al usuario que llene una plantilla, el agente hará lo siguiente:
1.  **Recepción:** El usuario pega un texto desordenado (ej: un mensaje copiado de otro grupo).
2.  **Estructuración:** La IA identifica los campos. Si falta algo (ej: no puso el precio), la IA responde: *"¡Excelente inmueble! Ya lo organicé, pero me falta el precio para poder encontrarle un match. ¿Cuál es?"*.
3.  **Confirmación:** El usuario solo dice "200 millones" y la IA actualiza el registro.
