# Plan de Ejecución y Hoja de Ruta: VECY Network 🚀🇨🇴
_El camino pragmático desde el código actual hasta la consolidación de la Startup Inmobiliaria._

---

Eduardo, para que este ecosistema funcione y genere resultados reales, no podemos limitarnos a programar características sin una estrategia de contención de riesgos. 

A continuación, te presento el **Dictamen de Ajustes Críticos** a nuestros esquemas y la **Hoja de Ruta de Ejecución Paso a Paso** para orientar nuestro desarrollo de forma segura y rentable.

---

## 1. AJUSTES CRÍTICOS PARA QUE EL NEGOCIO REALMENTE FUNCIONE

Tras auditar nuestros tres documentos conceptuales, identifico tres debilidades críticas y propongo sus soluciones inmediatas para blindar la startup:

### 🛠️ Mejora 1 (Al Plan de Negocios): Blindaje contra la Desintermediación (Contrato Escrow de Arras)
*   **El Riesgo Real**: Los asesores inmobiliarios tienden a ocultar los cierres. Si un agente consigue un match perfecto en VECY, podría simplemente contactar al otro agente "por fuera" de la plataforma, cerrar la venta y no reportarlo a VECY para ahorrarse la comisión de servicio.
*   **La Solución**: Implementar la **Separación de Inmuebles vía Escrow (Garantía de Arras)**.
    *   Para formalizar un Match y apartar el inmueble del catálogo público, el comprador debe pagar el depósito de arras (ej: el 1% o 2% del precio del inmueble) **obligatoriamente a través del portal web de VECY**.
    *   VECY retiene el dinero en una cuenta de garantía de confianza (Fiducia o Escrow) y solo lo libera al vendedor/asesor tras la firma de la promesa de compraventa.
    *   Al liquidar el abono, VECY retiene de forma directa y automática el **3% de la comisión**, dispersando los pagos correspondientes (35% captador, 35% colocador, 15% bolsa, 15% VECY). Esto **obliga** a que las transacciones pasen por nuestra contabilidad digital.

### 🛠️ Mejora 2 (Al Dossier Técnico): Sistema Anti-Fraude de Clicks (Browser Fingerprinting)
*   **El Riesgo Real**: Los clicks de tráfico único filtrados por IP y Cookie son fáciles de falsificar mediante VPNs, proxys o bots programados por los promotores de la red para acaparar los puntos de ranking de la Bolsa.
*   **La Solución**: Implementar **Huella Digital del Navegador (Browser Fingerprinting) + Validación de Tiempo de Lectura**.
    *   El backend no solo registrará la IP, sino el fingerprint del dispositivo (Canvas, WebGL y cabeceras de navegador).
    *   Un click de tráfico solo sumará Puntos de Ranking a la campaña si el visitante pasa **al menos 15 segundos en el Dossier Web** o realiza scroll activo en la página. Si la visita dura 1 segundo (típico bot de clicks), se descarta de inmediato por sospecha de fraude.

### 🛠️ Mejora 3 (Al Dictamen Estratégico): Lanzamiento del Café Inmobiliario desde el "Día 1" (Sponsor de Reunión)
*   **El Riesgo Real**: Esperar 6 meses para tener corners físicos o locales propios retrasa la conexión humana y el posicionamiento de marca de la red.
*   **La Solución**: Lanzar el concepto de **"Padrino de Café" (Bono de Alianza) de inmediato**.
    *   Gestionar una alianza inicial de vales/línea de crédito con marcas de consumo masivo y café en Colombia: **Juan Valdez, Starbucks, Oma, Oxxo y Tostao**.
    *   Cuando Jani coordine una cita física para un Match del 100%, VECY emite un cupón digital (ej: por \$25.000 COP) para que los agentes inmobiliarios independientes citen a su cliente en uno de estos puntos comerciales.
    *   *Resultado*: Presencia de marca instantánea desde la primera venta, costo mínimo y validación de campo a través de vales de crédito comercial sin inversión inicial en infraestructura.

---

## 2. HOJA DE RUTA DE EJECUCIÓN PASO A PASO (ROADMAP)

Para guiarte con resultados reales y medibles, organizamos el desarrollo en **4 Pasos Concretos**:

```
[ PASO 1: Ingesta e IA Sólida ] ──► [ PASO 2: Catálogo y Registro ] ──► [ PASO 3: Enlaces y Fingerprint ] ──► [ PASO 4: Pasarela y Escrow ]
       (Semanas 1-2)                      (Semanas 3-4)                        (Semanas 5-6)                        (Mes 2+)
```

