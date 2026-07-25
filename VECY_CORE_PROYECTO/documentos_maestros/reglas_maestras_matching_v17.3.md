# 🛡️ REGLAS MAESTRAS E INALTERABLES DEL MOTOR DE MATCHING VECY CORE (v17.3)
### Documento de Referencia Permanente del Sistema de Afinidad Comercial Inmobiliaria

> **DIRECTRIZ PARA IA Y DESARROLLADORES**: Este documento contiene la **DOCTRINA OFICIAL E INVIOLABLE** del motor de coincidencia (Matching Engine) de VECY Network. Ningún desarrollador ni modelo de IA puede alterar, relajar o modificar las reglas aquí establecidas sin autorización expresa del equipo fundador (Eduardo Rivera y Jani Alves).

---

## 🛑 1. REGLAS DE FILTROS DUROS (SCORE 0% INMEDIATO SI FALLA)

Para que dos registros (Inmueble ↔ Requerimiento) puedan ser evaluados, **DEBEN SUPERAR LOS 7 FILTROS DUROS**. Si uno solo falla, el par es **RECHAZADO CON SCORE 0%**:

| # | Atributo | Regla Doctrinaria Invariable | Consecuencia si Falla |
|:---|:---|:---|:---:|
| **1** | **Tipo de Negocio** | • `Arriendo` vs `Venta` → ❌ **0% IMPOSIBLE (Bloqueo Absoluto)**<br>• `Arriendo` vs `Arriendo opción compra` → ❌ **0% IMPOSIBLE (Regla v17.2)**<br>• `Arriendo` vs `Venta/Arriendo` (o viceversa) → ✅ **100% POSIBLE / OK**<br>• `Venta` ↔ `Venta`, `Venta/Arriendo`, `Venta/Permuta`, `Opción Compra` → ✅ **100% POSIBLE / OK** | **0% Score** *(Filtro Duro)* |
| **2** | **Tipo y Subtipo de Inmueble** | • Categoría: Apartamento ↔ Casa / Bodega / Lote / Oficina → ❌ **0% IMPOSIBLE**<br>• Subtipo: Apartamento Estándar ↔ Apartaestudio ↔ Loft → ❌ **0% IMPOSIBLE** | **0% Score** *(Filtro Duro)* |
| **3** | **Ciudad** | • Coincidencia geográfica obligatoria por municipio (ej: Bogotá ↔ Bogotá). Difiere → ❌ **0% IMPOSIBLE** | **0% Score** *(Filtro Duro)* |
| **4** | **Zona / Barrio** | • Si se solicita un barrio concreto (ej: `Cedritos`), una oferta en `El Refugio`, `Rosales` o `Chicó` → ❌ **0% IMPOSIBLE**.<br>• Solo se permite barrio aledaño/contiguo si la demanda incluye *"aledaños"* o *"cercanos"*. | **0% Score** *(Filtro Duro)* |
| **5** | **Área Mínima (Metraje en Duro)** | • Metraje ofrecido no puede ser menor al mínimo exigido (`propArea >= reqAreaMin * 0.90`).<br>• Oferta 139 m² vs Demanda mínimo 200 m² → ❌ **0% IMPOSIBLE**.<br>• Oferta `N/E` (sin metraje) vs Demanda con metraje exigido → ❌ **0% IMPOSIBLE**. | **0% Score** *(Filtro Duro)* |
| **6** | **Presupuesto Máximo** | • Arriendo: (Canon + Admin) > Presupuesto + 2% → ❌ **0% IMPOSIBLE**.<br>• Venta: Precio > Presupuesto + 5% → ❌ **0% IMPOSIBLE**. | **0% Score** *(Filtro Duro)* |
| **7** | **Habitaciones Mínimas** | • Habitaciones ofrecidas no pueden ser inferiores a las exigidas (`pBedrooms >= rBedrooms`).<br>• Oferta 2 habs vs Demanda 3 habs → ❌ **0% IMPOSIBLE**.<br>• Oferta `N/E` (sin habs) vs Demanda con habs exigidas → ❌ **0% IMPOSIBLE**. | **0% Score** *(Filtro Duro)* |

---

## 🏆 2. UMBRAL VECY Y CAPPING DEL MATCH PERFECTO (100%)

1. **Threshold Mínimo de Almacenamiento en BD (85%+)**:
   - Únicamente los pares con score **$\ge$ 85%** se guardan en la tabla `propertyMatches` de Supabase. Cualquier match con score < 85% se ignora y elimina automáticamente.

2. **Cero Campos Faltantes (`N/E`) para Match Perfecto (100%)**:
   - La insignia **⭐ 100% MATCH PERFECTO** requiere que **TODOS** los campos solicitados existan, hayan sido extraídos y coincidan al 100%.

3. **Penalización Automática por Información Incompleta**:
   - Si **CUALQUIER campo relevante está en `N/E`** (no extraído / información no especificada), el puntaje máximo se **CAPA AUTOMÁTICAMENTE A UN MÁXIMO DE 84%**, impidiendo la emisión de insignias falsas o ingresar al sistema.

---

## 📐 3. ESTRUCTURA FIJA DE LA TABLA EN LA WEB (FRONT-END)

Para evitar confusión visual en la consola administrativa de la plataforma web, el orden y colores de las columnas en `AdminMatches.tsx` y `MatchesReport.tsx` quedan bloqueados así:

- **Columna 1**: `Característica` *(Gris Zinc)*
- **Columna 2**: `Ofrecido (Oferta / Inmueble)` *(Texto Dorado `#bf953f`)*
- **Columna 3**: `Buscado (Demanda / Requerimiento)` *(Texto Cyan `#22d3ee`)*
- **Columna 4**: `Cumplimiento` *(Insignia Verde "Coincide" / Amber "Aproximado")*

```
┌─────────────────┬─────────────────────────┬─────────────────────────┬──────────────┐
│ Característica  │  Ofrecido (Oferta)      │  Buscado (Demanda)      │ Cumplimiento │
│                 │  (Color Dorado #bf953f) │  (Color Cyan #22d3ee)   │              │
├─────────────────┼─────────────────────────┼─────────────────────────┼──────────────┤
│ Tipo Negocio    │ Arriendo                │ Arriendo                │ Coincide     │
│ Ubicación       │ Cedritos, Bogotá        │ Cedritos, Bogotá        │ Coincide     │
│ Área Total      │ 210 m²                  │ ≥ 200 m²                │ Coincide     │
│ Presupuesto     │ $ 3.500.000             │ Hasta $ 3.800.000       │ Coincide     │
└─────────────────┴─────────────────────────┴─────────────────────────┴──────────────┘
```

---

## 🧹 4. REGLA DE DESDUPLICACIÓN EN INGESTA

- **Deduplicación por Inmueble/Requerimiento Identico**: Si un asesor publica el mismo inmueble o requerimiento varias veces en WhatsApp, el sistema conserva el registro más reciente y elimina las versiones duplicadas anteriores.
- **Unicidad de Par en Match**: En la tabla `propertyMatches` solo puede existir una entrada por cada par único `(propertyId, requirementId)`.
