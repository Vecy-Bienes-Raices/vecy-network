# VRIF: ESPECIFICACIÓN FORMAL DE ARCHIVO (VRIF v2.0)
*Modelo Epistemológico de Inferencia, Evaluación y Decisión Comercial en Procesos de Negociación*

---

## INTRODUCCIÓN Y ALCANCE

Este documento constituye la **Especificación Formal** del **VECY Real Estate Intelligence Framework (VRIF)**. 

Se define formalmente el **VRIF** como un:
> **Framework epistemológico para la representación, evaluación y deliberación de oportunidades comerciales basado en evidencia, incertidumbre y razonamiento explicable.**

Su propósito es definir de manera inequívoca y rigurosa la semántica, las estructuras de datos conceptuales, los flujos y las reglas lógicas que gobiernan el razonamiento transaccional en el ecosistema. Esta especificación complementa la Constitución Doctrinal y sirve como el puente analítico para la futura implementación técnica en código, garantizando la **independencia absoluta de la tecnología** (base de datos, modelo de lenguaje o lenguaje de programación específico).

---

## 1. VRIF CORE (NÚCLEO UNIVERSAL) VS. VRIF DOMAIN (ESPECIALIZACIÓN)

Para garantizar la extensibilidad y atemporalidad del framework, el sistema de conocimiento se divide estrictamente en dos capas conceptuales:

### 1.1 VRIF Core (Núcleo Epistemológico Universal)
Es el conjunto de reglas lógicas, algebraicas y de decisión que rigen el emparejamiento de intereses compatibles en cualquier negociación comercial. No posee variables físicas ni sectoriales. Mapea:
*   La valoración de la fuerza de la evidencia (Jerarquía de Evidencias).
*   La gestión del conflicto y la contradicción de datos.
*   El cálculo del Nivel de Confianza (NCC) y la Convicción (ECC).
*   El modelado del Capital de Confianza Relacional.
*   La lógica de decisión cualitativa del Índice de Viabilidad (IVC) y del Umbral de Activación (UAC).
*   El versionamiento del conocimiento y la economía cognitiva.
*   La Incertidumbre Residual.

### 1.2 VRIF Domain (Especialización Inmobiliaria)
Es la instanciación de los perfiles abstractos del Core sobre el mercado inmobiliario residencial y comercial. Traduce los conceptos universales a variables tangibles:
*   *El Activo* se instancia como un **Inmueble** (atributos: área construida, alcobas, baños, parqueaderos, estrato, valor de administración, linderos).
*   *El PCO* se alimenta de la **Taxonomía de las Intenciones (TIO)** residenciales (Downsizing, Expandirse, Rentabilizar, Invertir).
*   *Las VDC* se materializan en variables inmobiliarias divididas por niveles de rigidez (Ciudad, Barrio, Canon de arriendo, Términos de pago).

---

## 2. MAPA DE DEPENDENCIAS E INVARIANTES COGNITIVOS

El flujo de construcción de conocimiento opera de manera estrictamente jerárquica y secuencial. Se prohíben las dependencias circulares sincrónicas.

### 2.1 Grafo de Dependencias Lógicas

```
  [ EVIDENCIA DE ENTRADA (O: Ontológico) ]
                     │
                     ▼
  [ FACULTAD DE COMPRENSIÓN (C: Cognitivo) ] ──► Ingesta y normalización (BCE)
                     │
                     ▼
   [ FACULTAD DE INFERENCIA (C: Cognitivo) ] ──► Calcula NCC(x) e intenciones (TIO)
                     │
                     ▼
     [ PERFILES DE OPERACIÓN (PCO / PCI) ]   ──► Ponderación adaptativa (VDC)
                     │
                     ▼
     [ FACULTAD DE JUICIO (D: Decisional) ]  ──► Calcula ECC y Confianza Relacional
                     │
                     ▼
   [ ÍNDICE DE VIABILIDAD COMERCIAL (IVC) ]  ──► Aplica Incertidumbre Residual
                     │
                     ▼
    [ DICTAMEN DE ACTUACIÓN COMERCIAL ]     ──► Contraste con el UAC (Notificación)
                     │
                     ▼
   [ FACULTAD DE APRENDIZAJE (TACC / M) ]   ──► Retroalimentación asíncrona post-cierre
```