### 🚀 Paso 1: Ingesta Ininterrumpida y Base de Datos Estructurada (Semanas 1-2)
*   **Objetivo**: Lograr que JanIA escuche WhatsApp las 24 horas del día, extraiga todo sin fallar y calcule matches invisibles en Supabase.
*   **Tareas Técnicas**:
    1.  *Eduardo*: Resolver el cobro vencido de la cuenta de facturación de Google Cloud (GCP) para reactivar la Gemini API Key (actualmente bloqueada con error 403 en los logs del VPS).
    2.  *Eduardo*: Encender la conexión de Baileys en el VPS y escanear el código QR del número oficial de WhatsApp de VECY.
    3.  *Eduardo*: Mantener apagado el bot en local (`ENABLE_JANIA_MATCH_BOT=false` en el `.env` local) para evitar conflictos de logueo concurrente que banearían la cuenta de WhatsApp.
    4.  *Verificación*: Confirmar que los mensajes entrantes de inmuebles y requerimientos en los grupos autorizados se guarden de forma inmediata y estructurada en Supabase.

### 💻 Paso 2: Catálogo Público Web y Registro por Acción (Semanas 3-4)
*   **Objetivo**: Publicar las tiendas web de oferta y demanda y controlar los cupos del catálogo.
*   **Tareas Técnicas**:
    1.  *Eduardo*: Crear la interfaz del **Catálogo Doble** en el frontend (Tienda de Inmuebles y Tienda de Requerimientos).
    2.  *Eduardo*: Implementar el Progress Bar visual de los 7 cupos en la tarjeta de propiedad.
    3.  *Eduardo*: Configurar el flujo de **Registro por Acción** (el portal es 100% público, pero si el asesor hace clic en "Participar" o el comprador en "Agendar", se abre el pop-up de registro obligatorio).
    4.  *Verificación*: Probar el registro de usuarios y el bloqueo automático de la barra de progreso al completarse los 7 agentes participantes en un inmueble de prueba.

### 🔗 Paso 3: Wallet de Puntos y Enlaces Parametrizados (Semanas 5-6)
*   **Objetivo**: Habilitar a los agentes para promover enlaces y acumular puntos de ranking de forma segura.
*   **Tareas Técnicas**:
    1.  *Eduardo*: Programar el microservicio redireccionador que detecta la referencia del agente (ej: `vecy.co/i/apto?ref=agente1`) y guarda la visita en Supabase.
    2.  *Eduardo*: Implementar el filtro anti-fraude (Browser Fingerprinting + 15 segundos mínimos de retención en la página) para validar los clicks.
    3.  *Eduardo*: Crear la vista de la **Wallet Digital** en el Dashboard del Agente, mostrando la tabla de clasificación de puntos de ranking para los inmuebles en los que participa.
    4.  *Verificación*: Simular clicks falsos/rápidos y clicks orgánicos reales, verificando que el backend descarte los bots y premie los reales.

### 💰 Paso 4: Pasarela de Pagos (Escrow), Créditos y Lanzamiento Comercial (Mes 2+)
*   **Objetivo**: Empezar a facturar y dispersar regalías en efectivo de forma legal y segura.
*   **Tareas Técnicas**:
    1.  *Eduardo*: Integrar pasarela de pagos (MercadoPago / Wompi) en la web para procesar el abono de separación y arras.
    2.  *Jani / Eduardo*: Cerrar convenios comerciales de corretaje de crédito hipotecario con 3 bancos/Neo-fintechs y colocar el simulador de viabilidad en el portal.
    3.  *Jani*: Implementar la estrategia del "Padrino de Café", comprando cupones digitales de Starbucks/Juan Valdez para patrocinar las reuniones de cierre de los primeros matches exitosos.
    4.  *Verificación*: Realizar una venta real, retener el 3% de comisión del pago escrow, y dispersar de forma manual las comisiones basándonos en los datos de la wallet.

---

## 3. ASIGNACIÓN CLARA DE ROLES EN EL EQUIPO

Para evitar retrasos y desorganización, cada miembro del equipo asume una función indispensable:

*   **Eduardo A. Rivera (Líder Tecnológico)**:
    *   Encargado del backend, API de Gemini, conexión de Baileys en el VPS, geocodificación catastral y el desarrollo del portal web (frontend, pasarela y bases de datos).
*   **Jani Alves (Líder de Operaciones y Calidad Humana)**:
    *   Encargada de la atención directa y cierre manual de los matches, soporte legal de las promesas de compraventa, control fiscal de las dispersiones y alianzas con establecimientos para redimir los "Padrinos de Café".
*   **JanIA (Asistente Cognitiva)**:
    *   Encargada silenciosa de capturar, inferir intenciones de compra/venta de WhatsApp y cruzarlos en la base de datos de matches sin molestar a los clientes por DMs.
