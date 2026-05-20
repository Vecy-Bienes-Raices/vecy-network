import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB connection failed");
    return;
  }

  console.log("Updating Postgres function buscar_matches_para_inmueble...");
  
  const ddl = `
    CREATE OR REPLACE FUNCTION buscar_matches_para_inmueble(
        p_inmueble_id integer
    ) RETURNS TABLE (
        requirement_id integer,
        score NUMERIC
    ) AS $$
    DECLARE
        v_inmueble record;
    BEGIN
        SELECT * INTO v_inmueble FROM properties WHERE id = p_inmueble_id;

        IF v_inmueble IS NULL THEN
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            r.id AS requirement_id,
            (
                -- Puntuación por tipo de inmueble (alta prioridad)
                CASE WHEN r."tipoInmuebleDeseado" = v_inmueble."propertyType" THEN 10 ELSE 0 END +
                -- Puntuación por ciudad (alta prioridad)
                CASE WHEN r."ciudadDeseada" = v_inmueble."city" THEN 8 ELSE 0 END +
                -- Puntuación por zona (media prioridad)
                CASE WHEN r."zonaDeseada" = v_inmueble."zone" THEN 6 ELSE 0 END +
                -- Puntuación por precio (rango)
                CASE WHEN v_inmueble.price BETWEEN COALESCE(r."presupuestoMin", 0) AND COALESCE(r."presupuestoMax", 999999999999) THEN 7 ELSE 0 END +
                -- Puntuación por habitaciones
                CASE WHEN v_inmueble.bedrooms >= COALESCE(r."habitacionesMin", 0) THEN 5 ELSE 0 END +
                -- Puntuación por baños
                CASE WHEN v_inmueble.bathrooms >= COALESCE(r."banosMin", 0) THEN 4 ELSE 0 END +
                -- Puntuación por parqueaderos
                CASE WHEN v_inmueble.garages >= COALESCE(r."parqueaderosMin", 0) THEN 4 ELSE 0 END
            )::NUMERIC AS score
        FROM requirements r
        WHERE
            r.status = 'active' AND
            v_inmueble."transactionType" = r."tipoNegocioDeseado" AND
            LOWER(UNACCENT(r."zonaDeseada")) = LOWER(UNACCENT(v_inmueble."zone")) AND
            r."tipoInmuebleDeseado" = v_inmueble."propertyType" AND
            r."habitacionesMin" = v_inmueble.bedrooms AND
            r."banosMin" = v_inmueble.bathrooms AND
            r."parqueaderosMin" = v_inmueble.garages AND
            (
              v_inmueble."propertyType" IN ('house', 'building', 'warehouse', 'land', 'farm')
              OR (r."caracteristicasDeseadas"->>'interiorExterior') IS NULL
              OR LOWER(UNACCENT(COALESCE(v_inmueble.amenities->>'interiorExterior', ''))) = LOWER(UNACCENT(COALESCE(r."caracteristicasDeseadas"->>'interiorExterior', '')))
            );
    END;
    $$ LANGUAGE plpgsql;
  `;

  await db.execute(sql.raw(ddl));
  console.log("Postgres function successfully updated!");
  process.exit(0);
}

main().catch(console.error);
