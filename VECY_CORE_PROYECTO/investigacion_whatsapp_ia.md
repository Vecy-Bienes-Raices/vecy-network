# Investigación: Automatización de WhatsApp para Inmobiliarias con IA

## Herramientas Clave Identificadas
1. **Evolution API**: 
   - Permite conectar WhatsApp (personal o business) de forma programática.
   - Soporta la gestión de grupos, lectura de mensajes y envío de respuestas.
   - Es Open Source y se puede auto-alojar.
2. **n8n (Orquestador)**:
   - Plataforma de automatización que conecta Evolution API con modelos de IA.
   - Permite crear lógica compleja de "matching" y manejo de bases de datos (Google Sheets, Airtable, SQL).
3. **OpenAI (GPT-4o / GPT-4o-mini)**:
   - Motor de IA para procesar lenguaje natural.
   - Capaz de extraer datos estructurados de mensajes informales (ej: "Busco apto en Chapinero, 3 hab, max 3M").
   - Genera respuestas basadas en plantillas y guía a los usuarios.

## Arquitectura Propuesta
- **Entrada**: Webhook de Evolution API que detecta mensajes en el grupo.
- **Procesamiento**: n8n recibe el mensaje y lo envía a OpenAI para:
  - Clasificar: ¿Es Inmueble, Requerimiento o Consulta general?
  - Extraer: Ubicación, precio, tipo, habitaciones, etc.
- **Base de Datos**: Almacenar ofertas y demandas en una tabla (Airtable/Google Sheets).
- **Lógica de Matching**: n8n busca coincidencias en la base de datos cada vez que entra un nuevo registro.
- **Salida**: Respuesta automática en el grupo o mensaje privado al interesado.

## Desafíos Técnicos
- **Privacidad**: Manejo de datos de contacto.
- **Moderación**: Evitar que la IA responda a mensajes irrelevantes.
- **Límites de WhatsApp**: Evitar bloqueos usando la API oficial o gestionando los tiempos de respuesta en Evolution API.
