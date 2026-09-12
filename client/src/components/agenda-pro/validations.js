// Helper para detectar números "basura" o secuencias (ej: 111111, 123456)
export const isFraudulentNumber = (str) => {
  if (!str) return false;
  const cleanStr = String(str).replace(/\D/g, ''); // Solo dígitos
  if (cleanStr.length < 5) return false;
  // 1. Todos los dígitos iguales (111111, 555555)
  if (/^(\d)\1+$/.test(cleanStr)) return true;
  // 2. Secuencias ascendentes o descendentes de 6 o más dígitos (123456, 987654)
  const ascending = '01234567890123456789';
  const descending = '98765432109876543210';
  if (cleanStr.length >= 6 && (ascending.includes(cleanStr) || descending.includes(cleanStr))) return true;
  return false;
};

// Algoritmo oficial DIAN (Módulo 11 con pesos primos) para cálculo del Dígito de Verificación (DV)
export const calculateDianDV = (nit) => {
  const cleanNit = String(nit).replace(/\D/g, '');
  if (!cleanNit || cleanNit.length < 5) return null;
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  let sum = 0;
  for (let i = 0; i < cleanNit.length; i++) {
    const digit = parseInt(cleanNit.charAt(cleanNit.length - 1 - i), 10);
    sum += digit * weights[i];
  }
  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? remainder : 11 - remainder;
};

// Validador estricto de NIT para empresas según fórmula matemática DIAN
export const validateNit = (str, sujeto = '') => {
  if (!str) return null;
  const trimmed = String(str).trim();
  const cleanDigits = trimmed.replace(/\D/g, '');

  if (isFraudulentNumber(cleanDigits)) {
    return `El NIT ${sujeto} no parece válido (patrón secuencial o repetitivo).`;
  }

  // Caso 1: Ingresado con guion explícito (ej: 900.123.456-7 o 900123456-7)
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    const baseNit = parts[0].replace(/\D/g, '');
    const providedDv = parts[1].replace(/\D/g, '');

    if (baseNit.length < 8 || baseNit.length > 10) {
      return `El NIT ${sujeto} debe tener entre 8 y 10 dígitos base antes del guion.`;
    }
    if (providedDv.length !== 1) {
      return `El dígito de verificación del NIT ${sujeto} debe ser de un solo dígito después del guion.`;
    }
    const expectedDv = calculateDianDV(baseNit);
    if (parseInt(providedDv, 10) !== expectedDv) {
      return `El dígito de verificación (-${providedDv}) no corresponde al NIT según el algoritmo oficial de la DIAN (debería ser -${expectedDv}).`;
    }
    return null;
  }

  // Caso 2: Ingresado sin guion
  if (cleanDigits.length < 8 || cleanDigits.length > 10) {
    return `El NIT ${sujeto} debe tener entre 8 y 10 dígitos (ej: 900.123.456-8).`;
  }
  // Si tiene 10 dígitos sin guion, verificamos si el último es el DV que corresponde a los primeros 9
  if (cleanDigits.length === 10) {
    const baseNit = cleanDigits.slice(0, 9);
    const lastDigit = parseInt(cleanDigits.slice(9), 10);
    const expectedDv = calculateDianDV(baseNit);
    if (lastDigit === expectedDv) {
      return null;
    }
  }

  return `Por favor ingresa el NIT ${sujeto} con su dígito de verificación al final (ej: 900.123.456-8).`;
};

