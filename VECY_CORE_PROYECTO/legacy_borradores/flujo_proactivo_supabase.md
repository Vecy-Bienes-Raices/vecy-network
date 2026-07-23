# Flujo de Procesamiento Proactivo y Lógica de Matching en Supabase

## 1. El Concepto de "Procesamiento Proactivo"
El objetivo es que el usuario no tenga que pensar en formatos. El Agente IA actúa como un secretario inteligente que "limpia" la información.

### Ejemplo de Interacción:
*   **Usuario:** (Pega un texto sucio) *"Vendo apto en cedritos, 3 alcobas, sala comedor, cocina integral, 2 baños, garaje. Piso 4. Info al 310..."*
*   **Agente IA:** *"¡Perfecto! He registrado tu apartamento en Cedritos con 3 alcobas y 2 baños. Solo me falta el **precio** para empezar a buscarte un comprador. ¿En cuánto lo estás vendiendo?"*
*   **Usuario:** *"450 millones"*
*   **Agente IA:** *"¡Listo! Guardado por 450M. He encontrado 3 personas buscando algo similar en Cedritos. ¿Quieres que les envíe la información?"*

## 2. Lógica de Matching en Supabase (PostgreSQL)
Usaremos una función de base de datos (RPC) para encontrar coincidencias instantáneas. Esto es mucho más rápido que hacerlo en el código del servidor.

### Estructura de Tablas:
- `inmuebles`: id, tipo, zona, precio, habitaciones, baños, contacto, raw_text.
- `requerimientos`: id, tipo, zona, presupuesto_max, habitaciones_min, contacto, raw_text.

### Función de Matching (Concepto SQL):
```sql
CREATE OR REPLACE FUNCTION buscar_matches_inmueble(p_tipo TEXT, p_zona TEXT, p_precio NUMERIC)
RETURNS SETOF requerimientos AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM requerimientos
  WHERE tipo = p_tipo
    AND zona = p_zona
    AND presupuesto_max >= p_precio;
END;
$$ LANGUAGE plpgsql;
```

## 3. Integración con Infraestructura del Usuario
- **Supabase:** Base de datos y funciones de matching.
- **Vercel/Netlify:** Edge Functions para procesar los webhooks de WhatsApp rápidamente.
- **Google Cloud:** Podemos usar *Cloud Vision* si el usuario envía fotos del inmueble para extraer datos automáticamente (ej: si hay un letrero de "Se Vende").
- **Antigravity:** Coordinación de la lógica de alto nivel y prompts complejos.