### 2.2 Invariantes Epistemológicos (Reglas Lógicas Inquebrantables)
1.  **Invariante de Consistencia de Entrada**: Ningún perfil cognitivo (PCO o PCI) puede ser modificado por una Facultad sin que exista un registro de **Evidencia** (Tomo II) asociado en su Historia Cognitiva.
2.  **Invariante del Límite de NCC**: El Nivel de Confianza Cognitiva de un atributo $NCC(x_j)$ no puede superar el límite superior impuesto por la jerarquía de evidencias de la fuente que lo proveyó.
3.  **Invariante de Viabilidad Absoluta**: Si existe discrepancia o fallo de coincidencia en una variable de Nivel 1 (VDC Bloqueante), el $IVC$ de la operación se forzará matemáticamente a $0$ (Dictamen E), independientemente de la afinidad emocional detectada.

---

## 3. FICHAS FORMALES DE ENTIDADES Y PERFILES

A continuación se formalizan los componentes del VRIF mediante una estructura de especificación formal y comportamiento lógico:

---

### Ficha 1: Persona (Cliente Final) - VRIF Core
*   **Definición Formal**: Entidad abstracta representativa de un actor final que posee una necesidad transaccional.
*   **Propósito**: Identificar al tomador de decisión final y resguardar su biografía operativa de forma aislada a las variables físicas.
*   **Entradas**: Nombre, datos de identificación (opcionales), canal de origen.
*   **Salidas**: ID de Persona único.
*   **Estados Posibles**: `Activo` (tiene operaciones en curso), `Inactivo` (sin operaciones vigentes).
*   **Relaciones**: Posee $1..N$ operaciones (PCO).
*   **Restricciones**: No almacena precios, áreas ni presupuestos directamente en su ficha. Esos datos pertenecen estrictamente a la Operación (PCO).

---

### Ficha 2: Corredor (Asesor Profesional) - VRIF Core
*   **Definición Formal**: Entidad representativa del intermediario comercial que gestiona las operaciones en la plataforma.
*   **Propósito**: Modelar al emisor de la información y evaluar su comportamiento operativo y relacional en el ecosistema.
*   **Entradas**: ID de Corredor, datos de contacto, historial de chats B2B.
*   **Salidas**: Capital de Confianza Relacional, Historial de Cooperación.
*   **Estados Posibles**: `Verificado`, `En Observación`, `Degradado` (debido a malas prácticas documentadas).
*   **Relaciones**: Representa $1..N$ perfiles (PCO / PCI).
*   **Restricciones**: El Capital de Confianza Relacional es un atributo de esta entidad y se calcula de forma acumulativa y de evolución lenta.

---

### Ficha 3: Activo - VRIF Core
*   **Definición Formal**: Clase abstracta representativa del bien material o inmaterial objeto de la transacción.
*   **Propósito**: Aislar las características estables y estructurales de un bien de sus condiciones comerciales transitorias.
*   **Entradas**: Coordenadas espaciales, características estructurales.
*   **Salidas**: ID de Activo.
*   **Estados Posibles**: `Disponible`, `Comprometido` (bajo promesa o arras), `Transaccionado` (vendido/arrendado).
*   **Relaciones**: Es instanciado por una clase especializada (ej: Inmueble) y posee $1..N$ perfiles cognitivos (PCI) a lo largo de su biografía.
*   **Restricciones**: Las variables comerciales volátiles (precio de venta, precio de arriendo) no se graban de forma estática en el Activo; pertenecen al PCI.