// Validador de documentos de personas naturales y extranjeros
export const validateDocumento = (tipo, numero, sujeto = '') => {
  if (!numero || typeof numero !== 'string' || numero.trim() === '') return null;
  const trimmed = numero.trim();
  const clean = trimmed.replace(/\D/g, '');

  // 1. Cédula de Ciudadanía
  if (tipo === 'Cédula de ciudadanía') {
    if (isFraudulentNumber(clean)) {
      return `El número de Cédula de Ciudadanía ${sujeto} no parece válido (patrón secuencial o repetitivo).`;
    }
    if (clean.length < 5 || clean.length > 10) {
      return `La Cédula de Ciudadanía ${sujeto} debe tener entre 5 y 10 dígitos.`;
    }
    if (clean.length === 9) {
      return `En Colombia no existen Cédulas de Ciudadanía de 9 dígitos. Verifica el número ${sujeto}.`;
    }
    if (clean.length === 10) {
      if (!clean.startsWith('1')) {
        return `Las Cédulas de Ciudadanía de 10 dígitos en Colombia deben iniciar por 1.`;
      }
      const num = parseInt(clean, 10);
      if (num > 1250000000) {
        return `El número de Cédula de Ciudadanía ${sujeto} excede el rango real expedido en Colombia.`;
      }
    }
    return null;
  }

  // 2. Cédula de Extranjería (En Colombia tiene estrictamente entre 5 y 7 dígitos)
  if (tipo === 'Cédula de extranjería') {
    if (isFraudulentNumber(clean)) {
      return `El número de Cédula de Extranjería ${sujeto} no parece válido.`;
    }
    if (clean.length < 5 || clean.length > 7) {
      return `La Cédula de Extranjería en Colombia tiene entre 5 y 7 dígitos numéricos. Si tienes más números, verifica o selecciona Pasaporte.`;
    }
    return null;
  }

  // 3. Pasaporte (Alfanumérico)
  if (tipo === 'Pasaporte') {
    const cleanAlphanum = trimmed.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanAlphanum.length < 5 || cleanAlphanum.length > 16) {
      return `El número de Pasaporte ${sujeto} debe tener entre 5 y 16 caracteres.`;
    }
    if (/^(\w)\1+$/.test(cleanAlphanum)) {
      return `El número de Pasaporte ${sujeto} no parece válido.`;
    }
    return null;
  }

  return null;
};

