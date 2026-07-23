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
- **Procesamiento**: n8n recibe el mensaje y lo envía a OpenAI/JanIA para:
  - Clasificar: ¿Es Inmueble, Requerimiento o Consulta general?
  - Extraer: Ubicación, precio, tipo, habitaciones, etc.
- **Base de Datos**: Almacenar ofertas y demandas en una tabla (PostgreSQL con Drizzle).
- **Lógica de Matching (Calibrada y Estricta)**:
  - **Filtro Duro de Ubicación**: Cotejamiento por frases geográficas completas, ignorando palabras genéricas de Colombia (ej. "Santa") y expandiendo zonas coloquiales de Bogotá (ej: "Las Santas").
  - **Filtros de Parámetros Exactos**: Tolerancia cero en número de habitaciones, baños, parqueaderos, niveles (casas) y comodidades especiales solicitadas (Terraza, Balcón, Chimenea, Clubhouse, Estudio).
  - **Tolerancias Flexibles**: Rango máximo de 5% superior en precio, desviación entre 0% y +30% en área (no permitiendo menos del mínimo), y máximo 1 piso por encima para apartamentos.
- **Evolución Futura (Machine Learning y Vectorización)**:
  - **Vectorización con Embeddings**: Codificación de descripciones de inmuebles y requerimientos en vectores numéricos de alta dimensión para evaluar la similitud semántica mediante similitud de cosenos.
  - **Aprendizaje por Retroalimentación (Feedback Loop)**: Recolección diaria de confirmaciones y rechazos de matches por parte de los usuarios para entrenar un modelo clasificador de ML que auto-calibre los pesos y penalizaciones del motor de forma dinámica.
- **Salida**: Respuesta automática en el grupo o mensaje privado al interesado.

## Desafíos Técnicos
- **Privacidad**: Manejo de datos de contacto.
- **Moderación**: Evitar que la IA responda a mensajes irrelevantes.
- **Límites de WhatsApp**: Evitar bloqueos usando la API oficial o gestionando los tiempos de respuesta en Evolution API.
