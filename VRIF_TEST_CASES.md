# VRIF: CATÁLOGO DE CASOS DE PRUEBA CONCEPTUALES (VRIF v2.0)
*Batería de Escenarios Límite y Contraejemplos para el Estresado del Razonamiento Epistemológico*

---

## INTRODUCCIÓN Y ALCANCE

Este documento consolida una colección estructurada de **Casos de Prueba Conceptuales** diseñados para evaluar la consistencia operacional del VRIF Core y VRIF Domain. Ninguno de estos casos contiene código de software. Describen situaciones reales y complejas del mercado de corretaje con el fin de evaluar si las Facultades Cognitivas y la lógica de decisión resuelven el escenario de acuerdo a la Constitución Doctrinal.

---

## BATERÍA DE CASOS DE PRUEBA (TC-01 a TC-10)

---

### TC-01: El Comprador Mutante (Mutación de PCO)
*   **Contexto de Entrada**: Un broker publica un PCO inicial con una Necesidad Declarada de compra: *"Apartamento en Cedritos, 90 m², presupuesto 450 millones, arriendo tradicional"* (TIO: Habitar).
*   **Hito Temporal (Día 15)**: El broker interactúa con una sugerencia aclarando por chat: *"Mi cliente vio que las rentas en Cedritos son bajas y ahora prefiere comprar un apartaestudio de 45-50 m² en Chapinero para rentar en cortas estadías (Airbnb)"*.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Revisión detecta el cambio de variables preferentes y bloqueantes.
    2.  El PCO original **no se duplica ni se destruye**. La Historia Cognitiva guarda la versión anterior como `Histórico`.
    3.  La **TIO** transiciona de `Habitar` a `Rentabilizar`.
    4.  El motor invalida de forma inmediata todos los matches activos basados en Cedritos/Vivienda y reconstruye el espacio de afinidad apuntando a Chapinero/Apartaestudios.

---

### TC-02: Conflicto Directo de Evidencias (Fuerza Desequilibrada)
*   **Contexto de Entrada**: Un PCI de un apartamento cuenta con una ficha técnica provista por el broker representante que indica *"Área construida: 118 m²"* (Evidencia de Fuerza Alta, $w = 0.8$).
*   **Hito Temporal (Día 3)**: El broker sube una foto legible de la escritura pública del inmueble en el canal privado, donde en la sección de linderos se registra *"Área construida por escritura: 112.5 m²"* (Evidencia de Fuerza Máxima, $w = 1.0$).
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Revisión detecta la contradicción de la variable Área.
    2.  Aplica el Algoritmo de Deliberación: dado que la escritura pública ($w = 1.0$) es jerárquicamente superior a la ficha técnica ($w = 0.8$), el valor del atributo se actualiza de forma automática a $112.5$ m².
    3.  El NCC del área se recalcula aplicando la fricción: $NCC(\text{Área}) = 1.0 \times (1 - \frac{118 - 112.5}{118}) \approx 0.95$.
    4.  El sistema registra la enmienda en la Historia Cognitiva adjuntando la foto de la escritura como fuente de la evidencia.

---

### TC-03: Conflicto de Evidencias Equivalentes (Discrepancia Irresoluble)
*   **Contexto de Entrada**: Un broker publica en WhatsApp un apartamento: *"Hermoso apartamento en Cedritos, remodelado, precio 650 millones"*. (Evidencia Conversacional, $w = 0.3$).
*   **Hito Temporal (Día 5)**: Otro broker de la red (que comparte la captación del mismo activo) publica en un grupo: *"Comparto comisión. Apto en Cedritos, remodelado, 620 millones fijos"*. (Evidencia Conversacional de la misma fuerza, $w = 0.3$).
*   **Comportamiento Esperado del VRIF**:
    1.  El sistema unifica ambas publicaciones bajo la misma identidad de **Activo** mediante el Principio de Continuidad.
    2.  La Facultad de Juicio detecta una contradicción de precio entre evidencias de fuerza equivalente ($w_1 = w_2 = 0.3$, $v_1 = 650$M vs. $v_2 = 620$M).
    3.  El atributo Precio del PCI transiciona a estado **Cuestionado**.
    4.  El $NCC(\text{Precio})$ se degrada al 50%: $0.5 \times 0.3 = 0.15$.
    5.  El ECC global del PCI cae, reteniendo matches activos.
    6.  Se activa la Facultad de Revisión para evaluar la factibilidad de exploración y proponer un sondeo de verificación de bajo costo a ambos corredores.

