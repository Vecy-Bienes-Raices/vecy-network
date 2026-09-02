import dotenv from 'dotenv';
dotenv.config();
import postgres from 'postgres';
import { extractFallbackDataFromText, splitMultiItemMessage } from '../server/_core/janIA';

const client = postgres(process.env.DATABASE_URL!, { prepare: false });

async function splitAndSanitizeMultiItems() {
  console.log('🚀 [SPLIT & SANITIZE] Iniciando segmentación y saneamiento multi-publicación en Supabase...');

  // 1. REQUERIMIENTOS
  const allReqs = await client`SELECT * FROM "requirements" ORDER BY id ASC`;
  console.log(`📋 Analizando ${allReqs.length} requerimientos...`);

  let reqsSplitCount = 0;
  let newReqsInserted = 0;

  for (const req of allReqs) {
    const rawText = req.rawText || '';
    const blocks = splitMultiItemMessage(rawText);

    if (blocks.length >= 2) {
      reqsSplitCount++;
      console.log(`✂️ [REQ #${req.id}] Dividiendo en ${blocks.length} requerimientos independientes...`);

      // Bloque 1: Actualizar el registro original #req.id
      const b1 = blocks[0];
      const data1 = extractFallbackDataFromText(b1);
      const name1 = b1.match(/(?:Cliente|Para|Nombre|Solicita)\s*:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s.]+)/i)?.[1]?.trim() 
        || (data1.zone ? `Requerimiento de ${data1.propertyType || 'inmueble'} en ${data1.zone}` : (req.name || 'Requerimiento Inmobiliario'));

      await client`
        UPDATE "requirements"
        SET 
          name = ${name1 ?? null},
          "presupuestoMax" = ${data1.presupuestoMax > 0 ? data1.presupuestoMax : (data1.price > 0 ? data1.price : null)},
          "presupuestoMin" = ${data1.presupuestoMin > 0 ? data1.presupuestoMin : null},
          "areaMin" = ${data1.areaMin > 0 ? data1.areaMin : (data1.area > 0 ? data1.area : null)},
          "habitacionesMin" = ${data1.bedroomsMin > 0 ? data1.bedroomsMin : (data1.bedrooms > 0 ? data1.bedrooms : null)},
          "banosMin" = ${data1.bathrooms > 0 ? data1.bathrooms : null},
          "parqueaderosMin" = ${data1.garages > 0 ? data1.garages : null},
          "zonaDeseada" = ${data1.zone || null},
          "address_neighborhood" = ${data1.zone || null},
          "ciudadDeseada" = ${data1.city || req.ciudadDeseada || 'Bogotá'},
          "tipoNegocioDeseado" = ${data1.transactionType || req.tipoNegocioDeseado || 'venta'},
          "tipoInmuebleDeseado" = ${data1.propertyType || req.tipoInmuebleDeseado || 'apartment'},
          "rawText" = ${b1}
        WHERE id = ${req.id}
      `;

      // Bloques 2..N: Insertar como nuevos requerimientos independientes
      for (let i = 1; i < blocks.length; i++) {
        const bi = blocks[i];
        const dataI = extractFallbackDataFromText(bi);
        const nameI = bi.match(/(?:Cliente|Para|Nombre|Solicita)\s*:\s*([A-Za-zÁÉÍÓÚÑáéíóúñ\s.]+)/i)?.[1]?.trim() 
          || (dataI.zone ? `Requerimiento de ${dataI.propertyType || 'inmueble'} en ${dataI.zone}` : `Requerimiento derivado de WhatsApp`);

        await client`
          INSERT INTO "requirements" (
            name, "presupuestoMax", "presupuestoMin", "areaMin", "habitacionesMin",
            "banosMin", "parqueaderosMin", "zonaDeseada", "address_neighborhood",
            "ciudadDeseada", "tipoNegocioDeseado", "tipoInmuebleDeseado",
            "idUsuarioWhatsapp", "nombre_usuario_whatsapp", "origen_nombre", "origen_tipo",
            "rawText", "enlace_origen"
          ) VALUES (
            ${nameI ?? null},
            ${dataI.presupuestoMax > 0 ? dataI.presupuestoMax : (dataI.price > 0 ? dataI.price : null)},
            ${dataI.presupuestoMin > 0 ? dataI.presupuestoMin : null},
            ${dataI.areaMin > 0 ? dataI.areaMin : (dataI.area > 0 ? dataI.area : null)},
            ${dataI.bedroomsMin > 0 ? dataI.bedroomsMin : (dataI.bedrooms > 0 ? dataI.bedrooms : null)},
            ${dataI.bathrooms > 0 ? dataI.bathrooms : null},
            ${dataI.garages > 0 ? dataI.garages : null},
            ${dataI.zone || null},
            ${dataI.zone || null},
            ${dataI.city || req.ciudadDeseada || 'Bogotá'},
            ${dataI.transactionType || req.tipoNegocioDeseado || 'venta'},
            ${dataI.propertyType || req.tipoInmuebleDeseado || 'apartment'},
            ${req.idUsuarioWhatsapp ?? null},
            ${req.nombre_usuario_whatsapp ?? null},
            ${req.origen_nombre ?? null},
            ${req.origen_tipo ?? null},
            ${bi},
            ${req.enlace_origen ?? null}
          )
        `;
        newReqsInserted++;
      }
    } else {
      // Requerimiento simple: Saneamiento de datos con nuevo extractor
      const data = extractFallbackDataFromText(rawText);
      await client`
        UPDATE "requirements"
        SET 
          "presupuestoMax" = COALESCE(${data.presupuestoMax > 0 ? data.presupuestoMax : (data.price > 0 ? data.price : null)}, "presupuestoMax"),
          "areaMin" = COALESCE(${data.areaMin > 0 ? data.areaMin : (data.area > 0 ? data.area : null)}, "areaMin"),
          "habitacionesMin" = COALESCE(${data.bedroomsMin > 0 ? data.bedroomsMin : (data.bedrooms > 0 ? data.bedrooms : null)}, "habitacionesMin"),
          "banosMin" = COALESCE(${data.bathrooms > 0 ? data.bathrooms : null}, "banosMin"),
          "parqueaderosMin" = COALESCE(${data.garages > 0 ? data.garages : null}, "parqueaderosMin"),
          "zonaDeseada" = COALESCE(${data.zone || null}, "zonaDeseada"),
          "address_neighborhood" = COALESCE(${data.zone || null}, "address_neighborhood")
        WHERE id = ${req.id}
      `;
    }
  }

  // 2. PROPIEDADES / OFERTAS
  const allProps = await client`SELECT * FROM "properties" ORDER BY id ASC`;
  console.log(`\n🏢 Analizando ${allProps.length} propiedades...`);

  let propsSplitCount = 0;
  let newPropsInserted = 0;

  for (const prop of allProps) {
    const rawText = prop.rawText || '';
    const blocks = splitMultiItemMessage(rawText);

    if (blocks.length >= 2) {
      propsSplitCount++;
      console.log(`✂️ [PROP #${prop.id}] Dividiendo en ${blocks.length} inmuebles independientes...`);

      // Bloque 1: Actualizar el inmueble original #prop.id
      const b1 = blocks[0];
      const data1 = extractFallbackDataFromText(b1);
      const name1 = data1.zone ? `${data1.propertyType || 'Inmueble'} en ${data1.zone}` : (prop.name || 'Inmueble en Venta/Arriendo');
      const finalPrice1 = data1.price > 0 ? data1.price : (data1.rentPrice > 0 ? data1.rentPrice : (prop.price || 0));

      await client`
        UPDATE "properties"
        SET 
          name = ${name1 ?? null},
          price = ${finalPrice1},
          "rent_price" = ${data1.rentPrice > 0 ? data1.rentPrice : null},
          "adminFee" = ${data1.adminFee > 0 ? data1.adminFee : null},
          "areaTotal" = ${data1.area > 0 ? data1.area : (prop.areaTotal ?? null)},
          bedrooms = ${data1.bedrooms > 0 ? data1.bedrooms : (prop.bedrooms ?? null)},
          bathrooms = ${data1.bathrooms > 0 ? data1.bathrooms : (prop.bathrooms ?? null)},
          garages = ${data1.garages > 0 ? data1.garages : (prop.garages ?? null)},
          zone = ${data1.zone || prop.zone || 'Bogotá'},
          "address_neighborhood" = ${data1.zone || prop.address_neighborhood || null},
          city = ${data1.city || prop.city || 'Bogotá'},
          "transactionType" = ${data1.transactionType || prop.transactionType || 'venta'},
          "propertyType" = ${data1.propertyType || prop.propertyType || 'apartment'},
          "rawText" = ${b1}
        WHERE id = ${prop.id}
      `;

      // Bloques 2..N: Insertar como nuevas propiedades independientes
      for (let i = 1; i < blocks.length; i++) {
        const bi = blocks[i];
        const dataI = extractFallbackDataFromText(bi);
        const nameI = dataI.zone ? `${dataI.propertyType || 'Inmueble'} en ${dataI.zone}` : `Inmueble derivado de WhatsApp`;
        const finalPriceI = dataI.price > 0 ? dataI.price : (dataI.rentPrice > 0 ? dataI.rentPrice : 0);

        await client`
          INSERT INTO "properties" (
            name, price, "rent_price", "adminFee", "areaTotal", bedrooms,
            bathrooms, garages, zone, "address_neighborhood", city,
            "transactionType", "propertyType", "idUsuarioWhatsapp",
            "nombre_usuario_whatsapp", "origen_nombre", "origen_tipo",
            "rawText", "enlace_origen"
          ) VALUES (
            ${nameI ?? null},
            ${finalPriceI},
            ${dataI.rentPrice > 0 ? dataI.rentPrice : null},
            ${dataI.adminFee > 0 ? dataI.adminFee : null},
            ${dataI.area > 0 ? dataI.area : null},
            ${dataI.bedrooms > 0 ? dataI.bedrooms : null},
            ${dataI.bathrooms > 0 ? dataI.bathrooms : null},
            ${dataI.garages > 0 ? dataI.garages : null},
            ${dataI.zone || 'Bogotá'},
            ${dataI.zone || null},
            ${dataI.city || prop.city || 'Bogotá'},
            ${dataI.transactionType || prop.transactionType || 'venta'},
            ${dataI.propertyType || prop.propertyType || 'apartment'},
            ${prop.idUsuarioWhatsapp ?? null},
            ${prop.nombre_usuario_whatsapp ?? null},
            ${prop.origen_nombre ?? null},
            ${prop.origen_tipo ?? null},
            ${bi},
            ${prop.enlace_origen ?? null}
          )
        `;
        newPropsInserted++;
      }
    } else {
      // Inmueble simple: Saneamiento de datos con nuevo extractor
      const data = extractFallbackDataFromText(rawText);
      await client`
        UPDATE "properties"
        SET 
          price = COALESCE(${data.price > 0 ? data.price : null}, price),
          "rent_price" = COALESCE(${data.rentPrice > 0 ? data.rentPrice : null}, "rent_price"),
          "adminFee" = COALESCE(${data.adminFee > 0 ? data.adminFee : null}, "adminFee"),
          "areaTotal" = COALESCE(${data.area > 0 ? data.area : null}, "areaTotal"),
          bedrooms = COALESCE(${data.bedrooms > 0 ? data.bedrooms : null}, bedrooms),
          bathrooms = COALESCE(${data.bathrooms > 0 ? data.bathrooms : null}, bathrooms),
          garages = COALESCE(${data.garages > 0 ? data.garages : null}, garages),
          zone = COALESCE(${data.zone || null}, zone),
          "address_neighborhood" = COALESCE(${data.zone || null}, "address_neighborhood")
        WHERE id = ${prop.id}
      `;
    }
  }

  console.log(`\n🎉 [SANEAMIENTO COMPLETADO]:`);
  console.log(`- Requerimientos divididos: ${reqsSplitCount} (Nuevas demandas creadas: +${newReqsInserted})`);
  console.log(`- Propiedades divididas: ${propsSplitCount} (Nuevas ofertas creadas: +${newPropsInserted})`);
  process.exit(0);
}

splitAndSanitizeMultiItems();
