-- ============================================================================
-- MIGRACIÓN PL/pgSQL: Motor RPC de Matching Vectorial VECY CORE v21.21
-- Calcula afinidad comercial de 100 puntos y aplica filtros duros inquebrantables.
-- ============================================================================

CREATE OR REPLACE FUNCTION match_properties_for_requirement(
    p_req_id INT,
    p_min_score NUMERIC DEFAULT 80.0
)
RETURNS TABLE (
    property_id INT,
    match_score NUMERIC,
    match_reason TEXT,
    property_name TEXT,
    property_city TEXT,
    property_zone TEXT,
    property_price NUMERIC,
    property_type TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_req RECORD;
    v_prop RECORD;
    v_score NUMERIC;
    v_type_score NUMERIC;
    v_trans_score NUMERIC;
    v_zone_score NUMERIC;
    v_price_score NUMERIC;
    v_area_score NUMERIC;
    v_bed_score NUMERIC;
    v_bath_score NUMERIC;
    v_gar_score NUMERIC;
    v_strat_score NUMERIC;
    v_age_score NUMERIC;
    
    v_req_city TEXT;
    v_prop_city TEXT;
    v_req_zone TEXT;
    v_prop_zone TEXT;
    v_req_type TEXT;
    v_prop_type TEXT;
    v_req_trans TEXT;
    v_prop_trans TEXT;
    v_req_price NUMERIC;
    v_prop_price NUMERIC;
    v_req_area NUMERIC;
    v_prop_area NUMERIC;
    
    v_is_sabana_req BOOLEAN;
    v_is_urban_prop BOOLEAN;
BEGIN
    -- 1. Cargar requerimiento
    SELECT * INTO v_req FROM requirements WHERE id = p_req_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_req_city  := LOWER(COALESCE(v_req."ciudadDeseada", v_req.address_city, ''));
    v_req_zone  := LOWER(COALESCE(v_req."zonaDeseada", v_req.address_neighborhood, ''));
    v_req_type  := LOWER(COALESCE(v_req."tipoInmuebleDeseado"::text, ''));
    v_req_trans := LOWER(COALESCE(v_req."tipoNegocioDeseado"::text, ''));
    v_req_price := COALESCE(v_req."presupuestoMax", 0);
    v_req_area  := COALESCE(v_req."areaMin", 0);

    -- Detección Sabana Norte
    v_is_sabana_req := (v_req_zone LIKE '%san simon%' OR v_req_zone LIKE '%guaymaral%' OR v_req_zone LIKE '%fontanar%' 
                        OR v_req_zone LIKE '%fagua%' OR v_req_zone LIKE '%potosi%' OR v_req_zone LIKE '%chia%' OR v_req_zone LIKE '%sopo%');

    -- 2. Iterar sobre inmuebles activos
    FOR v_prop IN SELECT * FROM properties WHERE estado_comercial = 'ACTIVO' OR estado_comercial IS NULL LOOP
        v_prop_city  := LOWER(COALESCE(v_prop.city, v_prop.address_city, ''));
        v_prop_zone  := LOWER(COALESCE(v_prop.address_neighborhood, v_prop.zone, ''));
        v_prop_type  := LOWER(COALESCE(v_prop."propertyType"::text, ''));
        v_prop_trans := LOWER(COALESCE(v_prop."transactionType"::text, ''));
        v_prop_price := COALESCE(v_prop.price, 0);
        v_prop_area  := COALESCE(v_prop."areaTotal", v_prop."areaPrivate", 0);

        v_is_urban_prop := (v_prop_zone LIKE '%prado veraniego%' OR v_prop_zone LIKE '%cedritos%' 
                            OR v_prop_zone LIKE '%chico%' OR v_prop_zone LIKE '%chapinero%');

        -- ====================================================================
        -- FILTROS DUROS INQUEBRANTABLES (0% SCORE)
        -- ====================================================================

        -- A. Discrepancia Municipal (Guaduas vs Bogotá, Medellín vs Cali)
        IF v_req_city <> '' AND v_prop_city <> '' AND v_req_city <> v_prop_city 
           AND v_req_city NOT IN ('bogota') AND v_prop_city NOT IN ('bogota') THEN
            CONTINUE;
        END IF;

        -- A2. Guard Cardinales y Zonas Genéricas ("Norte", "Sur", "Oriente", "Occidente", "Centro", "Sabana", "NA", "N/E")
        -- "Norte" NO es un barrio ni vereda. Si no hay barrio/vereda específico ni cuadrante vial, DESCARTAR (0%).
        IF v_req_zone IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'sabana norte', 'na', 'n/e', 'por definir', '')
           OR v_prop_zone IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'sabana norte', 'na', 'n/e', 'por definir', '') THEN
            IF NOT (
                (v_req_zone LIKE '%cll%' OR v_req_zone LIKE '%calle%' OR v_req_zone LIKE '%cra%' OR v_req_zone LIKE '%carrera%')
                AND (v_prop_zone LIKE '%cll%' OR v_prop_zone LIKE '%calle%' OR v_prop_zone LIKE '%cra%' OR v_prop_zone LIKE '%carrera%')
            ) THEN
                CONTINUE;
            END IF;
        END IF;

        -- B. Guard Sabana Norte Campestre vs Bogotá Urbano Denso
        IF v_is_sabana_req AND v_is_urban_prop THEN
            CONTINUE;
        END IF;

        -- C. Incompatibilidad Comercial Edificio / Bodega vs Residencial
        IF (v_req_type IN ('house', 'apartment', 'apartamento_estandar') AND v_prop_type IN ('building', 'warehouse') 
            AND v_prop.name ILIKE '%edificio%') THEN
            CONTINUE;
        END IF;

        -- D. Incompatibilidad de Transacción (Arriendo vs Venta = 0%)
        IF (v_req_trans = 'arriendo' AND v_prop_trans = 'venta') 
           OR (v_req_trans = 'venta' AND v_prop_trans = 'arriendo') THEN
            CONTINUE;
        END IF;

        -- E. Área muy inferior (-5% piso doctrinal v20.0)
        IF v_req_area > 0 AND v_prop_area > 0 AND v_prop_area < (v_req_area * 0.95) THEN
            CONTINUE;
        END IF;

        -- E2. Precio supera presupuesto máximo
        IF v_req_price > 0 AND v_prop_price > 0 AND v_prop_price > v_req_price THEN
            CONTINUE;
        END IF;

        -- ====================================================================
        -- MATRIZ DE PONDERACIÓN VECY DE 100 PUNTOS
        -- ====================================================================
        v_type_score := CASE WHEN v_req_type = v_prop_type THEN 15.0 ELSE 7.0 END;
        v_trans_score := CASE WHEN v_req_trans = v_prop_trans THEN 15.0 ELSE 10.0 END;
        
        -- Ubicación (20 pts)
        IF v_req_zone <> '' AND v_prop_zone <> '' 
           AND v_req_zone NOT IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'na', 'n/e')
           AND v_prop_zone NOT IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'na', 'n/e')
           AND (v_req_zone LIKE '%' || v_prop_zone || '%' OR v_prop_zone LIKE '%' || v_req_zone || '%') THEN
            v_zone_score := 20.0;
        ELSIF v_req_city <> '' AND v_prop_city <> '' AND v_req_city = v_prop_city THEN
            v_zone_score := 15.0;
        ELSE
            v_zone_score := 10.0;
        END IF;

        -- Presupuesto (15 pts)
        IF v_req_price > 0 AND v_prop_price > 0 THEN
            IF v_prop_price <= v_req_price THEN
                v_price_score := 15.0;
            ELSE
                v_price_score := 0.0;
            END IF;
        ELSE
            v_price_score := 15.0;
        END IF;

        -- Área Total (10 pts)
        IF v_req_area > 0 AND v_prop_area > 0 THEN
            IF v_prop_area >= v_req_area THEN
                v_area_score := 10.0;
            ELSE
                v_area_score := 5.0;
            END IF;
        ELSE
            v_area_score := 10.0;
        END IF;

        -- Habitaciones (10 pts)
        IF COALESCE(v_req."habitacionesMin", 0) > 0 THEN
            IF COALESCE(v_prop.bedrooms, 0) >= v_req."habitacionesMin" THEN
                v_bed_score := 10.0;
            ELSE
                v_bed_score := 0.0;
            END IF;
        ELSE
            v_bed_score := 10.0;
        END IF;

        -- Baños (4 pts)
        IF COALESCE(v_req."banosMin", 0) > 0 THEN
            IF COALESCE(v_prop.bathrooms, 0) >= v_req."banosMin" THEN
                v_bath_score := 4.0;
            ELSE
                v_bath_score := 1.0;
            END IF;
        ELSE
            v_bath_score := 4.0;
        END IF;

        -- Parqueaderos (4 pts)
        IF COALESCE(v_req."parqueaderosMin", 0) > 0 THEN
            IF COALESCE(v_prop.garages, 0) >= v_req."parqueaderosMin" THEN
                v_gar_score := 4.0;
            ELSE
                v_gar_score := 1.0;
            END IF;
        ELSE
            v_gar_score := 4.0;
        END IF;

        -- Estrato (3 pts) & Antigüedad (4 pts)
        v_strat_score := 3.0;
        v_age_score   := 4.0;

        -- Score Final Sumatorio
        v_score := v_type_score + v_trans_score + v_zone_score + v_price_score + v_area_score + v_bed_score + v_bath_score + v_gar_score + v_strat_score + v_age_score;

        IF v_score >= p_min_score THEN
            property_id     := v_prop.id;
            match_score     := ROUND(v_score, 2);
            match_reason    := 'Coincidencia Vectorial PL/pgSQL Supabase v21.21';
            property_name   := v_prop.name;
            property_city   := v_prop.city;
            property_zone   := v_prop.address_neighborhood;
            property_price  := v_prop.price;
            property_type   := v_prop."propertyType"::text;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION match_requirements_for_property(
    p_prop_id INT,
    p_min_score NUMERIC DEFAULT 80.0
)
RETURNS TABLE (
    requirement_id INT,
    match_score NUMERIC,
    match_reason TEXT,
    requirement_name TEXT,
    requirement_city TEXT,
    requirement_zone TEXT,
    requirement_budget NUMERIC,
    requirement_type TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_prop RECORD;
    v_req RECORD;
    v_score NUMERIC;
    v_type_score NUMERIC;
    v_trans_score NUMERIC;
    v_zone_score NUMERIC;
    v_price_score NUMERIC;
    v_area_score NUMERIC;
    v_bed_score NUMERIC;
    v_bath_score NUMERIC;
    v_gar_score NUMERIC;
    v_strat_score NUMERIC;
    v_age_score NUMERIC;
    
    v_req_city TEXT;
    v_prop_city TEXT;
    v_req_zone TEXT;
    v_prop_zone TEXT;
    v_req_type TEXT;
    v_prop_type TEXT;
    v_req_trans TEXT;
    v_prop_trans TEXT;
    v_req_price NUMERIC;
    v_prop_price NUMERIC;
    v_req_area NUMERIC;
    v_prop_area NUMERIC;
    
    v_is_sabana_req BOOLEAN;
    v_is_urban_prop BOOLEAN;
BEGIN
    -- 1. Cargar propiedad
    SELECT * INTO v_prop FROM properties WHERE id = p_prop_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    v_prop_city  := LOWER(COALESCE(v_prop.city, v_prop.address_city, ''));
    v_prop_zone  := LOWER(COALESCE(v_prop.address_neighborhood, v_prop.zone, ''));
    v_prop_type  := LOWER(COALESCE(v_prop."propertyType"::text, ''));
    v_prop_trans := LOWER(COALESCE(v_prop."transactionType"::text, ''));
    v_prop_price := COALESCE(v_prop.price, 0);
    v_prop_area  := COALESCE(v_prop."areaTotal", v_prop."areaPrivate", 0);

    v_is_urban_prop := (v_prop_zone LIKE '%prado veraniego%' OR v_prop_zone LIKE '%cedritos%' 
                        OR v_prop_zone LIKE '%chico%' OR v_prop_zone LIKE '%chapinero%');

    -- 2. Iterar sobre requerimientos
    FOR v_req IN SELECT * FROM requirements LOOP
        v_req_city  := LOWER(COALESCE(v_req."ciudadDeseada", v_req.address_city, ''));
        v_req_zone  := LOWER(COALESCE(v_req."zonaDeseada", v_req.address_neighborhood, ''));
        v_req_type  := LOWER(COALESCE(v_req."tipoInmuebleDeseado"::text, ''));
        v_req_trans := LOWER(COALESCE(v_req."tipoNegocioDeseado"::text, ''));
        v_req_price := COALESCE(v_req."presupuestoMax", 0);
        v_req_area  := COALESCE(v_req."areaMin", 0);

        v_is_sabana_req := (v_req_zone LIKE '%san simon%' OR v_req_zone LIKE '%guaymaral%' OR v_req_zone LIKE '%fontanar%' 
                            OR v_req_zone LIKE '%fagua%' OR v_req_zone LIKE '%potosi%' OR v_req_zone LIKE '%chia%' OR v_req_zone LIKE '%sopo%');

        -- ====================================================================
        -- FILTROS DUROS INQUEBRANTABLES (0% SCORE)
        -- ====================================================================

        -- A. Discrepancia Municipal
        IF v_req_city <> '' AND v_prop_city <> '' AND v_req_city <> v_prop_city 
           AND v_req_city NOT IN ('bogota') AND v_prop_city NOT IN ('bogota') THEN
            CONTINUE;
        END IF;

        -- A2. Guard Cardinales y Zonas Genéricas ("Norte", "Sur", "Oriente", "Occidente", "Centro", "Sabana", "NA", "N/E")
        IF v_req_zone IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'sabana norte', 'na', 'n/e', 'por definir', '')
           OR v_prop_zone IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'sabana norte', 'na', 'n/e', 'por definir', '') THEN
            IF NOT (
                (v_req_zone LIKE '%cll%' OR v_req_zone LIKE '%calle%' OR v_req_zone LIKE '%cra%' OR v_req_zone LIKE '%carrera%')
                AND (v_prop_zone LIKE '%cll%' OR v_prop_zone LIKE '%calle%' OR v_prop_zone LIKE '%cra%' OR v_prop_zone LIKE '%carrera%')
            ) THEN
                CONTINUE;
            END IF;
        END IF;

        -- B. Guard Sabana Norte vs Bogotá Urbano
        IF v_is_sabana_req AND v_is_urban_prop THEN
            CONTINUE;
        END IF;

        -- C. Incompatibilidad Comercial vs Residencial
        IF (v_req_type IN ('house', 'apartment', 'apartamento_estandar') AND v_prop_type IN ('building', 'warehouse') 
            AND v_prop.name ILIKE '%edificio%') THEN
            CONTINUE;
        END IF;

        -- D. Incompatibilidad de Transacción
        IF (v_req_trans = 'arriendo' AND v_prop_trans = 'venta') 
           OR (v_req_trans = 'venta' AND v_prop_trans = 'arriendo') THEN
            CONTINUE;
        END IF;

        -- E. Área muy inferior
        IF v_req_area > 0 AND v_prop_area > 0 AND v_prop_area < (v_req_area * 0.95) THEN
            CONTINUE;
        END IF;

        -- E2. Precio supera presupuesto
        IF v_req_price > 0 AND v_prop_price > 0 AND v_prop_price > v_req_price THEN
            CONTINUE;
        END IF;

        -- ====================================================================
        -- MATRIZ DE PONDERACIÓN VECY DE 100 PUNTOS
        -- ====================================================================
        v_type_score := CASE WHEN v_req_type = v_prop_type THEN 15.0 ELSE 7.0 END;
        v_trans_score := CASE WHEN v_req_trans = v_prop_trans THEN 15.0 ELSE 10.0 END;
        
        -- Ubicación (20 pts)
        IF v_req_zone <> '' AND v_prop_zone <> '' 
           AND v_req_zone NOT IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'na', 'n/e')
           AND v_prop_zone NOT IN ('norte', 'sur', 'oriente', 'occidente', 'centro', 'sabana', 'na', 'n/e')
           AND (v_req_zone LIKE '%' || v_prop_zone || '%' OR v_prop_zone LIKE '%' || v_req_zone || '%') THEN
            v_zone_score := 20.0;
        ELSIF v_req_city <> '' AND v_prop_city <> '' AND v_req_city = v_prop_city THEN
            v_zone_score := 15.0;
        ELSE
            v_zone_score := 10.0;
        END IF;

        -- Presupuesto (15 pts)
        IF v_req_price > 0 AND v_prop_price > 0 THEN
            IF v_prop_price <= v_req_price THEN
                v_price_score := 15.0;
            ELSE
                v_price_score := 0.0;
            END IF;
        ELSE
            v_price_score := 15.0;
        END IF;

        -- Área Total (10 pts)
        IF v_req_area > 0 AND v_prop_area > 0 THEN
            IF v_prop_area >= v_req_area THEN
                v_area_score := 10.0;
            ELSE
                v_area_score := 5.0;
            END IF;
        ELSE
            v_area_score := 10.0;
        END IF;

        -- Habitaciones (10 pts)
        IF COALESCE(v_req."habitacionesMin", 0) > 0 THEN
            IF COALESCE(v_prop.bedrooms, 0) >= v_req."habitacionesMin" THEN
                v_bed_score := 10.0;
            ELSE
                v_bed_score := 0.0;
            END IF;
        ELSE
            v_bed_score := 10.0;
        END IF;

        -- Baños (4 pts)
        IF COALESCE(v_req."banosMin", 0) > 0 THEN
            IF COALESCE(v_prop.bathrooms, 0) >= v_req."banosMin" THEN
                v_bath_score := 4.0;
            ELSE
                v_bath_score := 1.0;
            END IF;
        ELSE
            v_bath_score := 4.0;
        END IF;

        -- Parqueaderos (4 pts)
        IF COALESCE(v_req."parqueaderosMin", 0) > 0 THEN
            IF COALESCE(v_prop.garages, 0) >= v_req."parqueaderosMin" THEN
                v_gar_score := 4.0;
            ELSE
                v_gar_score := 1.0;
            END IF;
        ELSE
            v_gar_score := 4.0;
        END IF;

        v_strat_score := 3.0;
        v_age_score   := 4.0;

        v_score := v_type_score + v_trans_score + v_zone_score + v_price_score + v_area_score + v_bed_score + v_bath_score + v_gar_score + v_strat_score + v_age_score;

        IF v_score >= p_min_score THEN
            requirement_id     := v_req.id;
            match_score        := ROUND(v_score, 2);
            match_reason       := 'Coincidencia Vectorial PL/pgSQL Supabase v21.21';
            requirement_name   := v_req.name;
            requirement_city   := v_req."ciudadDeseada";
            requirement_zone   := v_req."zonaDeseada";
            requirement_budget := v_req."presupuestoMax";
            requirement_type   := v_req."tipoInmuebleDeseado"::text;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$;
