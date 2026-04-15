# Blueprint: Estandarización Geográfica Automatizada (Vecy Gold Edition)

Este documento contiene el diseño de arquitectura y los pasos exactos que un Agente Inteligente / Desarrollador deberá ejecutar en el futuro, una vez que todas las fichas técnicas (repositorios de GitHub/Netlify) estén organizadas por parte del equipo vecinal. 

El objetivo es eliminar la captura de texto manual y automatizar la extracción cartográfica de cada inmueble para garantizar un formato limpio y exacto: `[Tipo] en [Barrio] 📍 [Localidad], [Ciudad]`.

## Arquitectura de Solución Propuesta

Para lograr la automatización territorial de clase mundial usaremos un **Servicio de Geocodificación Estructurada**. Nuestro sistema tomará una entrada imprecisa del README o ficha técnica (ej. `"Edificio San luis rentando"`), se la enviará al proveedor geoespacial, el modelo identificará las coordenadas y nos retornará los valores exactos, organizados y libres de errores.

### Proveedor Geoespacial
- **Principal:** `Google Maps Geocoding API` (Provee máxima precisión de barrios y localidades en Colombia).
- **Alternativa (Gratuita/Open Source):** `Nominatim (OpenStreetMap)` (Sin necesidad de tarjeta de crédito, ideal para MVP en Colombia, provee una desagregación aceptable de distritos).

---

## Fases de Implementación (Futuro)

### 1. Actualización del Drizzle ORM Schema
La base de datos actual (`drizzle/schema.ts`) requerirá nuevos campos estrictos para dejar de usar un simple string de `location`:
```typescript
// Cambios propuestos en schema.ts
// - Quitar o refactorizar: location: text("location").notNull(),
// + Añadir:
// coordinates: jsonb("coordinates"), // { lat, lng }
// address_city: varchar("address_city", { length: 100 }),
// address_locality: varchar("address_locality", { length: 100 }), // ej. Usaquén, Suba
// address_neighborhood: varchar("address_neighborhood", { length: 150 }), 
```

### 2. Modificación del Script Sincronizador Maestro
Alteraremos el script `scripts/sync-properties-from-github.mjs`. En lugar de buscar expresiones regulares crudas intentando adivinar el lugar, introduciremos una petición a la API de geocodificación.

**Flujo en el Script:**
1. Lee `README.md` o `data.json` del Repositorio de Github de la propiedad.
2. Identifica cualquier línea con "Ubicación" o "Location".
3. **[NUEVO]** Envía ese string a la API Geográfica en tiempo real.
4. Recibe respuesta estructurada y secciona las variables: `cityName`, `localityName`, `neighborhoodName`.

### 3. Actualización de Interfaz (El Ecosistema Vecy)
Dado que a nivel de servidor la base enviará un molde perfecto y digerido, los componentes como `client/src/components/PropertyCard.tsx` y las páginas de catálogo ya no necesitarán procesar lógica ni regex. Renderizarán visualmente directo del JSON pre-ensamblado:

```tsx
<h3 className="text-xl font-bold">{propertyType} en {address_neighborhood}</h3>
<p className="flex items-center text-sm">
  <MapPin size={16}/> {address_city}, {address_locality}
</p>
```

---

## 🛠 Entregables Requeridos para Ejecución (Pre-Condiciones)
Para el día que se decida presionar el "Botón Verde" de esta automatización, el Agente y el Usuario necesitarán lo siguiente:
1. **Limpieza de Repositorios**: Todos los repositorios fuente (Github) de propiedades deben poseer al menos una vez la ubicación mencionada claramente en el texto descriptivo (ej. "Ubicación: Bogotá, Chapinero").
2. *(Opcional)*: Generar una API Key de Google Maps Cloud Platform e inyectarla en el archivo `.env`. Si no se provee la llave en su momento, el agente debe estar instruido para usar Nominatim (OpenStreetMap) de manera libre nativa.

> Agente de Inteligencia Artificial que retome esta tarea: Inicia implementando el punto 1 y discute la API Key con Eduardo قبل de proceder a las modificaciones del `.mjs`.
