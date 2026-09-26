import { janiaMatchBot } from "./whatsapp-match";

export interface AgendaWhatsAppPayload {
  solicitudId?: number | string;
  solicitud_id?: number | string;
  id?: number | string;
  solicitante_nombre?: string;
  solicitanteNombre?: string;
  solicitante_perfil?: string;
  solicitantePerfil?: string;
  solicitante_email?: string;
  solicitanteEmail?: string;
  solicitante_celular?: string;
  solicitanteCelular?: string;
  solicitante_numero_documento?: string;
  solicitanteNumeroDocumento?: string;
  solicitante_tipo_documento?: string;
  servicio_solicitado?: string;
  servicioSolicitado?: string;
  nombre_inmueble?: string;
  nombreInmueble?: string;
  codigo_inmueble?: string;
  codigoInmueble?: string;
  opcion_negocio?: string;
  opcionNegocio?: string;
  fecha_cita_texto?: string;
  fechaCitaTexto?: string;
  hora_cita?: string;
  horaCita?: string;
  cantidad_personas?: number | string;
  cantidadPersonas?: number | string;
  interesado_nombre?: string;
  interesadoNombre?: string;
  interesado_documento?: string;
  interesadoDocumento?: string;
  acompanantes?: any;
}

/** Teléfono de WhatsApp oficial de la Inmobiliaria Vecy Bienes Raíces (Atención Bróker) */
export const VECY_BROKER_OFFICIAL_PHONE = "573166569719";

/**
 * Normaliza cualquier número de teléfono colombiano a formato internacional sin signos
 * Ejemplo: "316 656 9719" -> "573166569719"
 * Ejemplo: "+573192919978" -> "573192919978"
 */
export function cleanColombianPhone(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";
  
  if (digits.length === 10 && digits.startsWith("3")) {
    return "57" + digits;
  }
  if (digits.length === 12 && digits.startsWith("57")) {
    return digits;
  }
  return digits;
}

/**
 * Convierte fechas ISO o simples a texto legible en español (ej. "miércoles, 29 de abril de 2026")
 */
export function formatDateSpanish(rawDate?: string | null): string {
  if (!rawDate) return "Fecha por coordinar";
  const str = String(rawDate).trim();
  
  // Si ya contiene nombre de meses en español o comas, preservar el texto humano
  const mesesKeywords = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  if (mesesKeywords.some(m => str.toLowerCase().includes(m))) {
    return str;
  }

  // Parsear fecha YYYY-MM-DD
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const dateObj = new Date(year, month, day, 12, 0, 0);

    const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const nombresMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    
    const diaNombre = diasSemana[dateObj.getDay()] || "día";
    const mesNombre = nombresMeses[month] || "mes";
    return `${diaNombre}, ${day} de ${mesNombre} de ${year}`;
  }

  return str;
}

/**
 * Construye el mensaje de notificación al Bróker en el formato CallMeBot histórico exacto
 */
export function buildBrokerCallMeBotMessage(data: AgendaWhatsAppPayload): string {
  const numSolicitud = data.solicitudId || data.solicitud_id || data.id || "Pendiente";
  const perfil = data.solicitante_perfil || data.solicitantePerfil || "Cliente directo";
  const nombre = data.solicitante_nombre || data.solicitanteNombre || "Solicitante";
  const doc = data.solicitante_numero_documento || data.solicitanteNumeroDocumento || "Sin registrar";
  const email = data.solicitante_email || data.solicitanteEmail || "Sin email";
  const rawCelular = data.solicitante_celular || data.solicitanteCelular || "";
  const cleanCel = cleanColombianPhone(rawCelular);
  const celularDisplay = cleanCel || rawCelular || "Sin celular";

  const servicio = data.servicio_solicitado || data.servicioSolicitado || "Visitar inmueble";
  const codigo = data.codigo_inmueble || data.codigoInmueble || "S/C";
  const negocio = data.opcion_negocio || data.opcionNegocio || "Venta";
  const fechaTexto = formatDateSpanish(data.fecha_cita_texto || data.fechaCitaTexto);
  const hora = data.hora_cita || data.horaCita || "Por coordinar";

  // Procesamiento y parseo de acompañantes
  let acompList: any[] = [];
  if (data.acompanantes) {
    if (Array.isArray(data.acompanantes)) {
      acompList = data.acompanantes;
    } else if (typeof data.acompanantes === "string") {
      try {
        const parsed = JSON.parse(data.acompanantes);
        if (Array.isArray(parsed)) acompList = parsed;
      } catch (_) {}
    }
  }

  const validAcomps = acompList.filter((a: any) => a && (a.nombre || a.documento || a.numero_documento));

  let personas = Number(data.cantidad_personas ?? data.cantidadPersonas ?? 0);
  if (!personas || isNaN(personas)) {
    personas = 1 + validAcomps.length;
  }

  const clienteNombre = data.interesado_nombre || data.interesadoNombre || nombre;
  const clienteDoc = data.interesado_documento || data.interesadoDocumento || doc;

  // Bloque de Solicitud con acompañantes desglosados únicamente si existen
  const lineasSolicitud = [
    `🏠 Solicitud`,
    servicio,
    `Cod: ${codigo}`,
    `Negocio: ${negocio}`,
    `📅 ${fechaTexto}`,
    `🕐 ${hora}`,
    `Asistirán: ${personas} personas`
  ];

  if (validAcomps.length > 0) {
    for (const acomp of validAcomps) {
      const acompNombre = acomp.nombre || "Acompañante";
      const acompDoc = acomp.documento || acomp.numero_documento || "";
      lineasSolicitud.push(`${acompNombre}\n🪪 ${acompDoc}`);
    }
  }

  const bloqueSolicitud = lineasSolicitud.join("\n");

  // Enlace directo wa.me limpio para contactar sin mensaje predeterminado
  const waContactUrl = cleanCel 
    ? `https://wa.me/${cleanCel}`
    : `(Sin número registrado)`;

  return (
`🔔 Solicitud No. ${numSolicitud} 🔔

👤 Solicitante
${perfil}
${nombre}
🪪 ${doc}
Contrato: ${numSolicitud}
✉️ ${email}
📞 ${celularDisplay}

${bloqueSolicitud}

👥 Cliente
${clienteNombre}
🪪 ${clienteDoc}

👇 Contactar Cliente 👇
${waContactUrl}`
  );
}

