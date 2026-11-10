import { sendAppointmentAddressNotification } from "../_core/agendaWhatsAppService";

/**
 * 📅 Despacho oficial de CITA REAGENDADA Y DIRECCIÓN FÍSICA para ALFREDO ANAYA
 * Cita reprogramada para el MIÉRCOLES 11 DE NOVIEMBRE DE 2026 A LAS 3:00 PM (15:00)
 * (Doctrina Eduardo A. Rivera v34.08).
 */
async function main() {
  console.log("🚀 [ALFREDO-ANAYA] Iniciando despacho oficial de confirmación de CITA REAGENDADA y dirección física (Miércoles 11 Nov 3:00 PM)...");

  const payload = {
    solicitudId: 1147,
    solicitud_id: 1147,
    id: 251,
    solicitante_nombre: "Alfredo Anaya Peñaranda",
    solicitante_perfil: "Agente Inmobiliario",
    solicitante_email: "invervalores@hotmail.com",
    solicitante_email_alt: "inmovalores81@gmail.com",
    solicitante_celular: "573108149457", // Número real y corregido de WhatsApp
    codigo_inmueble: "ID-LACAR-01BOG",
    nombre_inmueble: "Apartamento en La Carolina",
    opcion_negocio: "Venta",
    fecha_cita_texto: "miércoles, 11 de noviembre de 2026",
    hora_cita: "3:00 PM",
    estado: "reagendada",
    fecha_cita_anterior: "lunes, 9 de noviembre de 2026",
    hora_cita_anterior: "11:00 AM",
    motivo_reagendamiento: "Postergación por disponibilidad de los propietarios del inmueble",
    nota_aclaratoria: "Aclaración sobre reprogramación de cita: La visita fue reprogramada para este miércoles a las 3:00 p.m. por disponibilidad de los propietarios del inmueble. El correo previo emitido por el sistema reflejaba la fecha anterior.",
    cantidad_personas: 1,
    interesado_nombre: "Adriana Alvarez Barriga",
    interesado_documento: "21069381",
  };

  const address = "KRA 14 A # 127 - 65, Edificio Inmoval VI, La Carolina, Bogotá";

  const result = await sendAppointmentAddressNotification(payload, address);
  console.log("✅ Resultado de despacho:", result);
}

main().catch(console.error);