---

### TC-04: Fricción Relacional Crítica (Castigo de Confianza)
*   **Contexto de Entrada**: Se detecta un match con una afinidad funcional física del 95% ($Af = 0.95$) entre un PCO y un PCI de la zona de Chicó.
*   **Hito Temporal**: El broker demandante posee un Capital de Confianza Relacional alto ($CC = 0.90$), pero el broker oferente del inmueble posee un historial severo de visitas canceladas y falta de reporte de cierres, con un Capital de Confianza degradado a $CC = 0.20$.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Juicio calcula el coeficiente de confianza relacional de intermediarios: $CC_{rel} = \sqrt{0.90 \times 0.20} \approx 0.42$.
    2.  Aplica la ecuación provisional del IVC ajustado: el valor de afinidad del 95% se ve severamente castigado por el factor $CC_{rel} = 0.42$.
    3.  El IVC final cae por debajo del Umbral de Activación Comercial ($IVC < 0.40$).
    4.  El sistema asigna un **Dictamen D** (Con Fricción Relevante).
    5.  El match se retiene y no se notifica al broker de la demanda, protegiendo su tiempo y su capital comercial de una interacción de alto riesgo relacional.

---

### TC-05: El Activo Fantasma (Vigencia Degradada)
*   **Contexto de Entrada**: Un PCI de un apartamento en arriendo en La Cabrera se registró hace 45 días con datos completos y $NCC = 0.90$.
*   **Hito Temporal (Día 46)**: La operación no ha registrado interacciones, correcciones ni actualizaciones en el canal B2B en los últimos 45 días. Tampoco se ha reportado arrendado.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Inferencia aplica las reglas de Vigencia Cognitiva sobre los datos volátiles del PCI (disponibilidad y precio).
    2.  El $NCC(\text{Disponibilidad})$ se deprecia de forma automática en un 50% por superar el umbral de 30 días sin actualización, cayendo a $0.45$.
    3.  El ECC global del PCI se degrada.
    4.  La Facultad de Juicio re-califica los matches de este inmueble de Dictamen A a **Dictamen C** (En Maduración).
    5.  Se congela la notificación relacional y se gatilla un mensaje automático de exploración de bajo costo al broker captador: *"Hola colega, ¿este apartamento en La Cabrera sigue disponible?"*.

---

### TC-06: Duplicidad Semántica (Aislamiento de Identidad)
*   **Contexto de Entrada**: El Broker A publica: *"Vendo apto 3 alcobas en Rosales, calle 78 con 4, terraza, 1.200 millones, admin 850 mil"*.
*   **Hito Temporal (Día 2)**: El Broker B (socio o captador secundario) publica: *"Apto Rosales para venta, 3 alcobas, 3 baños, terraza grande, admin 850.000 fijos. 1.200M negociables"*.
*   **Comportamiento Esperado del VRIF**:
    1.  El motor de comprensión ingesta ambos textos.
    2.  La Facultad de Comprensión aplica el **Principio de Continuidad** analizando las coordenadas geográficas implícitas y las variables físicas/financieras idénticas (Rosales, 3 alcobas, 1.200M, administración 850 mil).
    3.  El sistema identifica que ambas publicaciones describen la misma entidad física (**Activo**).
    4.  El sistema **no duplica la ficha del Activo**. Asigna ambas publicaciones como evidencias complementarias al mismo PCI activo, vinculando a los dos brokers como intermediarios disponibles.

---