export const validateForm = (data) => {
  const errors = {};

  const requiredFields = {
    solicitante_nombre: 'Nombre Completo o Razón Social', 
    solicitante_tipo_persona: 'Tipo de Persona',
    solicitante_perfil: 'Perfil', 
    solicitante_email: 'Correo Electrónico',
    solicitante_celular: 'Celular', 
    solicitante_tipo_documento: 'Tipo de Documento',
    solicitante_numero_documento: 'Número de Documento', 
    servicio_solicitado: 'Servicio solicitado',
    codigo_inmueble: 'Código de Identificación', 
    nombre_inmueble: 'Nombre del Inmueble o Servicio',
  };

  if (data.solicitante_tipo_persona === 'Persona Jurídica') {
    requiredFields.solicitante_representante_legal = 'Nombre del Representante Legal';
  }

  if (data.servicio_solicitado === 'Visitar inmueble') {
    requiredFields.fecha_cita_bogota = 'Fecha y Hora de la Visita';
    requiredFields.cantidad_personas = 'Cantidad de Personas';
  }

  if (data.servicio_solicitado === 'Visitar inmueble' || data.servicio_solicitado === 'Avalúo comercial') {
    requiredFields.opcion_negocio = 'Opción de Negocio';
  }

  const isAgent = ['Agente', 'Agencia / Inmobiliaria', 'Bróker / Empresa', 'Constructora'].includes(data.solicitante_perfil);
  if (isAgent) {
    requiredFields.tipo_cliente = 'Tipo de cliente';
    requiredFields.interesado_nombre = 'Nombre del cliente';
    requiredFields.interesado_tipo_documento = 'Tipo de documento del cliente';
    requiredFields.interesado_documento = 'Número de documento del cliente';
    requiredFields.metodoFirma = 'Método de Firma';
    if (data.metodoFirma === 'virtual') requiredFields.firma_virtual_base64 = 'Firma de Autorización';
    else if (data.metodoFirma === 'digital') requiredFields.firma_digital_archivo = 'Archivo de Firma Digital';
  }
  
  requiredFields.autorizacion = 'Autorización Final';

  for (const field in requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = `El campo "${requiredFields[field]}" es obligatorio.`;
    }
  }

  // Validación de celular: mínimo 10 dígitos y no fraudulento
  const celularLimpio = data.solicitante_celular ? data.solicitante_celular.replace(/\D/g, '') : '';
  if (data.solicitante_email && !/^\S+@\S+\.\S+$/.test(data.solicitante_email)) { 
    errors.solicitante_email = 'Por favor, ingresa un formato de correo electrónico válido.'; 
  }

  if (celularLimpio) {
    if (celularLimpio.length < 12) { // 57 + 10 dígitos = 12
      errors.solicitante_celular = 'El número de celular debe tener 10 dígitos.';
    } else if (isFraudulentNumber(celularLimpio.substring(2))) {
      errors.solicitante_celular = 'Por favor, ingresa un número de celular válido y real.';
    } else if (!/^573[\d]{9}$/.test(celularLimpio)) {
      errors.solicitante_celular = 'El número de celular debe ser una línea válida en Colombia (comenzar por 3).';
    }
  }

  // Validación matemática y estructural de documentos:
  // 1. Documento del solicitante
  if (data.solicitante_tipo_persona === 'Persona Jurídica' && (data.solicitante_tipo_documento === 'NIT' || data.solicitante_tipo_documento === 'RUT')) {
    const errNitSol = validateNit(data.solicitante_numero_documento, 'de la empresa');
    if (errNitSol) errors.solicitante_numero_documento = errNitSol;
  } else if (data.solicitante_numero_documento) {
    const errDocSol = validateDocumento(data.solicitante_tipo_documento, data.solicitante_numero_documento, 'del solicitante');
    if (errDocSol) errors.solicitante_numero_documento = errDocSol;
  }

  // 2. Documento del cliente / interesado (si aplica vista de agente)
  if (isAgent) {
    if (data.tipo_cliente === 'Empresa' && (data.interesado_tipo_documento === 'NIT' || data.interesado_tipo_documento === 'RUT')) {
      const errNitCli = validateNit(data.interesado_documento, 'del cliente');
      if (errNitCli) errors.interesado_documento = errNitCli;
    } else if (data.interesado_documento) {
      const errDocCli = validateDocumento(data.interesado_tipo_documento, data.interesado_documento, 'del cliente');
      if (errDocCli) errors.interesado_documento = errDocCli;
    }
  }

  if (!data.autorizacion) { errors.autorizacion = 'Debes aceptar la cláusula de confidencialidad para continuar.'; }
  if (data.servicio_solicitado === 'Visitar inmueble' && !data.cantidad_personas) { errors.cantidad_personas = 'Selecciona una cantidad válida de personas entre 1 y 6.'; }

  // Validar campos de acompañantes
  if (Array.isArray(data.acompanantes)) {
    data.acompanantes.forEach((acomp, i) => {
      if (!acomp.nombre || acomp.nombre.trim() === '') {
        errors[`acomp_${i}_nombre`] = `El nombre del acompañante ${i + 1} es obligatorio.`;
      }
      if (!acomp.documento || acomp.documento.trim() === '') {
        errors[`acomp_${i}_documento`] = `El documento del acompañante ${i + 1} es obligatorio.`;
      } else {
        const cleanAcompDoc = acomp.documento.replace(/\D/g, '');
        if (isFraudulentNumber(cleanAcompDoc)) {
          errors[`acomp_${i}_documento`] = `El documento del acompañante ${i + 1} no parece válido.`;
        } else if (cleanAcompDoc.length < 5 || cleanAcompDoc.length > 10) {
          errors[`acomp_${i}_documento`] = `El documento del acompañante ${i + 1} debe tener entre 5 y 10 dígitos.`;
        } else if (cleanAcompDoc.length === 9) {
          errors[`acomp_${i}_documento`] = `En Colombia no existen Cédulas de 9 dígitos (acompañante ${i + 1}).`;
        }
      }
      if (!acomp.parentesco || acomp.parentesco.trim() === '') {
        errors[`acomp_${i}_parentesco`] = `El parentesco del acompañante ${i + 1} es obligatorio.`;
      }
      if (acomp.parentesco === 'Otro' && (!acomp.parentescoOtro || acomp.parentescoOtro.trim() === '')) {
        errors[`acomp_${i}_parentescoOtro`] = `Por favor especifique el parentesco del acompañante ${i + 1}.`;
      }
    });
  }

  return errors;
};