---

### Ficha 4: Evidencia - VRIF Core
*   **Definición Formal**: Registro documental, conversacional o empírico que sustenta una actualización en el sistema.
*   **Propósito**: Servir como ancla de veracidad y auditar la procedencia de cada modificación en los perfiles.
*   **Entradas**: Mensaje de WhatsApp, archivo PDF, fotografía, certificado estatal de propiedad, nota de voz.
*   **Salidas**: Fuerza de la Evidencia (peso de credibilidad), fecha de captura.
*   **Estados Posibles**: `Vigente`, `Depreciada` (envejecimiento temporal), `Cuestionada` (por conflicto de datos), `Invalidada`.
*   **Relaciones**: Vinculada a $1..N$ actualizaciones de variables del PCO o PCI.
*   **Restricciones**: La fuerza de la evidencia depende del origen y la jerarquía oficial, no de la asertividad gramatical del texto.

---

### Ficha 5: Negociación - VRIF Core
*   **Definición Formal**: Interacción comercial bidireccional y formalizada entre dos corredores que representan perfiles compatibles.
*   **Propósito**: Modelar el ciclo de vida de los acuerdos y registrar el resultado de las interacciones para retroalimentar el sistema.
*   **Entradas**: PCO demandante, PCI oferente, fecha de inicio.
*   **Salidas**: Hitos de avance (visita coordinada, visita realizada, oferta, contraoferta, cierre o desistimiento).
*   **Estados Posibles**: `Propuesta` (Double Opt-In en proceso), `Activa` (diálogo iniciado), `Cerrada Exitosamente`, `Desistida` (fracaso transaccional).
*   **Restricciones**: El fracaso de una negociación no implica error de inferencia del IVC. La causa debe catalogarse (Fricción jurídica, Incertidumbre residual, Incompatibilidad oculta).

---

### Ficha 6: Historia Cognitiva - VRIF Core
*   **Definición Formal**: Repositorio cronológico e irreversible de los estados previos que ha tenido una operación o activo.
*   **Propósito**: Garantizar la trazabilidad y auditar la evolución de las flexibilidades, precios y objeciones de la negociación.
*   **Entradas**: Modificaciones de variables, eventos transaccionales, eventos del CVO.
*   **Salidas**: Biografía comercial estructurada (versiones del perfil).
*   **Estados Posibles**: `Activa`, `Archivada` (versiones mayores a 180 días).
*   **Restricciones**: Sus registros son inmutables (solo de inserción y lectura, nunca actualización o eliminación).

---

### Ficha 7: PCO (Perfil Cognitivo de la Operación) - VRIF Domain
*   **Definición Formal**: Representación mental estructurada de las necesidades, limitantes, intenciones (TIO) y variables adaptativas (VDC) de un requerimiento de negocio específico.
*   **Propósito**: Modelar de forma dinámica el comportamiento de la compra o renta.
*   **Entradas**: Evidencias de requerimiento en B2C/B2B, interacciones conversacionales, feedbacks.
*   **Salidas**: Vector ponderado de VDC de la Operación.
*   **Estados Posibles**: `Inicial`, `Perfilado`, `En Negociación`, `Solucionado`, `Inactivo` (desistido).
*   **Invariantes**: Debe tener al menos una intención (TIO) definida y las variables de Nivel 1 resueltas.

---

### Ficha 8: PCI (Perfil Cognitivo del Inmueble) - VRIF Domain (Asset Instance)
*   **Definición Formal**: Representación comercial y transaccional del activo físico captado para la venta o renta.
*   **Propósito**: Modelar las flexibilidades financieras, fortalezas y objeciones de la propiedad y del vendedor.
*   **Entradas**: Publicaciones B2B, fichas técnicas, evidencias fotográficas.
*   **Salidas**: Vector de VDC del Activo.
*   **Estados Posibles**: `Captado`, `Enriquecido`, `En Negociación`, `Retirado`, `Cerrado`.
*   **Invariantes**: El precio nominal del PCI debe tener una fecha de vigencia asociada para aplicar la Facultad de Revisión.

