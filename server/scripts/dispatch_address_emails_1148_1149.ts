import { sendAppointmentAddressEmail } from "../_core/emailContractService";
import { resolvePropertyAddress } from "../_core/agendaWhatsAppService";

/**
 * 📧 Despacho oficial de correo electrónico con la dirección confirmada y agendamiento
 * para Solicitudes #1148 (Lincy Hoyos) y #1149 (Ana María Díaz) — Caso La Carolina
 * (Doctrina Eduardo A. Rivera v34.10)
 */
async function main() {
  console.log("🚀 [DISPATCH-EMAILS-1148-1149] Iniciando despacho oficial de correos para Lincy Hoyos (#1148) y Ana María Díaz (#1149)...");

  const address = resolvePropertyAddress("ID-lacar-01bog", "Apartamento en la carolina");
  console.log("📍 Dirección física oficial resuelta:", address);

  // 1. Solicitud 1148 - Lincy Mayerly Hoyos Sierra
  const payload1148: any = {
    solicitudId: 1148,
    solicitud_id: 1148,
    id: 252,
    solicitante_nombre: "Lincy Mayerly Hoyos Sierra",
    solicitante_perfil: "Bróker / Colega",
    solicitante_email: "lincyhoyosrealestate@gmail.com",
    solicitante_celular: "573138862997",
    codigo_inmueble: "ID-LACAR-01BOG",
    nombre_inmueble: "Apartamento en La Carolina",
    opcion_negocio: "Venta",
    fecha_cita_texto: "miércoles, 11 de noviembre de 2026",
    hora_cita: "04:00 PM",
    estado: "confirmada",
    cantidad_personas: 2,
    interesado_nombre: "Simon Ramirez Pineda",
    interesado_documento: "1020823910",
  };

  console.log("✉️ Despachando correo oficial a Lincy Hoyos (lincyhoyosrealestate@gmail.com)...");
  const res1148 = await sendAppointmentAddressEmail(payload1148, address);
  console.log("✅ Resultado Solicitud #1148 (Lincy):", res1148);

  // 2. Solicitud 1149 - Ana Maria Diaz Cardenas
  const payload1149: any = {
    solicitudId: 1149,
    solicitud_id: 1149,
    id: 253,
    solicitante_nombre: "Ana Maria Diaz Cardenas",
    solicitante_perfil: "Agente Inmobiliario",
    solicitante_email: "anamdiazc04@gmail.com",
    solicitante_celular: "573114699588",
    codigo_inmueble: "ID-LACAR-01BOG",
    nombre_inmueble: "Apartamento en La Carolina",
    opcion_negocio: "Venta",
    fecha_cita_texto: "miércoles, 11 de noviembre de 2026",
    hora_cita: "04:00 PM",
    estado: "confirmada",
    cantidad_personas: 2,
    interesado_nombre: "Simon Ramirez Pineda",
    interesado_documento: "1020823910",
  };

  console.log("✉️ Despachando correo oficial a Ana María Díaz (anamdiazc04@gmail.com)...");
  const res1149 = await sendAppointmentAddressEmail(payload1149, address);
  console.log("✅ Resultado Solicitud #1149 (Ana María):", res1149);
}

main().catch(console.error);

