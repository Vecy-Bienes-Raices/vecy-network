import { janiaMatchBot } from "./whatsapp-match";
import { formatShortGreetingName } from "./nameAndGenderResolver";

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
  alerta_antecedentes?: boolean;
  alertaAntecedentes?: boolean;
  hasAlertaAntecedentes?: boolean;
  alerta_motivo?: string;
  alertaMotivo?: string;
  customAgentWhatsapp?: string;
  customAgencyName?: string;
  estado?: string;
  fecha_cita_anterior?: string;
  fechaCitaAnterior?: string;
  hora_cita_anterior?: string;
  horaCitaAnterior?: string;
  motivo_reagendamiento?: string;
  motivoReagendamiento?: string;
  nota_aclaratoria?: string;
  notaAclaratoria?: string;
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
 * Construye el mensaje oficial de notificación al Bróker de Vecy Bienes Raíces (+57 316 6569719)
 * Despachado 100% nativo por el socket de JanIA (Baileys), conservando la estructura visual histórica solicitada por Eduardo.
 */
export function buildBrokerNotificationMessage(data: AgendaWhatsAppPayload): string {
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

  const hasAlerta = Boolean(data.alerta_antecedentes || data.alertaAntecedentes || data.hasAlertaAntecedentes);
  const motivoTexto = data.alerta_motivo || data.alertaMotivo || "Registro de antecedentes / requerimientos oficiales";
  const headerAlerta = hasAlerta
    ? `🚨🚨 ALERTA CRÍTICA DE SEGURIDAD NOTARIAL 🚨🚨\n⚠️ ATENCIÓN BRÓKER: Se recibió una solicitud con REGISTROS DE ANTECEDENTES O SANCIONES ante las autoridades del Estado.\n🛑 Titular: ${nombre} | 🪪 Doc: ${doc}\nMotivo: ${motivoTexto}\n📌 Estado: RESERVA DECLINADA FORMALMENTE AL USUARIO POR SEGURIDAD.\n--------------------------------------------------\n\n`
    : "";

  return (
`${headerAlerta}🔔 Solicitud No. ${numSolicitud} 🔔

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
 * Alias de retrocompatibilidad doctrinal con pruebas y módulos previos
 */
export const buildBrokerCallMeBotMessage = buildBrokerNotificationMessage;

/**
 * Construye el mensaje de confirmación de JanIA dirigido al solicitante / cliente
 */
export function buildClientConfirmationMessage(data: AgendaWhatsAppPayload): string {
  const numSolicitud = data.solicitudId || data.solicitud_id || data.id || "";
  const rawNombre = data.solicitante_nombre || data.solicitanteNombre || "Cliente";
  const nombre = formatShortGreetingName(rawNombre, "Cliente");
  const nombreInmueble = data.nombre_inmueble || data.nombreInmueble || "Inmueble seleccionado";
  const codigo = data.codigo_inmueble || data.codigoInmueble || "S/C";
  const negocio = data.opcion_negocio || data.opcionNegocio || "Inmobiliario";
  const fechaTexto = formatDateSpanish(data.fecha_cita_texto || data.fechaCitaTexto);
  const hora = data.hora_cita || data.horaCita || "Por coordinar";
  const email = data.solicitante_email || data.solicitanteEmail || "tu correo registrado";
  const servicio = data.servicio_solicitado || data.servicioSolicitado || "Servicio Inmobiliario";
  
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

  const hasAlerta = Boolean(data.alerta_antecedentes || data.alertaAntecedentes || data.hasAlertaAntecedentes);

  if (hasAlerta) {
    const motivo = data.alerta_motivo || data.alertaMotivo || "Registros preventivos en bases de seguridad del Estado";
    return (
`¡Hola, ${nombre}! 👋 Te saluda *JanIA* de *Vecy Bienes Raíces*. 🏢

Hemos recibido tu solicitud de agendamiento *No. ${numSolicitud}* para el inmueble *${nombreInmueble}* (Cod: ${codigo}).

⚠️ *INFORME DE CONTROL Y SEGURIDAD NOTARIAL:*
Durante el cotejo preventivo y obligatorio ante las centrales oficiales de certificación y seguridad del Estado, se identificaron novedades o requerimientos asociados al documento de identidad registrado (${motivo}).

🛑 *Por estrictas políticas de seguridad preventiva y protección jurídica de nuestros propietarios y agentes, te informamos que TU RESERVA HA SIDO DECLINADA.*

Si consideras que existe una inconsistencia o deseas presentar documentación aclaratoria ante nuestra dirección jurídica y comercial, comunícate con nosotros al *+57 316 6569719*.

Vecy Bienes Raíces — Seguridad y Transparencia Inmobiliaria. 🤝`
    );
  }

  const modalidad = (data as any).modalidad || "visita_presencial";
  const esVirtual = modalidad === "llamada" || modalidad === "videollamada";
  const modalidadLabel = modalidad === "videollamada"
    ? "💻 Videollamada Virtual (Google Meet / WhatsApp Video)"
    : modalidad === "llamada"
    ? "📞 Llamada Telefónica Personalizada"
    : "📍 Visita Presencial en el Inmueble";

  return (
`¡Hola, ${nombre}! 👋 Te saluda *JanIA* de *Vecy Bienes Raíces*. 🏢✨

✅ *¡TU RESERVA HA SIDO CONFIRMADA EXITOSAMENTE!*
Hemos recibido tu solicitud de agendamiento *No. ${numSolicitud}* | ${servicio}

🏠 *Inmueble:* ${nombreInmueble}
📌 *Código:* ${codigo}
🤝 *Modalidad:* ${modalidadLabel}
💼 *Operación:* ${negocio}
📅 *Fecha:* ${fechaTexto}
⏰ *Hora:* ${hora}
${!esVirtual ? `👥 *Asistentes:* ${personas} persona(s)${lineaCliente}` : `📱 *Atención:* Recibirás la sesión en tu celular ${data.solicitante_celular || data.solicitanteCelular || ""}`}

${!esVirtual ? `🔍 *Estamos verificando tus datos.* 🔒 *POLÍTICA DE SEGURIDAD NOTARIAL Y ENTREGA DE DIRECCIÓN:*
En un momento te enviaremos la confirmación oficial y la dirección exacta del inmueble a tu correo (*${email}*) y por este medio (WhatsApp). Por estrictos protocolos de seguridad de los propietarios y la administración, la dirección exacta te será despachada exactamente *24 horas antes de la visita* (o de inmediato si tu cita es para hoy mismo). ¡Debes estar muy pendiente! 📩👀` : `💻 *ENLACE / CONTACTO:*
Puntualmente a la hora acordada, nuestro anfitrión bróker se comunicará contigo al número registrado o te enviará el enlace de conexión.`}

📅 *GESTIÓN DE TU CITA (MODERNA Y FLEXIBLE):*
• *Confirmar Asistencia:* Responde a este chat *"Confirmo asistencia #${numSolicitud}"*.
• *Reagendar o Cancelar:* Si deseas cancelar, reagendar, tienes alguna duda o requieres otro tipo de servicio comunícate directamente con nosotros al *+57 316 6569719*. (https://wa.me/573166569719)

¡Gracias por confiar en *Vecy Bienes Raíces*! 🤝🏡✨`
  );
}

/**
 * Despacha de forma asíncrona y segura ambas notificaciones de WhatsApp vía socket nativo JanIA (Baileys):
 * 1. Al Bróker Oficial de Vecy Bienes Raíces (+57 316 6569719) con el reporte de la cita.
 * 2. Al Solicitante/Cliente con la confirmación personalizada de JanIA.
 */
export async function sendAgendaWhatsAppNotifications(payload: AgendaWhatsAppPayload): Promise<{ brokerSent: boolean; clientSent: boolean }> {
  let brokerSent = false;
  let clientSent = false;
  const numSolicitud = payload.solicitudId || payload.solicitud_id || payload.id || "N/A";

  try {
    // 1. Notificación oficial al Bróker (+57 316 6569719) vía socket JanIA (Baileys)
    const brokerMsg = buildBrokerNotificationMessage(payload);
    console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] 📤 Enviando notificación de JanIA al Bróker (+57 316 6569719)...`);
    
    try {
      await janiaMatchBot.sendDirectMessage(VECY_BROKER_OFFICIAL_PHONE, brokerMsg, {
        allowDirectMessage: true,
        isTransactionalNotification: true,
        skipDelay: true
      });
      brokerSent = true;
      console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] ✅ Notificación entregada al socket para Bróker (+57 316 6569719).`);
    } catch (brokerErr: any) {
      console.error(`[AGENDA-WHATSAPP-#${numSolicitud}] ⚠️ Error notificando al Bróker:`, brokerErr?.message || brokerErr);
    }

    // 1b. Si la solicitud viene de Vecy Agenda Pro de un Agente/Suscriptor con WhatsApp propio configurado, enviarle copia inmediata
    if (payload.customAgentWhatsapp) {
      const cleanCustomAgentPhone = cleanColombianPhone(payload.customAgentWhatsapp);
      if (cleanCustomAgentPhone && cleanCustomAgentPhone.length >= 10 && cleanCustomAgentPhone !== VECY_BROKER_OFFICIAL_PHONE) {
        try {
          const customHeader = payload.customAgencyName
            ? `🏢 *VECY AGENDA PRO — ${payload.customAgencyName.toUpperCase()}*\n`
            : `🏢 *VECY AGENDA PRO — NOTIFICACIÓN A SUSCRIPTOR*\n`;
          const customAgentMsg = `${customHeader}${brokerMsg}`;
          janiaMatchBot.registerAgendaNotification?.(cleanCustomAgentPhone, customAgentMsg, numSolicitud);
          await janiaMatchBot.sendDirectMessage(cleanCustomAgentPhone, customAgentMsg, {
            allowDirectMessage: true,
            isTransactionalNotification: true,
            skipDelay: true
          });
          janiaMatchBot.registerAgendaNotification?.(cleanCustomAgentPhone, customAgentMsg, numSolicitud);
          console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] ✅ Copia Vecy Agenda Pro entregada al Suscriptor (${cleanCustomAgentPhone}).`);
        } catch (agentWaErr: any) {
          console.warn(`[AGENDA-WHATSAPP-#${numSolicitud}] ⚠️ Error notificando al WhatsApp del suscriptor:`, agentWaErr?.message);
        }
      }
    }

    // 2. Notificación al Solicitante / Cliente (si tiene celular registrado)
    const rawCel = payload.solicitante_celular || payload.solicitanteCelular || "";
    const cleanClientCel = cleanColombianPhone(rawCel);

    if (cleanClientCel && cleanClientCel.length >= 10) {
      const clientMsg = buildClientConfirmationMessage(payload);
      console.log(`[AGENDA-WHATSAPP-#${numSolicitud}] 📤 Enviando mensaje de confirmación de JanIA al Solicitante (${cleanClientCel})...`);
      
      try {
        janiaMatchBot.registerAgendaNotification?.(cleanClientCel, clientMsg, numSolicitud);
        await janiaMatchBot.sendDirectMessage(cleanClientCel, clientMsg, {
          allowDirectMessage: true,
          isTransactionalNotification: true,
          skipDelay: true
        });
        janiaMatchBot.registerAgendaNotification?.(cleanClientCel, clientMsg, numSolicitud);
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

/**
 * Mapeo de direcciones físicas confirmadas de inmuebles captados oficialmente por Vecy Bienes Raíces
 */
export const KNOWN_PROPERTY_ADDRESSES: Record<string, string> = {
  "ID-LACAR-01BOG": "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá",
  "ID-LACAR01": "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá",
  "LACAR-01": "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá",
};

/**
 * Normaliza y resuelve la dirección física confirmada de un inmueble
 * admitiendo cualquier variación de mayúsculas/minúsculas, guiones, espacios o nombres de inmueble
 * (Doctrina Eduardo A. Rivera v34.10)
 */
export function resolvePropertyAddress(codigo?: string, nombreInmueble?: string, customAddress?: string): string {
  if (customAddress && customAddress.trim().length > 10 && !customAddress.toLowerCase().startsWith("dirección confirmada en")) {
    return customAddress.trim();
  }

  const cleanCode = (codigo || "").trim().toUpperCase().replace(/[\s\-_.]/g, "");
  const cleanNombre = (nombreInmueble || "").trim().toLowerCase();

  // Caso La Carolina / Edificio Inmoval VI (ID-LACAR-01BOG en cualquier variación)
  if (
    cleanCode.includes("LACAR") ||
    cleanCode.includes("INMOVAL") ||
    (cleanNombre.includes("carolina") && (cleanNombre.includes("apartamento") || cleanNombre.includes("apto") || cleanNombre.includes("inmoval")))
  ) {
    return "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá";
  }

  // Búsqueda en mapa conocido normalizado
  for (const [key, addr] of Object.entries(KNOWN_PROPERTY_ADDRESSES)) {
    const normKey = key.toUpperCase().replace(/[\s\-_.]/g, "");
    if (cleanCode && normKey && (cleanCode === normKey || cleanCode.includes(normKey) || normKey.includes(cleanCode))) {
      return addr;
    }
  }

  return (customAddress && customAddress.trim()) || "Dirección confirmada en Bogotá";
}

/**
 * Construye el mensaje de WhatsApp oficial con la dirección exacta del inmueble para la cita
 */
export function buildClientAppointmentAddressMessage(data: AgendaWhatsAppPayload, address: string): string {
  const numSolicitud = data.solicitudId || data.solicitud_id || data.id || "";
  const rawNombre = data.solicitante_nombre || data.solicitanteNombre || "Colega";
  const nombre = formatShortGreetingName(rawNombre, "Colega");
  const nombreInmueble = data.nombre_inmueble || data.nombreInmueble || "Apartamento en La Carolina";
  const codigo = data.codigo_inmueble || data.codigoInmueble || "S/C";
  const fechaTexto = formatDateSpanish(data.fecha_cita_texto || data.fechaCitaTexto);
  const hora = data.hora_cita || data.horaCita || "Por coordinar";
  
  const isReagendada = data.estado === "reagendada" || Boolean(data.fecha_cita_anterior || (data as any).fechaCitaAnterior);
  const fechaAnt = data.fecha_cita_anterior || (data as any).fechaCitaAnterior;
  const horaAnt = data.hora_cita_anterior || (data as any).horaCitaAnterior;
  const acompanante = data.interesado_nombre || (data as any).interesadoNombre;
  const docAcompanante = data.interesado_documento || (data as any).interesadoDocumento;
  const nota = data.nota_aclaratoria || (data as any).notaAclaratoria;

  const header = isReagendada
    ? `🔄 *CONFIRMACIÓN DE CITA REAGENDADA Y DIRECCIÓN OFICIAL*`
    : `📍 *CONFIRMACIÓN FINAL Y DIRECCIÓN OFICIAL DEL INMUEBLE*`;

  const anteriorText = isReagendada && fechaAnt
    ? `\n⏪ *Fecha anterior postergada:* ${formatDateSpanish(fechaAnt)}${horaAnt ? ` a las ${horaAnt}` : ""} (por disponibilidad de propietarios)`
    : "";

  const acompananteText = acompanante
    ? `\n👤 *Acompañante / Cliente interesado(a):* ${acompanante}${docAcompanante ? ` (Doc: ${docAcompanante})` : ""}`
    : "";

  const notaText = nota
    ? `\nℹ️ *Aclaración:* ${nota}\n`
    : "";

  return (
`¡Hola, ${nombre}! 👋 Te saluda *JanIA* de *Vecy Bienes Raíces*. 🏢✨
${notaText}
${header}
Solicitud *No. ${numSolicitud}* | Inmueble: *${nombreInmueble}* (Cod: ${codigo})

📅 *Fecha de la cita:* ${fechaTexto}
⏰ *Hora:* ${hora}${anteriorText}${acompananteText}

📌 *DIRECCIÓN EXACTA COMPLETA:*
📍 *${address}*

🛡️ *RECOMENDACIONES DE INGRESO Y SEGURIDAD NOTARIAL:*
1. Al llegar al edificio, acércate a la recepción / portería y preséntate con tu cédula de ciudadanía original (C.C.).
2. Nuestro anfitrión bróker estará esperándote en la fecha y hora indicadas para realizar el recorrido guiado.
3. Te recomendamos llegar con 5 a 10 minutos de anticipación para el registro en portería.

Si requieres asistencia de llegada o tienes alguna pregunta antes del recorrido, comunícate directamente con nuestra línea oficial de bróker: *+57 316 6569719* (https://wa.me/573166569719).

¡Muchos éxitos y te esperamos puntualmente para este recorrido! 🤝🏡✨`
  );
}

/**
 * Despacha el recordatorio con la dirección completa al WhatsApp del solicitante y envía copia espejo al Bróker (+57 316 6569719)
 */
export async function sendAppointmentAddressNotification(
  payload: AgendaWhatsAppPayload,
  customAddress?: string
): Promise<{ clientSent: boolean; brokerCopySent: boolean; emailSent: boolean; address: string }> {
  let clientSent = false;
  let brokerCopySent = false;
  let emailSent = false;
  const numSolicitud = payload.solicitudId || payload.solicitud_id || payload.id || "N/A";
  const codigo = payload.codigo_inmueble || payload.codigoInmueble || "";
  const nombreInmueble = payload.nombre_inmueble || payload.nombreInmueble || "";

  const address = resolvePropertyAddress(codigo, nombreInmueble, customAddress);
  const addressMsg = buildClientAppointmentAddressMessage(payload, address);

  const rawCel = payload.solicitante_celular || payload.solicitanteCelular || "";
  const cleanClientCel = cleanColombianPhone(rawCel);

  console.log(`[AGENDA-DIRECCION-#${numSolicitud}] 📍 Despachando dirección para cita a ${cleanClientCel || "N/A"}...`);

  // 1. Envío al solicitante / cliente por WhatsApp
  if (cleanClientCel && cleanClientCel.length >= 10) {
    try {
      janiaMatchBot.registerAgendaNotification?.(cleanClientCel, addressMsg, numSolicitud);
      await janiaMatchBot.sendDirectMessage(cleanClientCel, addressMsg, {
        allowDirectMessage: true,
        isTransactionalNotification: true,
        skipDelay: true,
        forcePn: true
      });
      clientSent = true;
      console.log(`[AGENDA-DIRECCION-#${numSolicitud}] ✅ Dirección entregada por WhatsApp a solicitante (${cleanClientCel}).`);
    } catch (err: any) {
      console.error(`[AGENDA-DIRECCION-#${numSolicitud}] ⚠️ Error enviando dirección a solicitante:`, err?.message);
    }
  }

  // 2. Copia espejo al WhatsApp del Bróker Oficial (+57 316 6569719) para que Eduardo la vea siempre en su chat
  try {
    const brokerCopyHeader = `📋 *COPIA ESPEJO DESPACHO DE DIRECCIÓN (Solicitud #${numSolicitud})*\nEnviada a: ${payload.solicitante_nombre || "Cliente"} (${cleanClientCel})\n\n`;
    await janiaMatchBot.sendDirectMessage(VECY_BROKER_OFFICIAL_PHONE, `${brokerCopyHeader}${addressMsg}`, {
      allowDirectMessage: true,
      isTransactionalNotification: true,
      skipDelay: true
    });
    brokerCopySent = true;
    console.log(`[AGENDA-DIRECCION-#${numSolicitud}] ✅ Copia espejo de dirección entregada al WhatsApp del Bróker.`);
  } catch (brokerErr: any) {
    console.warn(`[AGENDA-DIRECCION-#${numSolicitud}] ⚠️ Error enviando copia de dirección al Bróker:`, brokerErr?.message);
  }

  // 3. Envío al correo electrónico oficial del solicitante (Doctrina Eduardo A. Rivera v34.04)
  try {
    const { sendAppointmentAddressEmail } = await import("./emailContractService");
    const emailRes = await sendAppointmentAddressEmail(payload as any, address);
    emailSent = emailRes.success;
  } catch (emailErr: any) {
    console.warn(`[AGENDA-DIRECCION-#${numSolicitud}] ⚠️ Error despachando correo de dirección:`, emailErr?.message);
  }

  return { clientSent, brokerCopySent, emailSent, address };
}
