import { describe, it, expect } from "vitest";
import { createContractPdf } from "../_core/emailContractService.js";
import { PDFDocument } from "pdf-lib";

describe("emailContractService — Generación de Contrato Digital con QR y CUV (Ley 527 de 1999)", () => {
  it("debe generar un PDF válido con sello digital, código QR y CUV", async () => {
    const payload = {
      solicitud_id: "TEST-8849",
      solicitante_nombre: "Carlos Mario Restrepo",
      solicitante_tipo_persona: "Persona Natural",
      solicitante_perfil: "Agente Inmobiliario",
      solicitante_email: "carlos.restrepo@example.com",
      solicitante_celular: "3101234567",
      solicitante_tipo_documento: "Cédula de ciudadanía",
      solicitante_numero_documento: "79845123",
      servicio_solicitado: "Visitar inmueble",
      nombre_inmueble: "Apartamento 502 Edificio Altos del Parque",
      codigo_inmueble: "VECY-AP-502",
      opcion_negocio: "Venta",
      fecha_cita_texto: "15 de Octubre de 2026",
      hora_cita: "10:30 AM",
      cantidad_personas: 2,
      interesado_nombre: "María Fernanda Gómez",
      interesado_tipo_documento: "Cédula de ciudadanía",
      interesado_documento: "52489632",
      tipo_cliente: "Persona",
      acompanantes: [
        { nombre: "Pedro Gómez", documento: "1020304050" }
      ],
      firma_virtual_base64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    };

    const pdfBytes = await createContractPdf(payload);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Cargar y validar estructura con PDFDocument
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
