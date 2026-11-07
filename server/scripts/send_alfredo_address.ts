import { sendAppointmentAddressNotification } from "../_core/agendaWhatsAppService";

/**
 * 📅 Despacho oficial programado para el DOMINGO 8 DE NOVIEMBRE DE 2026 A LAS 11:00 AM
 * (Exactamente 24 horas antes de la cita del lunes 9 de noviembre a las 11:00 AM — Doctrina Eduardo A. Rivera).
 */
async function main() {
  console.log("🚀 [ALFREDO-ANAYA] Iniciando despacho oficial de confirmación y dirección física (Programado: Domingo 8 Nov 11:00 AM)...");

  const payload = {
    solicitudId: 1147,
    solicitud_id: 1147,
    id: 251,
    solicitante_nombre: "Alfredo Anaya Peñaranda",
    solicitante_perfil: "Agente Inmobiliario",
    solicitante_email: "inmovalores81@gmail.com",
    solicitante_celular: "573108149457", // Número real y corregido de WhatsApp
    codigo_inmueble: "ID-LACAR-01BOG",
    nombre_inmueble: "Apartamento en La Carolina",
    opcion_negocio: "Venta",
    fecha_cita_texto: "lunes, 9 de noviembre de 2026",
    hora_cita: "11:00 AM",
    cantidad_personas: 1,
    interesado_nombre: "Adriana Alvarez Barriga",
    interesado_documento: "21069381",
  };

  const address = "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá";

  const result = await sendAppointmentAddressNotification(payload, address);
  console.log("✅ Resultado de despacho:", result);
}

main().catch(console.error);