---

### Ficha 9: VDC (Variables de Decisión Comercial) - VRIF Domain
*   **Definición Formal**: Conjunto estructurado de atributos adaptativos clasificados por niveles de rigidez transaccional.
*   **Propósito**: Permitir al motor cognitivo ponderar la distancia negociable de forma diferenciada según la jerarquía de prioridades del cliente.
*   **Entradas**: Atributos específicos del activo e intenciones del requerimiento.
*   **Salidas**: Ponderación cualitativa y matemática para el IVC.
*   **Restricciones**: Ninguna variable se evalúa de manera aislada; su peso es adaptativo según el contexto de la TIO.

---

### Ficha 10: NCC (Nivel de Confianza Cognitiva) - VRIF Core
*   **Definición Formal**: Probabilidad de certeza matemática asignada a la veracidad de una variable específica de un perfil: $NCC(x_j) \in [0, 1]$.
*   **Propósito**: Evitar que el sistema asuma como definitivos datos ambiguos o de fuentes poco confiables.
*   **Entradas**: Fuerza de la evidencia de la fuente, antigüedad del dato.
*   **Salidas**: Factor de castigo o atenuación para el IVC.
*   **Restricciones**: Disminuye de forma automática y secuencial con el paso del tiempo (Vigencia Cognitiva).

---

### Ficha 11: ECC (Estado de Convicción Comercial) - VRIF Core
*   **Definición Formal**: Métrica global de solidez epistemológica de la operación completa: $ECC = \frac{1}{N}\sum_{j=1}^{N} NCC(x_j)$ (ajustado por pesos de variables innegociables).
*   **Propósito**: Calificar la madurez analítica del negocio.
*   **Entradas**: NCC de todos los atributos de un PCO o PCI.
*   **Salidas**: Clasificación de madurez.
*   **Invariantes**: Si alguna variable innegociable posee $NCC(x_1) < 0.50$, el ECC global se castigará a un nivel bajo, reteniendo recomendaciones.

---

### Ficha 12: IVC (Índice de Viabilidad Comercial) - VRIF Core
*   **Definición Formal**: Función cualitativa y probabilística de afinidad, confianza relacional y urgencia temporal que proyecta el acuerdo transaccional.
*   **Propósito**: Emitir el Dictamen Comercial de prioridad (A a E) para gobernar las notificaciones.
*   **Entradas**: Perfil PCO, Perfil PCI, Confianza de Brokers, CVO, Incertidumbre Residual.
*   **Salidas**: Dictamen Comercial $\{A, B, C, D, E\}$.
*   **Restricciones**: El cálculo debe incorporar la Incertidumbre Residual como un factor de seguridad reductivo.

---

### Ficha 13: UAC (Umbral de Activación Comercial) - VRIF Core
*   **Definición Formal**: Política operacional y paramétrica que define el límite de viabilidad necesario para disparar notificaciones relacionales.
*   **Propósito**: Proteger el capital relacional y tiempo de los brokers regulando el spam.
*   **Entradas**: Valor de corte (parámetro de política).
*   **Salidas**: Decisión binaria de notificación (`Gatillar Match` / `Observación Activa`).
*   **Restricciones**: Es una política dinámica modificable sin alterar la doctrina matemática del IVC.

---

## 4. ALGORITMOS CUALITATIVOS Y RESOLUCIÓN DE VACÍOS DOCTRINALES

A continuación se define la lógica operacional para los procesos dinámicos de toma de decisión en presencia de datos incompletos o en conflicto:

### 4.1 Deliberación de Hipótesis y Resolución de Conflictos entre Evidencias