/**
 * Construye el mensaje de confirmación de JanIA dirigido al solicitante / cliente
 */
export function buildClientConfirmationMessage(data: AgendaWhatsAppPayload): string {
  const numSolicitud = data.solicitudId || data.solicitud_id || data.id || "";
  const nombre = data.solicitante_nombre || data.solicitanteNombre || "Cliente";
  const nombreInmueble = data.nombre_inmueble || data.nombreInmueble || "Inmueble seleccionado";
  const codigo = data.codigo_inmueble || data.codigoInmueble || "S/C";
  const negocio = data.opcion_negocio || data.opcionNegocio || "Inmobiliario";
  const fechaTexto = formatDateSpanish(data.fecha_cita_texto || data.fechaCitaTexto);
  const hora = data.hora_cita || data.horaCita || "Por coordinar";
  const email = data.solicitante_email || data.solicitanteEmail || "tu correo registrado";
  
  let personas = Number(data.cantidad_personas ?? data.cantidadPersonas ?? 0);
  if (!personas || isNaN(personas)) {
    personas = 1;
    if (data.acompanantes && Array.isArray(data.acompanantes)) {
      personas += data.acompanantes.length;
    }
  }

  const clienteNombre = data.interesado_nombre || data.interesadoNombre || "";
  const lineaCliente = clienteNombre && clienteNombre !== nombre
    ? `\n👤 *Cliente presentado:* ${clienteNombre}`
    : "";

  return (
`¡Hola, ${nombre}! 👋 Te saluda *JanIA* de *Vecy Bienes Raíces*. 🏢✨

Hemos recibido tu solicitud de agendamiento *No. ${numSolicitud}*:

🏠 *Inmueble:* ${nombreInmueble}
📌 *Código:* ${codigo}
💼 *Operación:* ${negocio}
📅 *Fecha:* ${fechaTexto}
⏰ *Hora:* ${hora}
👥 *Asistentes:* ${personas} persona(s)${lineaCliente}

🔍 *Estamos verificando tus datos.* En un momento te enviaremos la confirmación oficial y la dirección exacta del inmueble a tu correo (*${email}*) y por este medio (WhatsApp). 📩📲

Si deseas cancelar, reagendar, tienes alguna duda o requieres otro tipo de servicio comunícate directamente con nosotros al *+57 316 6569719*.

¡Gracias por confiar en *Vecy Bienes Raíces*! 🤝🏡`
  );
}

/**
 * Despacha de forma asíncrona y segura ambas notificaciones de WhatsApp:
 * 1. Al Bróker Oficial de Vecy Bienes Raíces (+57 316 6569719) en formato CallMeBot.
 * 2. Al Solicitante/Cliente con la confirmación de JanIA.
 */
export async function sendAgendaWhatsAppNotifications(payload: AgendaWhatsAppPayload): Promise<{ brokerSent: boolean; clientSent: boolean }> {
  let brokerSent = false;
  let clientSent = false;
  const numSolicitud = payload.solicitudId || payload.solicitud_id || payload.id || "N/A";

  try {
    // 1. Notificación al Bróker Oficial (+57 316 6569719)
    const brokerMsg = buildBrokerCallMeBotMessage(payload);
    console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] 📤 Enviando notificación CallMeBot al Bróker (+57 316 6569719)...`);
    
    try {
      await janiaMatchBot.sendDirectMessage(VECY_BROKER_OFFICIAL_PHONE, brokerMsg);
      brokerSent = true;
      console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] ✅ Notificación entregada al socket para Bróker (+57 316 6569719).`);
    } catch (brokerErr: any) {
      console.error(`[AGENDA-WHATSAPP-#${numSolicitud}] ⚠️ Error notificando al Bróker:`, brokerErr?.message || brokerErr);
    }

    // 2. Notificación al Solicitante / Cliente (si tiene celular registrado)
    const rawCel = payload.solicitante_celular || payload.solicitanteCelular || "";
    const cleanClientCel = cleanColombianPhone(rawCel);

    if (cleanClientCel && cleanClientCel.length >= 10) {
      const clientMsg = buildClientConfirmationMessage(payload);
      console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] 📤 Enviando mensaje de confirmación de JanIA al Solicitante (${cleanClientCel})...`);
      
      try {
        await janiaMatchBot.sendDirectMessage(cleanClientCel, clientMsg);
        clientSent = true;
        console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] ✅ Confirmación de JanIA entregada al socket para Solicitante (${cleanClientCel}).`);
      } catch (clientErr: any) {
        console.error(`[AGENDA-WHATSAPP-#${numSolicitud}] ⚠️ Error enviando confirmación al solicitante (${cleanClientCel}):`, clientErr?.message || clientErr);
      }
    } else {
      console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] ℹ️ Solicitante no proporcionó un celular válido para WhatsApp.`);
    }

  } catch (err: any) {
    console.error(`[AGENDA-WHATSAPP-#${numSolicitud}] ❌ Error general en servicio de WhatsApp para agenda:`, err?.message || err);
  }

  return { brokerSent, clientSent };
}
