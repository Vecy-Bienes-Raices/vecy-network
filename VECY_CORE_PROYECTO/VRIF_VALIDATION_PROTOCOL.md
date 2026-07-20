# VRIF: PROTOCOLO DE VALIDACIÓN CIENTÍFICA (VRIF v2.0)
*Metodología de Validación y Pruebas Empíricas del Standard de Razonamiento Epistemológico*

---

## INTRODUCCIÓN y ALCANCE

Este documento define la metodología científica y las métricas formales diseñadas para evaluar la consistencia interna, precisión predictiva e integridad lógica del **VECY Real Estate Intelligence Framework (VRIF)**. 

La meta de este protocolo no es confirmar de manera sesgada que el framework funciona, sino **someter la doctrina a un proceso sistemático de falsación empírica**, identificando los límites de su poder explicativo.

---

## 1. PROTOCOLO DE MEDICIÓN DE PRECISIÓN DEL IVC

El Índice de Viabilidad Comercial (IVC) emite un dictamen cualitativo sobre la probabilidad de acuerdo. Para verificar su precisión de forma científica, se comparará el Dictamen emitido antes del contacto relacional con el desenlace real obtenido post-contacto relacional.

### 1.1 Metodología de Muestreo y Recolección
1.  **Registro de Predicción**: Cada vez que el motor cognitivo proponga un cruce (Double Opt-In), se grabará de forma inmutable el valor exacto del $IVC$, el Dictamen Comercial asignado ($A$ o $B$) y el desglose de variables que motivaron el cálculo.
2.  **Seguimiento del CVO**: Se monitoreará de forma asíncrona la evolución de la interacción a través de los hitos del ciclo de vida durante un periodo de observación máximo de 90 días.
3.  **Registro de Desenlace**: Al concluir el plazo, la interacción se catalogará en una de las siguientes categorías empíricas:
    *   `Éxito Transaccional`: Cierre y firma de acuerdo (Promesa/Arras/Contrato).
    *   `Negociación Activa`: Interacción continuada con visitas sucesivas sin desistimiento.
    *   `Rechazo Relacional Rápido`: Uno o ambos corredores rechazan iniciar contacto tras ver la propuesta.
    *   `Fallo por Fricción`: Contacto iniciado, pero desistido debido a Variables Adaptables (Nivel 3).
    *   `Fallo por Barrera Rígida`: Desistimiento inmediato debido a incompatibilidad de Variables Bloqueantes (Nivel 1) no identificadas por mala calidad de evidencias iniciales.

### 1.2 Mapeo de Concordancia de Predicción
Para cada dictamen de viabilidad se evaluará la desviación de acuerdo a la siguiente matriz de concordancia:

| Dictamen IVC | Desenlace Esperado | Desenlace Empírico Aceptable | Falla del Modelo (Desviación) |
| :--- | :--- | :--- | :--- |
| **Dictamen A** | Éxito o Negociación Activa | Fallo por Fricción (Nivel 3) | Rechazo Relacional Rápido o Fallo por Barrera Rígida |
| **Dictamen B** | Negociación Activa o Éxito | Fallo por Fricción (Nivel 3) | Fallo por Barrera Rígida |
| **Dictamen C** | Maduración (sin contacto inmediato) | Sondeo activo que eleva o descarte | Disparar match directo prematuro |
| **Dictamen D** | Inacción o Exploración indirecta | Retener la alerta | Conexión directa forzada que resulta en rechazo |

### 1.3 Métrica de Precisión Global ($P_{ivc}$)
Se define el coeficiente de precisión del IVC como:
$$P_{ivc} = \frac{\text{Matches con Desenlace Aceptable}}{\text{Total de Matches Notificados}} \ge 0.85 \quad (\text{Umbral de Calidad})$$

---

## 2. METODOLOGÍA DE EVALUACIÓN DE LA EXPLICABILIDAD

Dado que la explicabilidad es un derecho del corredor, se debe medir de manera cualitativa y cuantitativa si las explicaciones provistas por la Facultad de Juicio cumplen su propósito.