### TC-07: El Desfase Compensado (Afinidad Emocional)
*   **Contexto de Entrada**: Un PCO tiene un presupuesto innegociable de canon de arriendo de 3.0 millones de COP. Sin embargo, su TIO de Habitar destaca una alta prioridad (VDC Nivel 4) en *"terraza y luz natural"* para albergar plantas.
*   **Hito Temporal**: El sistema encuentra un PCI de un apartamento con un canon de arriendo de 3.4 millones de COP (desfase del 13.3%), pero cuenta con un ático iluminado con terraza privada de 30 m² y el broker reporta *"propietario flexible"*.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Inferencia calcula que el desfase financiero está dentro de la Distancia Negociable (menor al 15% con flexibilidad). Pondera que la presencia de la terraza compensa la desviación de precio de arriendo en la percepción de valor funcional del PCO.
    2.  El $IVC$ final se sitúa en un valor superior a $0.65$.
    3.  El sistema emite un **Dictamen B** (Viabilidad Prometedora) y gatilla la alerta sugiriendo al broker: *"El canon supera el límite del cliente por 400 mil pesos, pero el inmueble cuenta con la terraza de 30 m² solicitada y flexibilidad de precio"*.

---

### TC-08: Ambigüedad Geográfica (Expansión Inteligente)
*   **Contexto de Entrada**: Un PCO declara como sector preferente (VDC Nivel 2): *"Chicó Reservado"*. La TIO es Habitar y requiere un entorno silencioso y caminable.
*   **Hito Temporal**: No existen inmuebles disponibles que cumplan los filtros técnicos estrictos dentro de Chicó Reservado en el presupuesto de 800 millones de COP.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Inferencia aplica el **Principio de Expansión Inteligente** al no encontrar oferta viable.
    2.  Deduce que la Necesidad Real del cliente es la seguridad, caminabilidad y silencio que caracterizan a esa zona específica de Bogotá.
    3.  Sujeto a las VDC de Nivel 1 (Bogotá), el sistema expande el radio analítico a barrios colindantes con idénticas cualidades ambientales y residenciales (ej: *La Carolina* o *Santa Ana Occidental*).
    4.  Identifica un apartamento interior con vista a parque en La Carolina por 780 millones de COP y genera un match con **Dictamen B**, advirtiendo al broker sobre la alternativa geográficamente equivalente.

---

### TC-09: El Silencio Comercial (Inacción de Inferencia)
*   **Contexto de Entrada**: Se activa un match de Dictamen B entre el PCO de un broker y el PCI de otro broker de la red.
*   **Hito Temporal**: JanIA notifica a ambos brokers mediante el Double Opt-In. Pasan 5 días hábiles y ninguno de los dos brokers responde, acepta o declina la propuesta en el chat privado.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Inferencia interpreta el desinterés de los brokers.
    2.  Aplica el **Principio de Silencio como Evidencia**.
    3.  El NCC de la disponibilidad de la operación de ambos lados se deprecia en un 10% diario a partir del quinto día.
    4.  El estado de la Negociación pasa a `Inactivo por Desinterés`.
    5.  El sistema congela futuros matches cruzados de estos mismos perfiles hasta que los brokers reconfirmen su actividad o actualicen la Historia Cognitiva de sus requerimientos.

---

### TC-10: Cierre Forzado de Negociación por Evidencia Invalidante
*   **Contexto de Entrada**: Se encuentra una Negociación en estado `Activa` (visita coordinada en proceso) entre el PCO de la cliente María Elvira y el PCI de un apartamento en Cedritos.
*   **Hito Temporal**: El broker del vendedor publica en un grupo de WhatsApp abierto: *"Apto Cedritos ya arrendado, gracias a todos por el interés"*.
*   **Comportamiento Esperado del VRIF**:
    1.  La Facultad de Comprensión interpreta el mensaje B2B como **Evidencia Invalidante** (Capítulo 6 de la Constitución).
    2.  La Facultad de Revisión actualiza el estado del PCI de `Disponible` a `Transaccionado` (inactivo).
    3.  La Negociación en curso se cancela de forma automática, transicionando su estado a `Desistida por Retiro del Activo`.
    4.  El sistema cancela cualquier alerta o recordatorio de visita programada para ese match, notificando discretamente al broker de la demanda sobre el cierre externo para proteger su tiempo.