Cuando el sistema recibe evidencias contradictorias sobre un mismo atributo de un perfil (ej: el precio del inmueble en el mensaje de ayer es $1.000$ millones, pero hoy otro broker publica el mismo inmueble a $950$ millones), la Facultad de Revisión aplica el siguiente protocolo de resolución:

Sean $E_1$ y $E_2$ dos evidencias sobre la variable $x_j$, con valores asignados $v_1$ y $v_2$, y pesos de credibilidad $w_1$ y $w_2$ derivados de la Jerarquía de Evidencias:
*   $\text{Catastro / Certificado de Libertad}$: $w_i = 1.0$
*   $\text{Ficha Técnica PDF/Imagen}$: $w_i = 0.8$
*   $\text{Registro fotográfico y de video}$: $w_i = 0.8$
*   $\text{Flyer comercial de marketing}$: $w_i = 0.5$
*   $\text{Mensaje en grupo de chat}$: $w_i = 0.3 \times \text{Capital de Confianza del Broker}$
*   $\text{Inferencia automática del MIC}$: $w_i = 0.1$

#### Algoritmo de Decisión:
1.  **Caso de Fuerza Desequilibrada ($w_1 \neq w_2$)**:
    El sistema adopta el valor de la evidencia con mayor peso de credibilidad.
    Si $w_1 > w_2$, entonces:
    $$x_j \leftarrow v_1$$
    $$NCC(x_j) \leftarrow w_1 \times (1 - \text{Fricción}(v_1, v_2))$$
    *Donde la Fricción representa la distancia relativa entre los dos valores (ej: porcentaje de diferencia de precios o inconsistencia en linderos).*

2.  **Caso de Fuerza Equivalente ($w_1 = w_2$) pero Valores Distintos ($v_1 \neq v_2$)**:
    El sistema se declara en estado de conflicto. No elige arbitrariamente.
    *   El atributo $x_j$ transiciona al estado **Cuestionado**.
    *   El $NCC(x_j)$ se atemúa inmediatamente en un 50%: $NCC(x_j)_{conf} = 0.5 \times w_1$.
    *   Se inyecta una alerta de discrepancia en la Historia Cognitiva: *"Conflicto pendiente de conciliar entre $v_1$ y $v_2$"*.
    *   Se gatilla la Facultad de Revisión para evaluar la factibilidad de exploración.

---

### 4.2 Costo de Obtención de Evidencia y Exploración Activa

Para evitar saturar a la red de brokers con preguntas redundantes de validación, la Facultad de Revisión ejecuta una simulación de utilidad marginal antes de interactuar en WhatsApp.

Gatillar un mensaje de exploración activa (ej: *"Colega, ¿el precio incluye el depósito?"*) posee un **Costo de Exploración Relacional ($C_{exp}$)**, que mide la fatiga comunicativa del broker.

#### Función de Utilidad Marginal de Exploración:
$$\text{Utilidad}(\text{Explorar } x_j) = \text{Prob}(\text{Acuerdo}) \times \Delta\text{IVC}(x_j) - C_{exp}$$

*   *Donde*:
    *   $\text{Prob}(\text{Acuerdo})$: Probabilidad preliminar de coincidencia (Afinidad comercial estimada).
    *   $\Delta\text{IVC}(x_j)$: El incremento neto de certeza y score que aportaría conocer el valor real del atributo $x_j$ (por ejemplo, si el depósito es innegociable para el cliente, la variación de IVC es altísima).
    *   $C_{exp}$: Costo fijo de molestia (bajo si el broker responde rápido históricamente, alto si tiene fatiga de chats).

#### Regla de Activación:
*   Si $\text{Utilidad} > \text{Umbral de Exploración}$, el sistema envía una pregunta estructurada de aclaración por WhatsApp (canal privado) al broker, transicionando la variable a estado `Propuesto`.
*   Si $\text{Utilidad} \le \text{Umbral de Exploración}$, el sistema retiene la pregunta, asume el castigo de NCC en su cálculo de Juicio y prefiere esperar a que ingrese evidencia de forma natural.