### 2.1 Métrica de Fidelidad Doctrinal ($F_{exp}$)
Mide si la justificación generada por el sistema utiliza estrictamente conceptos oficiales del VRIF (NCC, VDC, TIO, objeciones, flexibilidades) o si introduce sesgos opacos.
$$F_{exp} = \frac{\text{Explicaciones alineadas a la taxonomía VRIF}}{\text{Total de justificaciones emitidas}} = 1.00 \quad (\text{Invariante del Estándar})$$

### 2.2 Evaluación Humana (Panel B2B)
Se seleccionará una muestra aleatoria del 5% de los dictámenes emitidos. Un panel independiente de tres corredores senior de la red calificará la justificación bajo una escala Likert de 1 a 5:
*   *¿La explicación describe claramente por qué se descartó o recomendó el negocio?*
*   *¿El lenguaje es consistente con la jerga profesional?*
*   *¿Aporta valor para tomar una decisión comercial rápida?*
Se exige una calificación promedio superior a **4.2 / 5.0** para validar el modelo conversacional.

---

## 3. METODOLOGÍA DE CONTROL DE APRENDIZAJE (TACC)

El aprendizaje dual (Mercado y Relacional) no debe generar sobreajuste ni derivas en la doctrina.

### 3.1 Control de Deriva de Memoria Comercial (Mercado)
Para evitar que el aprendizaje de mercado genere falsas tendencias (ej: sobrevalorar o devaluar una zona entera por dos ventas atípicas de urgencia extrema):
*   **Prueba de Consistencia**: Se contrastará periódicamente la elasticidad de negociación de precios y costos de administración históricos. Si la desviación estándar del coeficiente de rebaja promedio calculado por el TACC en una zona específica varía más del 20% en un intervalo menor a 60 días, el sistema bloqueará la actualización automática y transicionará el patrón a estado **En Revisión**.

### 3.2 Control de Sesgo en Aprendizaje Relacional (Actores)
Para evitar que una mala experiencia aislada destruya de forma permanente el Capital de Confianza de un corredor:
*   **Regla de Atenuación Progresiva**: Una penalización por incumplimiento de visita o demora de respuesta en el chat relacional debe atenuarse paulatinamente a lo largo del tiempo si el bróker acumula nuevas evidencias de cooperación positiva (comportamiento observable). La confianza debe poder recuperarse tras $N$ transacciones limpias sucesivas.

---

## 4. PROTOCOLO DE MEDICIÓN DE ERRORES DEL SISTEMA (FALSOS POSITIVOS Y NEGATIVOS)

Los errores de matching tienen costos relacionales y de oportunidad sumamente asimétricos.

### 4.1 Falsos Positivos (Matches Estériles)
*   **Definición**: Un match notificado al broker que es rechazado inmediatamente debido a incompatibilidades de Variables Bloqueantes (Nivel 1) u objeciones críticas conocidas y no procesadas.
*   **Métrica de Tolerancia**:
    $$T_{fp} = \frac{\text{Matches con Rechazo Rápido por Nivel 1}}{\text{Total de Matches Notificados}} \le 0.05 \quad (\text{Máximo 5%})$$
*   *Costo Relacional*: Alto. Genera fatiga en el corredor y destruye la confianza en el sistema cognitivo.

### 4.2 Falsos Negativos (Matches Omitidos)
*   **Definición**: Negociaciones que se concretan de forma exitosa en el mercado real entre brokers de la red, pero que el motor cognitivo descartó o retuvo con dictamen D o E (omisión comercial).
*   **Métrica de Tolerancia**:
    $$T_{fn} = \frac{\text{Acuerdos cerrados que fueron descartados por el IVC}}{\text{Total de Negociaciones exitosas en la red}} \le 0.10 \quad (\text{Máximo 10%})$$
*   *Costo de Oportunidad*: Alto para la facturación de la red, pero preferible en etapas iniciales para resguardar la credibilidad del ecosistema frente a la saturación.