---

### 4.3 Semántica Formal del IVC y la Incertidumbre Residual

El Índice de Viabilidad Comercial (IVC) se define abstractamente en este estándar como una función de decisión analítica $\mathbf{\Psi}$ que integra la afinidad comercial de los perfiles ($Af$), el Estado de Convicción Comercial derivado de las evidencias ($ECC$), la confianza relacional de los intermediarios ($CC_{rel}$) y la atenuación por Incertidumbre Residual ($IR$):
$$IVC = \mathbf{\Psi}(Af(PCO, PCI), CC_{rel}, ECC_{\text{global}}, IR)$$

El valor resultante de $IVC \in [0, 1]$ mapea de forma directa a la escala cualitativa de dictamen comercial que define el UAC:
*   **Dictamen A** (Alta Viabilidad) $\to$ Conectar Double Opt-In.
*   **Dictamen B** (Viabilidad Prometedora) $\to$ Conectar sugiriendo validaciones específicas.
*   **Dictamen C** (En Maduración) $\to$ Retener la alerta temporalmente y explorar variables críticas.
*   **Dictamen D** (Con Fricción Relevante) $\to$ Retener la alerta.
*   **Dictamen E** (No Recomendado) $\to$ Descartar la coincidencia.

---

> [!IMPORTANT]
> ### WORKING DRAFT (Modelo de Referencia de Implementación)
> Las ecuaciones de ponderación, coeficientes y operadores algebraicos detallados a continuación constituyen un **modelo de trabajo provisional** propuesto para la primera implementación práctica de VECY Network. Estos parámetros están sujetos a modificación, calibración y rechazo durante la Fase de Validación Científica y no forman parte del núcleo inmutable del estándar VRIF.
>
> #### 1. Cálculo de Afinidad Funcional ($Af$)
> Representa el encaje de las Variables de Decisión Comercial (VDC) adaptadas por intención (TIO):
> $$Af(PCO, PCI) = \prod_{k \in \text{VDC}_1} \delta(x_k^{PCO}, x_k^{PCI}) \times \sum_{i \in \text{VDC}_2,3,4} \beta_i \cdot \text{Compatibilidad}(x_i^{PCO}, x_i^{PCI})$$
> *Donde $\delta$ representa el delta de Kronecker (1 si coincide, 0 si no) para variables bloqueantes, y $\beta_i$ representa el peso adaptativo del atributo.*
>
> #### 2. Cálculo del Capital de Confianza de Intermediarios ($CC_{rel}$)
> Ponderación combinada del Capital de Confianza de los brokers involucrados:
> $$CC_{rel} = \sqrt{CC_{\text{Broker Demanda}} \times CC_{\text{Broker Oferta}}}$$
>
> #### 3. Coeficiente de Incertidumbre Residual ($IR$)
> Fracción constante de atenuación preventiva ante el azar y eventos humanos invisibles al sistema:
> $$IR = 0.15 \quad (\text{15% de incertidumbre irreducible})$$
>
> #### 4. Operador Algebraico del IVC Provisional
> El IVC del modelo de referencia se calcula multiplicativamente para penalizar severamente cualquier caída drástica en la confianza relacional o la convicción:
> $$IVC_{\text{provisional}} = (Af \times CC_{rel}) \times (1 - IR) \times ECC_{\text{global}}$$
>
> Los umbrales numéricos de corte del IVC en este modelo de referencia se fijan de forma preliminar en:
> *   $IVC \ge 0.75 \to$ Dictamen A
> *   $0.60 \le IVC < 0.75 \to$ Dictamen B
> *   $0.40 \le IVC < 0.60 \to$ Dictamen C
> *   $0.20 \le IVC < 0.40 \to$ Dictamen D
> *   $IVC < 0.20 \to$ Dictamen E
